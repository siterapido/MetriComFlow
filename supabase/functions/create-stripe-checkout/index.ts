import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore allow jsr imports without deno tooling locally
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveStripeProductId } from "../../../../src/lib/stripePlanProducts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

const STRIPE_SECRET_KEY = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY") ?? "";
const APP_URL =
  (globalThis as any).Deno?.env.get("APP_URL") ??
  (globalThis as any).Deno?.env.get("VITE_APP_URL") ??
  "http://localhost:8082";
const SUPABASE_URL = (globalThis as any).Deno?.env.get("PROJECT_URL") ?? (globalThis as any).Deno?.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
  (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in Edge Function env");
}

interface BillingAddress {
  postalCode?: string;
  addressNumber?: string;
  street?: string;
  province?: string;
  city?: string;
  state?: string;
  addressComplement?: string;
}

interface CreateCheckoutRequest {
  subscriptionId?: string;
  planSlug: string;
  stripeProductId?: string;
  billingName: string;
  billingEmail: string;
  billingCpfCnpj?: string;
  billingPhone?: string;
  billingAddress?: BillingAddress;
}

const stripeApiBase = "https://api.stripe.com/v1";

type StripeRequestOptions = {
  method?: "GET" | "POST";
};

async function stripeRequest(path: string, params: URLSearchParams = new URLSearchParams(), options?: StripeRequestOptions) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not configured");
  }

  const method = options?.method ?? "POST";
  let url = `${stripeApiBase}${path}`;
  let body: string | undefined;

  if (method === "GET") {
    const query = params.toString();
    if (query) {
      url = `${url}?${query}`;
    }
  } else {
    body = params.toString();
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const bodyText = await response.text();

  let data: any;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch (err) {
    console.error(`Failed to parse Stripe response from ${path}:`, bodyText, err);
    throw new Error("Resposta inválida da API da Stripe");
  }

  if (!response.ok) {
    const message = data?.error?.message || `Stripe request failed for ${path}`;
    console.error("Stripe API error", { path, status: response.status, body: data });
    throw new Error(message);
  }

  return data;
}

async function ensureStripeIdentifiers(
  plan: any,
  supabaseClient: ReturnType<typeof createClient>,
  explicitProductId?: string | null,
) {
  let priceId: string | null = plan.stripe_price_id ?? null;
  let productId: string | null = plan.stripe_product_id ?? explicitProductId ?? null;

  if (!priceId) {
    if (!productId) {
      productId = resolveStripeProductId({
        slug: plan.slug,
        billing_period: plan.billing_period,
        display_order: plan.display_order,
      });
    }

    if (!productId) {
      throw new Error(
        "Plano sem Stripe Product configurado. Defina stripe_product_id em subscription_plans ou atualize o mapeamento de produtos.",
      );
    }

    const product = await stripeRequest(`/products/${productId}`, new URLSearchParams(), { method: "GET" });
    const defaultPrice = product?.default_price;

    if (typeof defaultPrice === "string") {
      priceId = defaultPrice;
    } else if (defaultPrice?.id) {
      priceId = defaultPrice.id as string;
    }

    if (!priceId) {
      const priceSearch = new URLSearchParams();
      priceSearch.set("product", productId);
      priceSearch.set("limit", "1");
      priceSearch.set("active", "true");
      const prices = await stripeRequest("/prices", priceSearch, { method: "GET" });
      const candidate = prices?.data?.[0];
      if (candidate?.id) {
        priceId = candidate.id as string;
      }
    }

    if (!priceId) {
      throw new Error(
        "Plano sem Stripe Price configurado. Defina stripe_price_id em subscription_plans ou associe um preço padrão ao produto.",
      );
    }
  }

  if (!productId && priceId) {
    const price = await stripeRequest(`/prices/${priceId}`, new URLSearchParams(), { method: "GET" });
    if (price?.product && typeof price.product === "string") {
      productId = price.product;
    }
  }

  const updates: Record<string, any> = {};
  if (!plan.stripe_price_id && priceId) {
    updates.stripe_price_id = priceId;
  }
  if (!plan.stripe_product_id && productId) {
    updates.stripe_product_id = productId;
  }

  if (Object.keys(updates).length) {
    const { error: updateError } = await supabaseClient
      .from("subscription_plans")
      .update(updates)
      .eq("id", plan.id);

    if (updateError) {
      console.warn("Failed to persist Stripe identifiers for plan", plan.id, updateError);
    }
  }

  plan.stripe_price_id = priceId;
  plan.stripe_product_id = productId;

  return { priceId, productId };
}

function sanitizeJsonMetadata(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object") {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return {};
  }
}

function normalizeAppUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
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
      JSON.stringify({ success: false, error: "Configuração do Supabase ausente" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = (await req.json()) as CreateCheckoutRequest;

    const {
      subscriptionId,
      planSlug,
      stripeProductId,
      billingName,
      billingEmail,
      billingCpfCnpj,
      billingPhone,
      billingAddress,
    } = body;

    if (!planSlug) {
      throw new Error("Plano não informado");
    }

    if (!billingName || !billingEmail) {
      throw new Error("Nome e email são obrigatórios");
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, slug, billing_period, display_order, stripe_price_id, stripe_product_id, metadata")
      .eq("slug", planSlug)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error("Plano não encontrado");
    }

    const sanitizedProductId =
      typeof stripeProductId === "string" && stripeProductId.trim().length > 0
        ? stripeProductId.trim()
        : null;

    const { priceId, productId } = await ensureStripeIdentifiers(plan, supabase, sanitizedProductId);

    if (!priceId) {
      throw new Error("Plano sem Stripe Price configurado. Defina stripe_price_id em subscription_plans.");
    }

    const normalizedAppUrl = normalizeAppUrl(APP_URL || "http://localhost:8082");

    const isPublicCheckout = !subscriptionId;

    let organizationId: string | null = null;
    let subscription: any = null;

    if (subscriptionId) {
      const { data: existingSubscription, error: subscriptionError } = await supabase
        .from("organization_subscriptions")
        .select("*, organizations(id, name)")
        .eq("id", subscriptionId)
        .maybeSingle();

      if (subscriptionError || !existingSubscription) {
        throw new Error("Assinatura não encontrada");
      }

      subscription = existingSubscription;
      organizationId = existingSubscription.organization_id;
    } else {
      // Create organization on the fly for public checkout
      const orgName = billingName?.trim() || `Cliente ${plan.name}`;
      const slugBase = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const uniqueSlug = `${slugBase || "cliente"}-${Date.now()}`;

      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, slug: uniqueSlug })
        .select("id")
        .single();

      if (orgError || !newOrg) {
        throw new Error(orgError?.message || "Falha ao criar organização");
      }

      organizationId = newOrg.id;

      const { data: newSub, error: subError } = await supabase
        .from("organization_subscriptions")
        .insert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: "trial",
          metadata: {
            checkout_started_at: new Date().toISOString(),
            plan_slug: plan.slug,
          },
        })
        .select("*")
        .single();

      if (subError || !newSub) {
        throw new Error(subError?.message || "Falha ao criar assinatura");
      }

      subscription = newSub;
    }

    if (!organizationId || !subscription) {
      throw new Error("Falha ao preparar assinatura");
    }

    const currentMetadata = sanitizeJsonMetadata(subscription.metadata);

    let claimToken: string | null = null;
    if (isPublicCheckout) {
      claimToken = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      currentMetadata.claim_token = claimToken;
      currentMetadata.claim_email = billingEmail;
      currentMetadata.checkout_completed_at = new Date().toISOString();
    }

    currentMetadata.plan_slug = plan.slug;
    currentMetadata.plan_id = plan.id;
    if (productId) {
      currentMetadata.plan_product_id = productId;
    }

    let stripeCustomerId = subscription.stripe_customer_id as string | null;

    const sanitizedPhone = billingPhone ? billingPhone.replace(/\D/g, "") : undefined;
    const sanitizedPostalCode = billingAddress?.postalCode ? billingAddress.postalCode.replace(/\D/g, "") : undefined;

    if (!stripeCustomerId) {
      const customerParams = new URLSearchParams();
      customerParams.set("name", billingName);
      customerParams.set("email", billingEmail.toLowerCase());
      customerParams.set("metadata[subscription_id]", subscription.id);
      customerParams.set("metadata[organization_id]", organizationId);
      customerParams.set("metadata[plan_slug]", plan.slug);
      if (productId) {
        customerParams.set("metadata[plan_product_id]", productId);
      }
      if (billingCpfCnpj) {
        customerParams.set("metadata[billing_document]", billingCpfCnpj);
      }
      if (sanitizedPhone) {
        customerParams.set("phone", sanitizedPhone);
      }
      if (billingAddress?.street) {
        customerParams.set("address[line1]", billingAddress.street);
      }
      if (billingAddress?.addressNumber) {
        customerParams.set("address[line2]", `Nº ${billingAddress.addressNumber}`);
      }
      if (billingAddress?.city) {
        customerParams.set("address[city]", billingAddress.city);
      }
      if (billingAddress?.state) {
        customerParams.set("address[state]", billingAddress.state.toUpperCase());
      }
      if (sanitizedPostalCode) {
        customerParams.set("address[postal_code]", sanitizedPostalCode);
      }
      customerParams.set("address[country]", "BR");

      const customer = await stripeRequest("/customers", customerParams);
      stripeCustomerId = customer.id as string;
      currentMetadata.stripe_customer_created_at = new Date().toISOString();
    }

    const successUrl = isPublicCheckout
      ? `${normalizedAppUrl}/finalizar-cadastro?org=${encodeURIComponent(organizationId)}&sub=${encodeURIComponent(
          subscription.id,
        )}&claim=${encodeURIComponent(claimToken || "")}&email=${encodeURIComponent(
          billingEmail.toLowerCase(),
        )}&session_id={CHECKOUT_SESSION_ID}`
      : `${normalizedAppUrl}/planos?status=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isPublicCheckout
      ? `${normalizedAppUrl}/checkout?plan=${encodeURIComponent(plan.slug)}&status=cancelled`
      : `${normalizedAppUrl}/planos?status=cancelled`;

    const sessionParams = new URLSearchParams();
    sessionParams.set("mode", "subscription");
    sessionParams.set("success_url", successUrl);
    sessionParams.set("cancel_url", cancelUrl);
    sessionParams.set("customer", stripeCustomerId);
    sessionParams.set("client_reference_id", subscription.id);
    sessionParams.set("allow_promotion_codes", "true");
    sessionParams.set("billing_address_collection", "auto");
    sessionParams.set("payment_method_types[0]", "card");
    sessionParams.set("line_items[0][price]", priceId);
    sessionParams.set("line_items[0][quantity]", "1");
    sessionParams.set("subscription_data[metadata][subscription_id]", subscription.id);
    sessionParams.set("subscription_data[metadata][organization_id]", organizationId);
    sessionParams.set("subscription_data[metadata][plan_slug]", plan.slug);
    sessionParams.set("subscription_data[metadata][plan_id]", plan.id);
    if (productId) {
      sessionParams.set("subscription_data[metadata][plan_product_id]", productId);
    }
    if (billingCpfCnpj) {
      sessionParams.set("subscription_data[metadata][billing_document]", billingCpfCnpj);
    }

    const checkoutSession = await stripeRequest("/checkout/sessions", sessionParams);

    if (!checkoutSession?.url) {
      throw new Error("Stripe não retornou URL de checkout");
    }

    currentMetadata.stripe_checkout_session_id = checkoutSession.id;

    const serializedAddress = billingAddress ? JSON.stringify(billingAddress) : null;

    const updatePayload: Record<string, any> = {
      plan_id: plan.id,
      billing_name: billingName,
      billing_email: billingEmail,
      billing_cpf_cnpj: billingCpfCnpj || null,
      billing_phone: billingPhone || null,
      billing_address: serializedAddress,
      payment_gateway: "stripe",
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: checkoutSession.id,
      metadata: currentMetadata,
      updated_at: new Date().toISOString(),
    };

    if (!subscriptionId) {
      updatePayload.status = "trial";
    }

    const { error: updateError } = await supabase
      .from("organization_subscriptions")
      .update(updatePayload)
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Failed to update subscription with Stripe data", updateError);
      throw new Error("Falha ao atualizar assinatura");
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkoutSession.url,
        organizationId,
        subscriptionId: subscription.id,
        claimToken,
        stripeCustomerId,
        stripeCheckoutSessionId: checkoutSession.id,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Stripe checkout error", error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
