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
  subscriptionId?: string;
  reason?: string | null;
};

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const stripeSecret = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      throw new Error("Stripe não configurado.");
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

    const payload = (await req.json().catch(() => ({}))) as RequestBody;
    const subscriptionId = payload.subscriptionId?.trim();
    if (!subscriptionId) {
      throw new Error("subscriptionId é obrigatório.");
    }

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

    const user = userData.user;

    const { data: subscription, error: subscriptionError } = await adminClient
      .from("organization_subscriptions")
      .select("id, organization_id, plan_id, stripe_subscription_id, cancel_at_period_end, metadata")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }
    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Assinatura não encontrada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: membership } = await adminClient
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", subscription.organization_id)
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || membership.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Apenas proprietários podem cancelar a assinatura." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripeSubscriptionId =
      (subscription as any).stripe_subscription_id ??
      (subscription.metadata as any)?.stripe?.subscription_id ??
      null;

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    if (stripeSubscriptionId) {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const nowIso = new Date().toISOString();
    const existingMetadata = (subscription.metadata as Record<string, unknown> | null | undefined) ?? {};
    const updatedMetadata = {
      ...existingMetadata,
      billing_state: {
        ...((existingMetadata as any).billing_state ?? {}),
        cancel_requested_at: nowIso,
        cancel_reason: payload.reason ?? null,
      },
    };

    const { error: updateError } = await adminClient
      .from("organization_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancellation_reason: payload.reason ?? null,
        updated_at: nowIso,
        metadata: updatedMetadata,
      })
      .eq("id", subscriptionId)
      .eq("organization_id", subscription.organization_id);

    if (updateError) {
      throw updateError;
    }

    await adminClient.from("subscription_event_logs").insert({
      organization_id: subscription.organization_id,
      subscription_id,
      event_type: "subscription_canceled",
      actor_user_id: user.id,
      context: {
        reason: payload.reason ?? null,
        stripe_subscription_id: stripeSubscriptionId,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("cancel-stripe-subscription error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
