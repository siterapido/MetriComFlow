import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN"); // Optional token for webhook validation

/**
 * Asaas Webhook Handler
 *
 * Handles webhooks from Asaas for subscription and payment events:
 * - PAYMENT_CREATED, PAYMENT_RECEIVED, PAYMENT_CONFIRMED
 * - PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_DELETED
 * - SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_DELETED
 *
 * IMPORTANT: This function is designed to accept external webhooks from Asaas.
 * It does NOT require JWT authentication from Supabase auth system.
 * Optional: Set ASAAS_WEBHOOK_TOKEN environment variable for additional security.
 */

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
    dueDate: string;
    paymentDate?: string;
    billingType: string;
    invoiceUrl?: string;
    subscription?: string;
    externalReference?: string;
  };
  subscription?: {
    id: string;
    status: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    deleted: boolean;
    externalReference?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, asaas-access-token",
      },
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Optional: Validate webhook token from Asaas
    if (ASAAS_WEBHOOK_TOKEN) {
      const providedToken = req.headers.get("asaas-access-token");
      if (providedToken !== ASAAS_WEBHOOK_TOKEN) {
        console.error("Invalid webhook token provided");
        return new Response(
          JSON.stringify({
            code: 401,
            message: "Invalid webhook token",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse webhook payload
    const payload: AsaasWebhookPayload = await req.json();
    const { event, payment, subscription } = payload;

    console.log(`Received Asaas webhook: ${event}`);

    // Handle payment events
    if (event.startsWith("PAYMENT_")) {
      await handlePaymentEvent(supabase, event, payment!);
    }

    // Handle subscription events
    if (event.startsWith("SUBSCRIPTION_")) {
      await handleSubscriptionEvent(supabase, event, subscription!);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing Asaas webhook:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

async function handlePaymentEvent(
  supabase: any,
  event: string,
  payment: any
) {
  console.log(`Processing payment event: ${event} for payment ${payment.id}`);

  // Map Asaas status to our status
  const statusMap: Record<string, string> = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    RECEIVED: "RECEIVED",
    OVERDUE: "OVERDUE",
    REFUNDED: "REFUNDED",
    RECEIVED_IN_CASH: "RECEIVED",
    REFUND_REQUESTED: "REFUNDED",
    CHARGEBACK_REQUESTED: "CANCELLED",
    CHARGEBACK_DISPUTE: "CANCELLED",
    AWAITING_CHARGEBACK_REVERSAL: "CANCELLED",
  };

  const mappedStatus = statusMap[payment.status] || "PENDING";

  // Find the subscription by Asaas subscription ID or external reference
  let subscriptionId = payment.externalReference;

  if (payment.subscription) {
    // Payment is part of a subscription, find by Asaas subscription ID
    const { data: sub } = await supabase
      .from("organization_subscriptions")
      .select("id")
      .eq("asaas_subscription_id", payment.subscription)
      .single();

    if (sub) {
      subscriptionId = sub.id;
    }
  }

  if (!subscriptionId) {
    console.error("Subscription not found for payment:", payment.id);
    return;
  }

  // Upsert payment record
  const { error: paymentError } = await supabase
    .from("subscription_payments")
    .upsert(
      {
        subscription_id: subscriptionId,
        asaas_payment_id: payment.id,
        asaas_invoice_url: payment.invoiceUrl,
        amount: payment.value,
        payment_method: payment.billingType,
        status: mappedStatus,
        due_date: payment.dueDate,
        payment_date: payment.paymentDate || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "asaas_payment_id",
      }
    );

  if (paymentError) {
    console.error("Error upserting payment:", paymentError);
    throw paymentError;
  }

  // Update subscription status based on payment status
  if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    // Payment received, ensure subscription is active
    const { error: subError } = await supabase
      .from("organization_subscriptions")
      .update({
        status: "active",
        last_payment_date: payment.paymentDate || new Date().toISOString(),
        last_payment_amount: payment.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (subError) {
      console.error("Error updating subscription status:", subError);
    }
  } else if (event === "PAYMENT_OVERDUE") {
    // Payment overdue, mark subscription as past_due
    const { error: subError } = await supabase
      .from("organization_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (subError) {
      console.error("Error updating subscription to past_due:", subError);
    }
  }

  console.log(`Payment event processed: ${event} for ${payment.id}`);
}

async function handleSubscriptionEvent(
  supabase: any,
  event: string,
  subscription: any
) {
  console.log(
    `Processing subscription event: ${event} for subscription ${subscription.id}`
  );

  // Find our subscription by Asaas subscription ID or external reference
  const { data: ourSub, error: findError } = await supabase
    .from("organization_subscriptions")
    .select("*")
    .eq("asaas_subscription_id", subscription.id)
    .maybeSingle();

  if (findError) {
    console.error("Error finding subscription:", findError);
    return;
  }

  if (!ourSub && subscription.externalReference) {
    // Try finding by external reference
    const { data: subByRef } = await supabase
      .from("organization_subscriptions")
      .select("*")
      .eq("id", subscription.externalReference)
      .single();

    if (!subByRef) {
      console.error("Subscription not found:", subscription.id);
      return;
    }
  }

  const subscriptionId = ourSub?.id || subscription.externalReference;

  // Map Asaas subscription status to our status
  const statusMap: Record<string, string> = {
    ACTIVE: "active",
    EXPIRED: "expired",
    INACTIVE: "canceled",
  };

  const mappedStatus = statusMap[subscription.status] || "active";

  // Update subscription
  const updateData: any = {
    status: subscription.deleted ? "canceled" : mappedStatus,
    updated_at: new Date().toISOString(),
  };

  if (subscription.nextDueDate) {
    updateData.next_billing_date = subscription.nextDueDate;
  }

  if (subscription.deleted) {
    updateData.canceled_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("organization_subscriptions")
    .update(updateData)
    .eq("id", subscriptionId);

  if (updateError) {
    console.error("Error updating subscription:", updateError);
    throw updateError;
  }

  console.log(
    `Subscription event processed: ${event} for ${subscription.id}`
  );
}
