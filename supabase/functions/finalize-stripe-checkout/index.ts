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

type RequestBody = {
  sessionId: string;
};

type StripeMetadata = {
  customer_id?: string;
  subscription_id?: string;
  checkout_session_id?: string;
  price_id?: string;
  product_id?: string;
  latest_invoice_id?: string;
  payment_intent_id?: string;
  invoice_id?: string;
};

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    const stripeSecret = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      throw new Error("STRIPE_SECRET_KEY não configurada.");
    }

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

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = (await req.json()) as RequestBody;
    if (!payload?.sessionId) {
      throw new Error("sessionId é obrigatório.");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    const createClient = await loadCreateClient();
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(payload.sessionId, {
      expand: ["subscription", "customer", "line_items.data.price.product"],
    });

    if (session.payment_status !== "paid" || session.status !== "complete") {
      throw new Error("Pagamento não concluído.");
    }

    const subscriptionObj = session.subscription;
    if (!subscriptionObj) {
      throw new Error("Assinatura não encontrada na sessão Stripe.");
    }

    const stripeSubscription =
      typeof subscriptionObj === "string"
        ? await stripe.subscriptions.retrieve(subscriptionObj)
        : subscriptionObj;

    const sessionMetadata = session.metadata ?? {};
    const subscriptionMetadata = stripeSubscription.metadata ?? {};

    const organizationId =
      (sessionMetadata.organization_id as string | undefined) ??
      (subscriptionMetadata.organization_id as string | undefined);
    if (!organizationId) {
      throw new Error("Organização não identificada na sessão.");
    }

    const subscriptionId =
      (sessionMetadata.subscription_id as string | undefined) ??
      (subscriptionMetadata.subscription_id as string | undefined);
    if (!subscriptionId) {
      throw new Error("Assinatura não identificada na sessão.");
    }

    const { data: subscriptionRow, error: fetchError } = await adminClient
      .from("organization_subscriptions")
      .select("id, plan_id, metadata")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!subscriptionRow) {
      throw new Error("Registro de assinatura não encontrado no Supabase.");
    }

    let planId =
      (sessionMetadata.plan_id as string | undefined) ??
      (subscriptionMetadata.plan_id as string | undefined) ??
      subscriptionRow.plan_id ??
      null;

    if (!planId) {
      const planSlug =
        (sessionMetadata.plan_slug as string | undefined) ??
        (subscriptionMetadata.plan_slug as string | undefined);
      if (planSlug) {
        const { data: planRecord } = await adminClient
          .from("subscription_plans")
          .select("id")
          .eq("slug", planSlug)
          .maybeSingle();
        planId = planRecord?.id ?? null;
      }
    }

    const existingMetadata =
      (subscriptionRow.metadata as Record<string, unknown> | null) ?? {};
    const existingStripeMetadata =
      (existingMetadata.stripe as StripeMetadata | undefined) ?? {};
    const pendingPlanMeta =
      (existingMetadata.pending_plan as Record<string, unknown> | undefined) ?? undefined;

    const price = stripeSubscription.items.data[0]?.price ?? null;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null | undefined)?.id ??
          existingStripeMetadata.payment_intent_id;
    const invoiceId =
      typeof stripeSubscription.latest_invoice === "string"
        ? stripeSubscription.latest_invoice
        : stripeSubscription.latest_invoice?.id ??
          (typeof session.invoice === "string"
            ? session.invoice
            : (session.invoice as Stripe.Invoice | null | undefined)?.id ??
              existingStripeMetadata.invoice_id);

    const mergedStripeMetadata: StripeMetadata = {
      ...existingStripeMetadata,
      customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? existingStripeMetadata.customer_id,
      subscription_id: stripeSubscription.id,
      checkout_session_id: session.id,
      price_id: price?.id ?? existingStripeMetadata.price_id,
      product_id:
        (typeof price?.product === "string" ? price.product : price?.product?.id) ??
        existingStripeMetadata.product_id,
      latest_invoice_id: invoiceId ?? existingStripeMetadata.latest_invoice_id,
      payment_intent_id: paymentIntentId ?? existingStripeMetadata.payment_intent_id,
      invoice_id: invoiceId ?? existingStripeMetadata.invoice_id,
    };

    const mergedMetadata = {
      ...existingMetadata,
      stripe: mergedStripeMetadata,
      billing: {
        email: session.customer_email ?? null,
        name: session.customer_details?.name ?? null,
      },
    };

    const cleanedMetadata = { ...mergedMetadata };
    if ("pending_plan" in cleanedMetadata) {
      delete (cleanedMetadata as Record<string, unknown>).pending_plan;
    }

    if ("pending_plan" in mergedMetadata) {
      const { pending_plan, ...rest } = mergedMetadata as Record<string, unknown>;
      Object.assign(mergedMetadata, rest);
      delete (mergedMetadata as any).pending_plan;
    }

    const currentPeriodStart = stripeSubscription.current_period_start
      ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
      : new Date().toISOString();
    const currentPeriodEnd = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : null;
    const nextBillingDate = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : null;

    const unitAmount = price?.unit_amount ?? null;
    const paymentAmount = unitAmount !== null ? unitAmount / 100 : null;

    const updatePayload: Record<string, unknown> = {
      status: "active",
      metadata: cleanedMetadata,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      next_billing_date: nextBillingDate,
      last_payment_date: new Date().toISOString(),
      last_payment_amount: paymentAmount,
      updated_at: new Date().toISOString(),
      stripe_customer_id: mergedStripeMetadata.customer_id ?? null,
      stripe_subscription_id: mergedStripeMetadata.subscription_id ?? null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: mergedStripeMetadata.payment_intent_id ?? null,
      stripe_invoice_id: mergedStripeMetadata.invoice_id ?? null,
    };

    if (planId) {
      updatePayload.plan_id = planId;
    }

    const { error: updateError } = await adminClient
      .from("organization_subscriptions")
      .update(updatePayload)
      .eq("id", subscriptionId)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    const previousStripeSubscriptionId =
      typeof pendingPlanMeta?.previous_stripe_subscription_id === "string"
        ? (pendingPlanMeta.previous_stripe_subscription_id as string)
        : existingStripeMetadata.subscription_id &&
            existingStripeMetadata.subscription_id !== stripeSubscription.id
          ? existingStripeMetadata.subscription_id
          : null;

    if (previousStripeSubscriptionId && previousStripeSubscriptionId !== stripeSubscription.id) {
      try {
        await stripe.subscriptions.update(previousStripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (cancelErr) {
        console.warn(
          "Não foi possível agendar cancelamento da assinatura anterior na Stripe:",
          cancelErr,
        );
      }
    }

    await adminClient.from("subscription_event_logs").insert({
      organization_id: organizationId,
      subscription_id: subscriptionId,
      event_type: "plan_change_confirmed",
      actor_user_id: userData.user.id,
      context: {
        plan_id: planId,
        plan_slug: sessionMetadata.plan_slug ?? subscriptionMetadata.plan_slug ?? null,
        stripe_subscription_id: mergedStripeMetadata.subscription_id ?? null,
        stripe_invoice_id: mergedStripeMetadata.invoice_id ?? null,
        amount_paid: paymentAmount,
        previous_plan_id: subscriptionRow.plan_id ?? null,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erro ao finalizar checkout Stripe:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
