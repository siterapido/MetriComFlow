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
  planId?: string;
  planSlug?: string;
  planName?: string;
  priceId?: string | null;
  organizationId?: string | null;
  subscriptionId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

type StripeMetadata = {
  customer_id?: string;
  product_id?: string;
  price_id?: string;
  last_checkout_session_id?: string;
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

    const payload = (await req.json()) as RequestBody;
    console.log("create-stripe-checkout payload:", payload);
    if (!payload?.successUrl || !payload?.cancelUrl) {
      throw new Error("URLs de sucesso e cancelamento são obrigatórias.");
    }

    if (!payload.planId && !payload.planSlug) {
      throw new Error("Informe o plano desejado.");
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    const planQuery = adminClient
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .limit(1);

    if (payload.planId) {
      planQuery.eq("id", payload.planId);
    } else if (payload.planSlug) {
      planQuery.eq("slug", payload.planSlug);
    }
    const { data: planData, error: planError } = await planQuery.maybeSingle();
    if (planError || !planData) {
      throw new Error("Plano não encontrado ou inativo.");
    }

    const planSlug = planData.slug as string;
    const explicitPriceId = payload.priceId?.trim() || null;
    const planPriceId =
      typeof (planData as any).stripe_price_id === "string" && (planData as any).stripe_price_id.trim() !== ""
        ? ((planData as any).stripe_price_id as string)
        : null;
    const priceId = explicitPriceId || planPriceId || null;

    console.log("create-stripe-checkout plan resolved:", {
      planId: planData.id,
      planSlug,
      stripePriceId: planPriceId,
      explicitPriceProvided: !!explicitPriceId,
    });

    if (!priceId) {
      throw new Error(
        `Plano "${planSlug}" não possui price Stripe configurado. Informe payload.priceId ou preencha subscription_plans.stripe_price_id.`,
      );
    }

    const price = await stripe.prices.retrieve(priceId);
    const productRef = price.product;
    const resolvedProductId =
      typeof productRef === "string"
        ? productRef
        : productRef && typeof productRef === "object"
          ? productRef.id ?? null
          : null;

    if (!resolvedProductId) {
      throw new Error("Não foi possível identificar o produto associado ao price informado.");
    }

    let organizationId: string | null = payload.organizationId ?? null;
    if (!organizationId) {
      const { data: membership } = await adminClient
        .from("organization_memberships")
        .select("organization_id")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      organizationId = membership?.organization_id ?? null;
    }

    if (!organizationId) {
      const organizationName =
        payload.planName ??
        (user.user_metadata?.full_name as string | undefined)?.concat(" - Organização") ??
        (user.email ? `${user.email.split("@")[0]} - Organização` : "Minha Organização");

      let proposedSlug = slugify(organizationName);
      if (!proposedSlug) {
        proposedSlug = `org-${crypto.randomUUID().slice(0, 8)}`;
      }

      const { data: slugConflict } = await adminClient
        .from("organizations")
        .select("id")
        .eq("slug", proposedSlug)
        .maybeSingle();

      const finalSlug = slugConflict ? `${proposedSlug}-${crypto.randomUUID().slice(0, 6)}` : proposedSlug;

      const { data: newOrg, error: orgError } = await adminClient
        .from("organizations")
        .insert({
          name: organizationName,
          slug: finalSlug,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (orgError) {
        throw orgError;
      }

      organizationId = newOrg.id;

      const nowIso = new Date().toISOString();

      await adminClient
        .from("organization_memberships")
        .upsert({
          organization_id: organizationId,
          profile_id: user.id,
          role: "owner",
          is_active: true,
          joined_at: nowIso,
        }, { onConflict: "organization_id,profile_id" });

      await adminClient
        .from("profiles")
        .update({ user_type: "owner", updated_at: nowIso })
        .eq("id", user.id);
    }

    let subscriptionId = payload.subscriptionId ?? null;
    let subscriptionRecord;

    if (subscriptionId) {
      const { data, error } = await adminClient
        .from("organization_subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .maybeSingle();
      if (error) throw error;
      subscriptionRecord = data;
    }

    if (!subscriptionRecord) {
      const { data, error } = await adminClient
        .from("organization_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      subscriptionRecord = data ?? null;
      subscriptionId = subscriptionRecord?.id ?? null;
    }

    if (!subscriptionRecord) {
      const now = new Date();
      const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data: inserted, error: insertError } = await adminClient
        .from("organization_subscriptions")
        .insert({
          organization_id: organizationId,
          plan_id: planData.id,
          status: "trial",
          current_period_start: now.toISOString(),
          current_period_end: inThirtyDays.toISOString(),
          trial_end: inThirtyDays.toISOString(),
          next_billing_date: inThirtyDays.toISOString(),
          metadata: {
            created_via: "stripe_checkout",
            stripe: {},
          },
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      subscriptionRecord = inserted;
      subscriptionId = inserted.id;
    }

    if (!subscriptionId) {
      throw new Error("Falha ao obter ou criar assinatura da organização.");
    }

    const existingMetadata =
      (subscriptionRecord.metadata as Record<string, unknown> | null) ?? {};
    const stripeMetadata =
      (existingMetadata.stripe as StripeMetadata | undefined) ?? {};

    let stripeCustomerId = stripeMetadata.customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          undefined,
        metadata: {
          supabase_user_id: user.id,
          organization_id: organizationId,
        },
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: organizationId,
        subscription_id: subscriptionId,
        plan_id: planData.id,
        plan_slug: planData.slug,
        requested_by: user.id,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          subscription_id: subscriptionId,
          plan_id: planData.id,
          plan_slug: planData.slug,
        },
      },
    });

    const updatedMetadata = {
      ...existingMetadata,
      stripe: {
        ...stripeMetadata,
        customer_id: stripeCustomerId,
        product_id: resolvedProductId,
        price_id: priceId,
        last_checkout_session_id: session.id,
      },
    };

    const { error: updateError } = await adminClient
      .from("organization_subscriptions")
      .update({
        plan_id: planData.id,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    if (updateError) {
      console.warn("Falha ao atualizar metadata da assinatura:", updateError);
    }

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erro ao criar checkout Stripe:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
