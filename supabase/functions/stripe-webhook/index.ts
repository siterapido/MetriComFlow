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
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-application-name",
};

type StripeMetadata = {
  customer_id?: string;
  subscription_id?: string;
  checkout_session_id?: string;
  price_id?: string;
  product_id?: string;
  latest_invoice_id?: string;
};

const PRICE_TO_PLAN_SLUG: Record<string, string> = {
  // Fallback mapping in case subscription_plans.stripe_price_id is not populated
  "price_1SNxA8RxDd43b7sZ9GlVA2J1": "basico",
  "price_1SNxEvRxDd43b7sZira7LmiX": "intermediario",
  "price_1SNxFcRxDd43b7sZPC3d8fXf": "pro",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = (globalThis as any).Deno?.env.get("STRIPE_WEBHOOK_SECRET");
  const SUPABASE_URL =
    (globalThis as any).Deno?.env.get("PROJECT_URL") ??
    (globalThis as any).Deno?.env.get("SUPABASE_URL") ??
    "";
  const SERVICE_ROLE_KEY =
    (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
    (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
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
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", STRIPE_WEBHOOK_SECRET);
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

      // Idempotency: if we already processed this session, exit quickly
      const { data: existingProc } = await supabase
        .from("organization_subscriptions")
        .select("id")
        .contains("metadata", { stripe: { checkout_session_id: fullSession.id } } as any)
        .maybeSingle();
      if (existingProc) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve plan
      let planId: string | null = null;
      let planSlug: string | null = null;
      if (priceId) {
        // Try DB mapping first
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
          } catch (_) {}
        }
      }

      if (!userId) {
        // Best-effort fallback: listUsers then filter
        try {
          const listRes: any = await (supabase as any).auth?.admin?.listUsers?.({ page: 1, perPage: 100 });
          const found = listRes?.data?.users?.find((u: any) => u?.email?.toLowerCase() === customerEmail.toLowerCase());
          userId = found?.id ?? null;
        } catch (_) {}
      }

      if (!userId) {
        throw new Error("Failed to create or fetch Supabase user");
      }

      // Ensure organization
      let organizationId: string | null = null;
      const orgName = (customerName || customerEmail.split("@")[0]) + " - Organização";
      const proposedSlug = slugify(orgName) || `org-${crypto.randomUUID().slice(0, 8)}`;

      // Create a new org for this purchase
      const { data: newOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: orgName, slug: proposedSlug, owner_id: userId, billing_email: customerEmail })
        .select("id")
        .single();
      if (orgErr) throw orgErr;
      organizationId = (newOrg as any).id;

      const nowIso = new Date().toISOString();
      await supabase.from("organization_memberships").insert({
        organization_id: organizationId,
        profile_id: userId,
        role: "owner",
        is_active: true,
        joined_at: nowIso,
      });

      // Upsert profile
      await supabase.from("profiles").upsert(
        { id: userId, email: customerEmail, full_name: customerName ?? null, user_type: "owner", updated_at: nowIso },
        { onConflict: "id" },
      );

      // Create subscription row
      const currentPeriodStart = stripeSubscription?.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
        : nowIso;
      const currentPeriodEnd = stripeSubscription?.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : null;

      const stripeMeta: StripeMetadata = {
        customer_id: typeof fullSession.customer === "string" ? fullSession.customer : fullSession.customer?.id ?? undefined,
        subscription_id: stripeSubscription?.id,
        checkout_session_id: fullSession.id,
        price_id: priceId ?? undefined,
        product_id: productId ?? undefined,
        latest_invoice_id:
          typeof stripeSubscription?.latest_invoice === "string"
            ? stripeSubscription?.latest_invoice
            : (stripeSubscription?.latest_invoice as any)?.id,
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
          metadata: { created_via: "stripe_webhook", stripe: stripeMeta, plan_slug: planSlug },
        })
        .select("id")
        .single();
      if (subErr) throw subErr;

      // Invite new user to set password (optional but improves UX)
      if (isNewUser) {
        try {
          const APP_URL = (globalThis as any).Deno?.env.get("APP_URL") ?? undefined;
          const redirectTo = APP_URL ? `${APP_URL}/login` : undefined;
          const adminAny: any = (supabase as any).auth?.admin;
          if (adminAny?.inviteUserByEmail) {
            await adminAny.inviteUserByEmail(customerEmail, { redirectTo });
          }
        } catch (err) {
          console.warn("Failed to send invite email:", err);
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
