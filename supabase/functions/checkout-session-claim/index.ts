import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.23.0";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

type CheckoutClaimRequest = {
  sessionId?: string;
};

type CheckoutClaimResponse = {
  success: boolean;
  claimToken: string | null;
  organizationId: string | null;
  subscriptionId: string | null;
  email: string | null;
  status: string | null;
  planId: string | null;
  planSlug: string | null;
};

const PRICE_TO_PLAN_SLUG: Record<string, string> = {
  "price_1SO7VUJa5tHS2rd0mccenEt7": "basico",
  "price_1SO7VcJa5tHS2rd0GNuq7QCO": "intermediario",
  "price_1SO7VmJa5tHS2rd06pyBODW3": "pro",
};

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL =
      (globalThis as any).Deno?.env.get("PROJECT_URL") ??
      (globalThis as any).Deno?.env.get("SUPABASE_URL") ??
      "";
    const SERVICE_ROLE_KEY =
      (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
      "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = (await req.json().catch(() => ({}))) as CheckoutClaimRequest;
    const sessionId = payload.sessionId?.trim();
    if (!sessionId) {
      throw new Error("sessionId é obrigatório.");
    }

    const stripeSecret =
      (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY") ??
      (globalThis as any).Deno?.env.get("STRIPE_API_KEY") ??
      "";
    if (!stripeSecret) {
      throw new Error("Stripe secret não configurada.");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    const selectColumns =
      "id, organization_id, plan_id, claim_token, claim_email, claim_status, metadata";

    let { data: subscription, error } = await supabase
      .from("organization_subscriptions")
      .select(selectColumns)
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (!subscription && !error) {
      const fallback = await supabase
        .from("organization_subscriptions")
        .select(selectColumns)
        .contains("metadata", { stripe: { checkout_session_id: sessionId } } as any)
        .maybeSingle();
      subscription = fallback.data ?? null;
      error = fallback.error ?? null;
    }

    if (error) {
      throw error;
    }

    if (!subscription) {
      subscription = await createSubscriptionFromStripeSession({
        sessionId,
        supabase,
        stripe,
      });
    }

    const metadata = (subscription as any).metadata ?? {};
    const claimMeta = metadata?.claim ?? {};
    const planSlug = metadata?.plan_slug ?? null;

    const response: CheckoutClaimResponse = {
      success: true,
      claimToken: (subscription as any).claim_token ?? claimMeta?.token ?? null,
      organizationId: (subscription as any).organization_id ?? null,
      subscriptionId: (subscription as any).id ?? null,
      email: (subscription as any).claim_email ?? claimMeta?.email ?? null,
      status: (subscription as any).claim_status ?? claimMeta?.status ?? null,
      planId: (subscription as any).plan_id ?? null,
      planSlug,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("checkout-session-claim error:", err);
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      try {
        message = JSON.stringify(err);
      } catch (_) {
        message = String(err);
      }
    }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createSubscriptionFromStripeSession({
  sessionId,
  supabase,
  stripe,
}: {
  sessionId: string;
  supabase: any;
  stripe: Stripe;
}) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer", "line_items.data.price.product"],
  });

  if (!session) {
    throw new Error("Sessão Stripe não encontrada.");
  }
  if (session.payment_status !== "paid" || session.status !== "complete") {
    throw new Error("Pagamento não foi concluído para esta sessão.");
  }

  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const customerName = session.customer_details?.name ?? null;
  if (!customerEmail) {
    throw new Error("Sessão Stripe sem email do cliente.");
  }

  const subscriptionObj = session.subscription ?? null;
  const stripeSubscription = subscriptionObj
    ? (typeof subscriptionObj === "string"
        ? await stripe.subscriptions.retrieve(subscriptionObj)
        : (subscriptionObj as Stripe.Subscription))
    : null;

  if (!stripeSubscription) {
    throw new Error("Assinatura Stripe não encontrada para esta sessão.");
  }

  const firstItem = session.line_items?.data?.[0] ?? null;
  const price = firstItem?.price ?? null;
  const priceId = price?.id ?? null;
  const productId = (typeof price?.product === "string" ? price.product : price?.product?.id) ?? null;

  if (!priceId) {
    throw new Error("Sessão Stripe sem price associado.");
  }

  let planId: string | null = null;
  let planSlug: string | null = null;
  if (priceId) {
    const { data: planByPrice } = await supabase
      .from("subscription_plans")
      .select("id, slug")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    if (planByPrice) {
      planId = planByPrice.id;
      planSlug = planByPrice.slug;
    } else if (PRICE_TO_PLAN_SLUG[priceId]) {
      planSlug = PRICE_TO_PLAN_SLUG[priceId];
      const { data: planBySlug } = await supabase
        .from("subscription_plans")
        .select("id, slug")
        .eq("slug", planSlug)
        .maybeSingle();
      planId = planBySlug?.id ?? null;
    }
  }

  if (!planId) {
    throw new Error(`Não foi possível mapear o preço ${priceId} para um plano.`);
  }
  if (!planSlug) {
    const { data: planRecord } = await supabase
      .from("subscription_plans")
      .select("slug")
      .eq("id", planId)
      .maybeSingle();
    planSlug = planRecord?.slug ?? null;
  }

  // Ensure user exists
  let userId: string | null = null;
  let isNewUser = false;
  try {
    const res = await supabase.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true,
      user_metadata: { full_name: customerName ?? customerEmail.split("@")[0] },
    });
    if (res.data?.user) {
      userId = res.data.user.id;
      isNewUser = true;
    }
  } catch (_) {
    // ignore conflict
  }

  if (!userId) {
    const adminAny: any = supabase.auth?.admin;
    if (adminAny?.getUserByEmail) {
      try {
        const { data } = await adminAny.getUserByEmail(customerEmail);
        userId = data?.user?.id ?? null;
      } catch (err) {
        console.debug("checkout-session-claim getUserByEmail fallback failed", err);
      }
    }
  }

  if (!userId) {
    const adminAny: any = supabase.auth?.admin;
    if (adminAny?.listUsers) {
      try {
        const listRes = await adminAny.listUsers({ page: 1, perPage: 100 });
        const found = listRes?.data?.users?.find(
          (u: any) => typeof u?.email === "string" && u.email.toLowerCase() === customerEmail.toLowerCase(),
        );
        userId = found?.id ?? null;
      } catch (err) {
        console.debug("checkout-session-claim listUsers fallback failed", err);
      }
    }
  }

  if (!userId) {
    throw new Error("Falha ao criar ou localizar usuário no Supabase.");
  }

  // Ensure organization
  let organizationId: string | null = null;
  const orgName = (customerName || customerEmail.split("@")[0]) + " - Organização";
  let proposedSlug = slugify(orgName) || `org-${crypto.randomUUID().slice(0, 8)}`;

  const { data: slugConflict } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", proposedSlug)
    .maybeSingle();
  if (slugConflict?.id) {
    proposedSlug = `${proposedSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const { data: newOrg, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug: proposedSlug,
      owner_id: userId,
    })
    .select("id")
    .single();
  if (orgErr) {
    throw orgErr;
  }
  organizationId = newOrg?.id ?? null;

  const nowIso = new Date().toISOString();
  await supabase
    .from("organization_memberships")
    .upsert(
      {
        organization_id: organizationId,
        profile_id: userId,
        role: "owner",
        is_active: true,
        joined_at: nowIso,
        left_at: null,
      },
      { onConflict: "organization_id,profile_id" },
    );

  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: customerEmail,
      full_name: customerName ?? null,
      user_type: "owner",
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? undefined;
  const latestInvoiceId =
    typeof stripeSubscription?.latest_invoice === "string"
      ? stripeSubscription?.latest_invoice
      : (stripeSubscription?.latest_invoice as any)?.id ??
        (typeof session.invoice === "string"
          ? session.invoice
          : (session.invoice as Stripe.Invoice | null | undefined)?.id ?? undefined);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null | undefined)?.id ?? undefined;

  const stripeMeta = {
    customer_id: stripeCustomerId,
    subscription_id: stripeSubscription?.id ?? null,
    checkout_session_id: sessionId,
    price_id: priceId,
    product_id: productId ?? null,
    latest_invoice_id: latestInvoiceId ?? null,
    payment_intent_id: paymentIntentId ?? null,
    invoice_id: latestInvoiceId ?? null,
  };

  const claimToken = crypto.randomUUID();
  const claimPayload = {
    token: claimToken,
    email: customerEmail,
    status: "pending",
    created_at: nowIso,
    user_id: userId,
    session_id: sessionId,
  };

  const currentPeriodStart = stripeSubscription?.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
    : nowIso;
  const currentPeriodEnd = stripeSubscription?.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
    : null;

  const { data: subRow, error: subErr } = await supabase
    .from("organization_subscriptions")
    .insert({
      organization_id: organizationId,
      plan_id: planId,
      status: "active",
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      next_billing_date: currentPeriodEnd,
      last_payment_date: nowIso,
      last_payment_amount: (price?.unit_amount ?? 0) / 100,
      metadata: {
        created_via: "stripe_checkout_session_claim",
        plan_slug: planSlug,
        stripe: stripeMeta,
        claim: claimPayload,
        owner_user_id: userId,
      },
      stripe_customer_id: stripeMeta.customer_id ?? null,
      stripe_subscription_id: stripeMeta.subscription_id ?? null,
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: stripeMeta.payment_intent_id ?? null,
      stripe_invoice_id: stripeMeta.invoice_id ?? null,
      claim_token: claimToken,
      claim_email: customerEmail,
      claim_status: "pending",
      claim_completed_at: null,
    })
    .select("id, organization_id, plan_id, claim_token, claim_email, claim_status, metadata")
    .single();
  if (subErr) {
    throw subErr;
  }

  const subscriptionId = subRow?.id ?? null;
  if (subscriptionId) {
    const mergedMetadata = {
      ...(subRow.metadata ?? {}),
      claim: { ...claimPayload, subscription_id: subscriptionId },
    };
    await supabase
      .from("organization_subscriptions")
      .update({ metadata: mergedMetadata })
      .eq("id", subscriptionId);
    subRow.metadata = mergedMetadata;
  }

  await supabase.from("subscription_event_logs").insert({
    organization_id: organizationId,
    subscription_id: subscriptionId,
    event_type: "plan_change_confirmed",
    actor_user_id: userId,
    context: {
      plan_id: planId,
      plan_slug: planSlug,
      stripe_subscription_id: stripeMeta.subscription_id ?? null,
      stripe_invoice_id: stripeMeta.invoice_id ?? null,
      amount_paid: (price?.unit_amount ?? 0) / 100,
      source: "checkout-session-claim",
    },
  });

  if (isNewUser) {
    try {
      const APP_URL =
        (globalThis as any).Deno?.env.get("APP_URL") ||
        (globalThis as any).Deno?.env.get("VITE_APP_URL") ||
        undefined;
      const redirectTo = APP_URL
        ? `${APP_URL.replace(/\/$/, "")}/finalizar-cadastro?claim=${encodeURIComponent(claimToken)}&org=${encodeURIComponent(
            organizationId,
          )}&sub=${encodeURIComponent(subscriptionId ?? "")}&email=${encodeURIComponent(
            customerEmail,
          )}&session_id=${encodeURIComponent(sessionId)}`
        : undefined;
      const adminAny: any = supabase.auth?.admin;
      if (adminAny?.inviteUserByEmail) {
        await adminAny.inviteUserByEmail(customerEmail, { redirectTo });
      }
    } catch (err) {
      console.warn("Failed to send invite email during session claim:", err);
    }
  }

  return subRow;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
