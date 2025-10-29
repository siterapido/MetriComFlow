import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore allow jsr imports without deno tooling locally
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature", 
};

const STRIPE_SECRET_KEY = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = (globalThis as any).Deno?.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = (globalThis as any).Deno?.env.get("PROJECT_URL") ?? (globalThis as any).Deno?.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
  (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY");

const stripeApiBase = "https://api.stripe.com/v1";

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader || !STRIPE_WEBHOOK_SECRET) {
    return false;
  }

  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(STRIPE_WEBHOOK_SECRET);
  const payloadData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((candidate) => timingSafeEqual(candidate, signatureHex));
}

async function stripeGet(path: string) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key not configured");
  }

  const response = await fetch(`${stripeApiBase}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });

  const text = await response.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Failed to parse Stripe GET response", path, text, err);
    throw new Error("Resposta inválida da Stripe");
  }

  if (!response.ok) {
    console.error("Stripe GET error", { path, status: response.status, json });
    throw new Error(json?.error?.message || `Stripe request failed: ${path}`);
  }

  return json;
}

function sanitizeMetadata(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object") {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return {};
  }
}

async function handleCheckoutSessionCompleted(supabase: any, session: any) {
  const subscriptionId = session.client_reference_id || session.metadata?.subscription_id;
  if (!subscriptionId) {
    console.warn("Checkout session without subscription reference", session.id);
    return;
  }

  const { data: current, error: fetchError } = await supabase
    .from("organization_subscriptions")
    .select("metadata")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch subscription metadata", fetchError);
  }

  const metadata = sanitizeMetadata(current?.metadata);
  metadata.stripe_checkout_completed_at = new Date().toISOString();
  metadata.stripe_checkout_session_id = session.id;

  const updatePayload: Record<string, any> = {
    status: "active",
    stripe_subscription_id: session.subscription ?? null,
    stripe_customer_id: session.customer ?? null,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent ?? null,
    metadata,
    updated_at: new Date().toISOString(),
  };

  try {
    if (session.subscription) {
      const stripeSubscription = await stripeGet(`/subscriptions/${session.subscription}`);
      if (stripeSubscription?.current_period_end) {
        updatePayload.next_billing_date = new Date(stripeSubscription.current_period_end * 1000).toISOString();
      }
      if (stripeSubscription?.current_period_start) {
        updatePayload.current_period_start = new Date(stripeSubscription.current_period_start * 1000).toISOString();
      }
      if (stripeSubscription?.current_period_end) {
        updatePayload.current_period_end = new Date(stripeSubscription.current_period_end * 1000).toISOString();
      }
    }
  } catch (err) {
    console.warn("Unable to fetch Stripe subscription details", err);
  }

  const { error: updateError } = await supabase
    .from("organization_subscriptions")
    .update(updatePayload)
    .eq("id", subscriptionId);

  if (updateError) {
    console.error("Failed to update subscription after checkout", updateError);
  }
}

async function handleInvoicePaymentSucceeded(supabase: any, invoice: any) {
  const stripeSubscriptionId = invoice.subscription as string | undefined;
  if (!stripeSubscriptionId) {
    console.warn("Invoice without subscription", invoice.id);
    return;
  }

  const { data: subscription, error: subError } = await supabase
    .from("organization_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (subError || !subscription) {
    console.error("Subscription not found for Stripe invoice", stripeSubscriptionId, subError);
    return;
  }

  const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
  const amount = amountCents / 100;
  const dueTimestamp = invoice.due_date ?? invoice.created;
  const paidTimestamp = invoice.status_transitions?.paid_at ?? invoice.created;

  const paymentRecord = {
    subscription_id: subscription.id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent ?? null,
    stripe_hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    stripe_receipt_url: invoice.invoice_pdf ?? invoice.hosted_invoice_url ?? null,
    amount,
    payment_method: invoice.collection_method === "charge_automatically" ? "CARD" : invoice.collection_method,
    status: (invoice.status || "paid").toUpperCase(),
    due_date: new Date(dueTimestamp * 1000).toISOString(),
    payment_date: paidTimestamp ? new Date(paidTimestamp * 1000).toISOString() : null,
    metadata: sanitizeMetadata(invoice.metadata),
    updated_at: new Date().toISOString(),
  };

  const { error: paymentError } = await supabase
    .from("subscription_payments")
    .upsert(paymentRecord, { onConflict: "stripe_invoice_id" });

  if (paymentError) {
    console.error("Failed to upsert subscription payment", paymentError);
  }

  const { error: subscriptionUpdateError } = await supabase
    .from("organization_subscriptions")
    .update({
      status: "active",
      last_payment_amount: amount,
      last_payment_date: paymentRecord.payment_date ?? new Date().toISOString(),
      stripe_invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  if (subscriptionUpdateError) {
    console.error("Failed to update subscription after payment", subscriptionUpdateError);
  }
}

async function handleInvoicePaymentFailed(supabase: any, invoice: any) {
  const stripeSubscriptionId = invoice.subscription as string | undefined;
  if (!stripeSubscriptionId) {
    return;
  }

  const { error } = await supabase
    .from("organization_subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("Failed to mark subscription as past_due", error);
  }
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { ...corsHeaders } });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase ausente" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const isValid = await verifyStripeSignature(rawBody, signature);
  if (!isValid) {
    console.warn("Invalid Stripe signature", signature);
    return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let event: any;
  try {
    event = rawBody ? JSON.parse(rawBody) : null;
  } catch (err) {
    console.error("Failed to parse Stripe event payload", err);
    return new Response(JSON.stringify({ error: "Payload inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    switch (event?.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data?.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabase, event.data?.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data?.object);
        break;
      case "customer.subscription.deleted":
        if (event.data?.object?.id) {
          const { error } = await supabase
            .from("organization_subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", event.data.object.id);
          if (error) {
            console.error("Failed to cancel subscription", error);
          }
        }
        break;
      default:
        console.log("Unhandled Stripe event", event?.type);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Stripe webhook processing error", err);
    return new Response(JSON.stringify({ error: "Erro ao processar webhook" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
