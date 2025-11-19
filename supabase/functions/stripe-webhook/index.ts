import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.23.0";

async function loadCreateClient() {
  const mod = await import("jsr:@supabase/supabase-js@2");
  return mod.createClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-application-name",
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

const PRICE_TO_PLAN_SLUG: Record<string, string> = {
  // Fallback mapping in case subscription_plans.stripe_price_id is not populated
  "price_1SO7VUJa5tHS2rd0mccenEt7": "basico",
  "price_1SO7VcJa5tHS2rd0GNuq7QCO": "intermediario",
  "price_1SO7VmJa5tHS2rd06pyBODW3": "pro",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function findSubscriptionByStripeId(
  supabase: any,
  stripeSubscriptionId: string,
) {
  const { data, error } = await supabase
    .from("organization_subscriptions")
    .select("id, organization_id, metadata, status, cancel_at_period_end, plan_id, stripe_subscription_id, current_period_start, current_period_end, next_billing_date, last_payment_amount, last_payment_date")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (data) {
    return data;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("organization_subscriptions")
    .select("id, organization_id, metadata, status, cancel_at_period_end, plan_id, stripe_subscription_id, current_period_start, current_period_end, next_billing_date, last_payment_amount, last_payment_date")
    .contains("metadata", { stripe: { subscription_id: stripeSubscriptionId } } as any)
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallback ?? null;
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  // Some providers may probe with HEAD/GET; respond 200 to avoid delivery retries
  if (req.method === "HEAD" || req.method === "GET") {
    return new Response("ok", { status: 200, headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET =
    (globalThis as any).Deno?.env.get("STRIPE_WEBHOOK_SECRET") ||
    (globalThis as any).Deno?.env.get("STRIPE_SIGNING_SECRET");
  const SUPABASE_URL =
    (globalThis as any).Deno?.env.get("PROJECT_URL") ??
    (globalThis as any).Deno?.env.get("SUPABASE_URL") ??
    "";
  const SERVICE_ROLE_KEY =
    (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
    "";

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe secrets not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase configuration missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", typescript: true });
  const signature = req.headers.get("Stripe-Signature");
  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    // Edge runtimes require the async verifier that uses SubtleCrypto
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature ?? "",
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Invalid webhook signature:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const createClient = await loadCreateClient();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Fetch full session with expansions to access price/product/subscription
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["subscription", "customer", "line_items.data.price.product"],
      });

      const customerEmail = fullSession.customer_email ?? fullSession.customer_details?.email ?? null;
      const customerName = fullSession.customer_details?.name ?? null;
      const subscriptionObj = fullSession.subscription ?? null;
      const stripeSubscription = subscriptionObj
        ? (typeof subscriptionObj === "string"
            ? await stripe.subscriptions.retrieve(subscriptionObj)
            : (subscriptionObj as Stripe.Subscription))
        : null;

      const firstItem = fullSession.line_items?.data?.[0] ?? null;
      const price = firstItem?.price ?? null;
      const priceId = price?.id ?? null;
      const productId = (typeof price?.product === "string" ? price.product : price?.product?.id) ?? null;

      if (!customerEmail) {
        throw new Error("Missing customer email in session");
      }

      const sessionMetadata = fullSession.metadata ?? {};
      const subscriptionMetadata = stripeSubscription?.metadata ?? {};

      const organizationIdFromMetadata =
        (sessionMetadata.organization_id as string | undefined) ??
        (subscriptionMetadata.organization_id as string | undefined) ??
        null;
      const subscriptionIdFromMetadata =
        (sessionMetadata.subscription_id as string | undefined) ??
        (subscriptionMetadata.subscription_id as string | undefined) ??
        null;

      let subscriptionRow: any = null;
      if (subscriptionIdFromMetadata) {
        const { data } = await supabase
          .from("organization_subscriptions")
          .select("*")
          .eq("id", subscriptionIdFromMetadata)
          .maybeSingle();
        subscriptionRow = data ?? null;
      }

      if (!subscriptionRow) {
        const { data } = await supabase
          .from("organization_subscriptions")
          .select("*")
          .eq("stripe_checkout_session_id", fullSession.id)
          .maybeSingle();
        subscriptionRow = data ?? null;
      }

      if (subscriptionRow) {
        const existingMetadata = (subscriptionRow.metadata as Record<string, unknown> | null) ?? {};
        const existingStripeMeta =
          (existingMetadata.stripe as StripeMetadata | undefined) ?? {};

        const mergedStripeMetadata: StripeMetadata = {
          ...existingStripeMeta,
          customer_id:
            typeof fullSession.customer === "string"
              ? fullSession.customer
              : fullSession.customer?.id ?? existingStripeMeta.customer_id,
          subscription_id: stripeSubscription?.id ?? existingStripeMeta.subscription_id,
          checkout_session_id: fullSession.id,
          price_id: priceId ?? existingStripeMeta.price_id,
          product_id: productId ?? existingStripeMeta.product_id,
          latest_invoice_id:
            (typeof stripeSubscription?.latest_invoice === "string"
              ? stripeSubscription?.latest_invoice
              : stripeSubscription?.latest_invoice?.id) ??
            (typeof fullSession.invoice === "string"
              ? fullSession.invoice
              : (fullSession.invoice as Stripe.Invoice | null | undefined)?.id ??
                existingStripeMeta.latest_invoice_id),
          payment_intent_id:
            (typeof fullSession.payment_intent === "string"
              ? fullSession.payment_intent
              : (fullSession.payment_intent as Stripe.PaymentIntent | null | undefined)?.id) ??
            existingStripeMeta.payment_intent_id,
          invoice_id:
            (typeof stripeSubscription?.latest_invoice === "string"
              ? stripeSubscription?.latest_invoice
              : stripeSubscription?.latest_invoice?.id) ??
            (typeof fullSession.invoice === "string"
              ? fullSession.invoice
              : (fullSession.invoice as Stripe.Invoice | null | undefined)?.id ??
                existingStripeMeta.invoice_id),
        };

        const cleanedMetadata: Record<string, unknown> = {
          ...existingMetadata,
          stripe: mergedStripeMetadata,
          billing: {
            email: customerEmail,
            name: customerName ?? null,
          },
        };

        if ("pending_plan" in cleanedMetadata) {
          delete cleanedMetadata.pending_plan;
        }

        const currentPeriodStart = stripeSubscription?.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
          : subscriptionRow.current_period_start ?? new Date().toISOString();
        const currentPeriodEnd = stripeSubscription?.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : subscriptionRow.current_period_end ?? null;
        const nextBillingDate = stripeSubscription?.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : subscriptionRow.next_billing_date ?? null;

        const unitAmount = price?.unit_amount ?? null;
        const amountPaid = unitAmount !== null ? unitAmount / 100 : null;

        const updatePayload: Record<string, unknown> = {
          status: "active",
          metadata: cleanedMetadata,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          next_billing_date: nextBillingDate,
          last_payment_date: new Date().toISOString(),
          last_payment_amount: amountPaid,
          updated_at: new Date().toISOString(),
          stripe_customer_id: mergedStripeMetadata.customer_id ?? null,
          stripe_subscription_id: mergedStripeMetadata.subscription_id ?? null,
          stripe_checkout_session_id: fullSession.id,
          stripe_payment_intent_id: mergedStripeMetadata.payment_intent_id ?? null,
          stripe_invoice_id: mergedStripeMetadata.invoice_id ?? null,
        };

        let resolvedPlanId: string | null =
          (subscriptionMetadata.plan_id as string | undefined) ??
          (sessionMetadata.plan_id as string | undefined) ??
          (subscriptionRow.plan_id as string | undefined) ??
          null;

        let resolvedPlanSlug: string | null =
          (sessionMetadata.plan_slug as string | undefined) ??
          (subscriptionMetadata.plan_slug as string | undefined) ??
          null;

        if (!resolvedPlanId && priceId) {
          const { data: planMatch } = await supabase
            .from("subscription_plans")
            .select("id, slug")
            .eq("stripe_price_id", priceId)
            .maybeSingle();
          if (planMatch) {
            resolvedPlanId = (planMatch as any).id ?? null;
            resolvedPlanSlug = resolvedPlanSlug ?? ((planMatch as any).slug ?? null);
          }
        }

        if (resolvedPlanId && !resolvedPlanSlug) {
          const { data: planRecord } = await supabase
            .from("subscription_plans")
            .select("slug")
            .eq("id", resolvedPlanId)
            .maybeSingle();
          resolvedPlanSlug = (planRecord as any)?.slug ?? null;
        }

        if (resolvedPlanId) {
          updatePayload.plan_id = resolvedPlanId;
        }

        const { error: updateError } = await supabase
          .from("organization_subscriptions")
          .update(updatePayload)
          .eq("id", subscriptionRow.id);

        if (updateError) {
          throw updateError;
        }

        const ownerUserId =
          typeof (existingMetadata as any)?.owner_user_id === "string"
            ? ((existingMetadata as any).owner_user_id as string)
            : null;

        await supabase.from("subscription_event_logs").insert({
          organization_id: subscriptionRow.organization_id,
          subscription_id: subscriptionRow.id,
          event_type: "plan_change_confirmed",
          actor_user_id: ownerUserId,
          context: {
            plan_id: updatePayload.plan_id ?? subscriptionRow.plan_id ?? null,
            plan_slug: resolvedPlanSlug ?? null,
            stripe_subscription_id: mergedStripeMetadata.subscription_id ?? null,
            stripe_invoice_id: mergedStripeMetadata.invoice_id ?? null,
            amount_paid: amountPaid,
            source: "stripe-webhook",
          },
        });

        // Emitir Magic Link pós-compra (idempotente por sessão)
        try {
          const { data: existingMagic } = await supabase
            .from("magic_links")
            .select("id")
            .eq("checkout_session_id", fullSession.id)
            .eq("status", "active")
            .maybeSingle();

          if (!existingMagic && customerEmail) {
            const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
            const enc = new TextEncoder();
            const digest = await crypto.subtle.digest("SHA-256", enc.encode(rawToken));
            const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

            const ttlMinutes = Number(((globalThis as any).Deno?.env.get("MAGIC_LINK_TTL_MINUTES") ?? "30"));
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

            const { data: inserted } = await supabase
              .from("magic_links")
              .insert({
                email: customerEmail,
                user_id: ownerUserId ?? null,
                checkout_session_id: fullSession.id,
                token_hash: hex,
                expires_at: expiresAt,
                status: "active",
              })
              .select("id")
              .single();

            const APP_URL = (globalThis as any).Deno?.env.get("APP_URL") ?? (globalThis as any).Deno?.env.get("VITE_APP_URL") ?? undefined;
            const validateUrl = APP_URL
              ? `${String(APP_URL).replace(/\/$/, "")}/magic/validate?t=${encodeURIComponent(rawToken)}`
              : undefined;

            const RESEND_API_KEY = (globalThis as any).Deno?.env.get("RESEND_API_KEY") ?? "";
            const FROM_EMAIL = (globalThis as any).Deno?.env.get("MAGIC_LINK_FROM_EMAIL") ?? "InsightFy <acesso@insightfy.app>";

            if (RESEND_API_KEY && validateUrl) {
              const html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
                  <h2 style="color: #111827;">Compra confirmada — seu acesso está pronto</h2>
                  <p>Use o botão abaixo para entrar com seu Magic Link. Este link é válido por ${ttlMinutes} minutos e pode ser usado apenas uma vez.</p>
                  <p style="margin: 24px 0;">
                    <a href="${validateUrl}" target="_blank" rel="noopener noreferrer"
                      style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                      Entrar com Magic Link
                    </a>
                  </p>
                  <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
                  <p style="word-break: break-all; color: #2563eb;">${validateUrl}</p>
                  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
                  <p style="font-size: 12px; color: #6b7280;">Se você não esperava este e-mail, ignore-o. Em caso de expiração, solicite um novo link pelo app.</p>
                </div>
              `;
              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ from: FROM_EMAIL, to: customerEmail, subject: "Seu Magic Link de acesso", html }),
                });
              } catch (mailErr) {
                console.warn("Falha ao enviar e-mail de magic link:", mailErr);
              }
            }
          }
        } catch (emitErr) {
          console.warn("Erro ao emitir Magic Link pós-compra:", emitErr);
        }

        return new Response(JSON.stringify({ received: true, updated: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: criação completa (checkout externo)

      // Resolve plano
      let planId: string | null = null;
      let planSlug: string | null = null;
      if (priceId) {
        const { data: planByPrice } = await supabase
          .from("subscription_plans")
          .select("id, slug")
          .eq("stripe_price_id", priceId)
          .maybeSingle();
        if (planByPrice) {
          planId = (planByPrice as any).id;
          planSlug = (planByPrice as any).slug;
        } else if (PRICE_TO_PLAN_SLUG[priceId]) {
          planSlug = PRICE_TO_PLAN_SLUG[priceId];
          const { data: planBySlug } = await supabase
            .from("subscription_plans")
            .select("id, slug")
            .eq("slug", planSlug)
            .maybeSingle();
          planId = (planBySlug as any)?.id ?? null;
        }
      }

      if (!planId) {
        throw new Error(`Unable to resolve subscription plan for price ${priceId ?? "unknown"}`);
      }

      if (!planSlug) {
        const { data: planRecord } = await supabase
          .from("subscription_plans")
          .select("slug")
          .eq("id", planId)
          .maybeSingle();
        planSlug = (planRecord as any)?.slug ?? null;
      }

      // Ensure user exists (create if needed)
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
        // ignore create conflict
      }

      if (!userId) {
        // Try to locate existing user by email
        const adminAny: any = (supabase as any).auth?.admin;
        if (adminAny?.getUserByEmail) {
          try {
            const { data } = await adminAny.getUserByEmail(customerEmail);
            userId = data?.user?.id ?? null;
          } catch (err) {
            console.debug("stripe-webhook getUserByEmail fallback failed", err);
          }
        }
      }

      if (!userId) {
        // Best-effort fallback: listUsers then filter
        try {
          const listRes: any = await (supabase as any).auth?.admin?.listUsers?.({ page: 1, perPage: 100 });
          const found = listRes?.data?.users?.find((u: any) => u?.email?.toLowerCase() === customerEmail.toLowerCase());
          userId = found?.id ?? null;
        } catch (err) {
          console.debug("stripe-webhook listUsers fallback failed", err);
        }
      }

      if (!userId) {
        throw new Error("Failed to create or fetch Supabase user");
      }

      // Ensure organization
      let organizationId: string | null = organizationIdFromMetadata;
      if (!organizationId) {
        const orgName = (customerName || customerEmail.split("@")[0]) + " - Organização";
        const proposedSlug = slugify(orgName) || `org-${crypto.randomUUID().slice(0, 8)}`;

        const { data: newOrg, error: orgErr } = await supabase
          .from("organizations")
          .insert({
            name: orgName,
            slug: proposedSlug,
            owner_id: userId,
          })
          .select("id")
          .single();
        if (orgErr) throw orgErr;
        organizationId = (newOrg as any).id;
      }

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
        { id: userId, email: customerEmail, full_name: customerName ?? null, user_type: "owner", updated_at: nowIso },
        { onConflict: "id" },
      );

      const currentPeriodStart = stripeSubscription?.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
        : nowIso;
      const currentPeriodEnd = stripeSubscription?.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : null;

      const stripeCustomerId =
        typeof fullSession.customer === "string" ? fullSession.customer : fullSession.customer?.id ?? undefined;
      const latestInvoiceId =
        typeof stripeSubscription?.latest_invoice === "string"
          ? stripeSubscription?.latest_invoice
          : (stripeSubscription?.latest_invoice as any)?.id ??
            (typeof fullSession.invoice === "string"
              ? fullSession.invoice
              : (fullSession.invoice as Stripe.Invoice | null | undefined)?.id ?? undefined);
      const paymentIntentId =
        typeof fullSession.payment_intent === "string"
          ? fullSession.payment_intent
          : (fullSession.payment_intent as Stripe.PaymentIntent | null | undefined)?.id ?? undefined;

      const stripeMeta: StripeMetadata = {
        customer_id: stripeCustomerId,
        subscription_id: stripeSubscription?.id,
        checkout_session_id: fullSession.id,
        price_id: priceId ?? undefined,
        product_id: productId ?? undefined,
        latest_invoice_id: latestInvoiceId,
        payment_intent_id: paymentIntentId,
        invoice_id: latestInvoiceId,
      };

      const claimToken = crypto.randomUUID();
      const claimPayload = {
        token: claimToken,
        email: customerEmail,
        status: "pending",
        created_at: nowIso,
        user_id: userId,
        session_id: fullSession.id,
      };

      const subscriptionMetadataInsert = {
        created_via: "stripe_webhook",
        plan_slug: planSlug,
        stripe: stripeMeta,
        claim: claimPayload,
        owner_user_id: userId,
      };

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
          metadata: subscriptionMetadataInsert,
          stripe_customer_id: stripeMeta.customer_id ?? null,
          stripe_subscription_id: stripeMeta.subscription_id ?? null,
          stripe_checkout_session_id: fullSession.id,
          stripe_payment_intent_id: stripeMeta.payment_intent_id ?? null,
          stripe_invoice_id: stripeMeta.invoice_id ?? null,
          claim_token: claimToken,
          claim_email: customerEmail,
          claim_status: "pending",
          claim_completed_at: null,
        })
        .select("id")
        .single();
      if (subErr) throw subErr;
      const createdSubscriptionId = (subRow as any)?.id ?? null;

      if (createdSubscriptionId) {
        const claimMetadata = {
          ...subscriptionMetadataInsert,
          claim: { ...claimPayload, subscription_id: createdSubscriptionId },
        };
        const { error: updateMetaErr } = await supabase
          .from("organization_subscriptions")
          .update({
            metadata: claimMetadata,
          })
          .eq("id", createdSubscriptionId);
        if (updateMetaErr) {
          console.warn("Failed to persist claim metadata with subscription id:", updateMetaErr);
        }
      }

      if (isNewUser) {
        try {
          const APP_URL =
            (globalThis as any).Deno?.env.get("APP_URL") ||
            (globalThis as any).Deno?.env.get("VITE_APP_URL") ||
            undefined;
          const redirectTo = APP_URL
            ? `${APP_URL.replace(/\/$/, "")}/finalizar-cadastro?claim=${encodeURIComponent(claimToken)}&org=${encodeURIComponent(
                organizationId ?? "",
              )}&sub=${encodeURIComponent(createdSubscriptionId ?? "")}&email=${encodeURIComponent(
                customerEmail,
              )}&session_id=${encodeURIComponent(fullSession.id)}`
            : undefined;
          const adminAny: any = (supabase as any).auth?.admin;
          if (adminAny?.inviteUserByEmail) {
            await adminAny.inviteUserByEmail(customerEmail, { redirectTo });
          }
        } catch (err) {
          console.warn("Failed to send invite email:", err);
        }
      }

      await supabase.from("subscription_event_logs").insert({
        organization_id: organizationId,
        subscription_id: createdSubscriptionId,
        event_type: "plan_change_confirmed",
        actor_user_id: userId,
        context: {
          plan_id: planId,
          plan_slug: planSlug,
          stripe_subscription_id: stripeMeta.subscription_id ?? null,
          stripe_invoice_id: stripeMeta.invoice_id ?? null,
          amount_paid: (price?.unit_amount ?? 0) / 100,
          source: "stripe-webhook",
        },
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

      if (!stripeSubscriptionId) {
        console.warn("Invoice event without subscription id");
      } else {
        const subscriptionRow = await findSubscriptionByStripeId(supabase, stripeSubscriptionId);
        if (!subscriptionRow) {
          console.warn("Subscription not found for invoice event", stripeSubscriptionId);
        } else {
          const amount = typeof invoice.amount_paid === "number" ? invoice.amount_paid / 100 : null;
          const dueAmount = typeof invoice.amount_due === "number" ? invoice.amount_due / 100 : null;
          const nowIso = new Date().toISOString();
          const billingState =
            (subscriptionRow.metadata as Record<string, unknown> | null | undefined)?.billing_state ?? {};

          if (event.type === "invoice.payment_failed") {
            const failureReason =
              invoice.last_payment_error?.message ??
              invoice.last_payment_error?.code ??
              invoice.dunning_campaign_id ??
              "unknown";

            const updatePayload = {
              status: "past_due",
              updated_at: nowIso,
              metadata: {
                ...(subscriptionRow.metadata as Record<string, unknown> | null | undefined),
                billing_state: {
                  ...billingState,
                  last_failure_at: nowIso,
                  last_failure_reason: failureReason,
                  last_failed_invoice_id: invoice.id,
                },
              },
            };

            const { error: updateError } = await supabase
              .from("organization_subscriptions")
              .update(updatePayload)
              .eq("id", subscriptionRow.id);

            if (updateError) {
              console.error("Failed to mark subscription past_due:", updateError);
            }

            await supabase.from("subscription_event_logs").insert({
              organization_id: subscriptionRow.organization_id,
              subscription_id: subscriptionRow.id,
              event_type: "payment_failed",
              context: {
                stripe_subscription_id: stripeSubscriptionId,
                stripe_invoice_id: invoice.id,
                amount_due: dueAmount,
                failure_reason: failureReason,
              },
            });
          } else {
            const currentPeriodStart = invoice.lines?.data?.[0]?.period?.start
              ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
              : subscriptionRow.current_period_start ?? nowIso;
            const currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end
              ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
              : subscriptionRow.current_period_end ?? null;
            const nextBillingDate = invoice.next_payment_attempt
              ? new Date(invoice.next_payment_attempt * 1000).toISOString()
              : currentPeriodEnd;

            const metadataForUpdate: Record<string, unknown> = {
              ...(subscriptionRow.metadata as Record<string, unknown> | null | undefined),
              billing_state: {
                ...billingState,
                last_payment_at: nowIso,
                last_failure_at: null,
                last_failure_reason: null,
              },
            };

            if ("pending_plan" in metadataForUpdate) {
              delete metadataForUpdate.pending_plan;
            }

            const updatePayload = {
              status: "active",
              last_payment_date: nowIso,
              last_payment_amount: amount,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              next_billing_date: nextBillingDate,
              updated_at: nowIso,
              metadata: metadataForUpdate,
            };

            const { error: updateError } = await supabase
              .from("organization_subscriptions")
              .update(updatePayload)
              .eq("id", subscriptionRow.id);

            if (updateError) {
              console.error("Failed to mark subscription active:", updateError);
            }

            await supabase.from("subscription_event_logs").insert({
              organization_id: subscriptionRow.organization_id,
              subscription_id: subscriptionRow.id,
              event_type: "payment_recovered",
              context: {
                stripe_subscription_id: stripeSubscriptionId,
                stripe_invoice_id: invoice.id,
                amount_paid: amount,
              },
            });
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For other events, just acknowledge for now
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
