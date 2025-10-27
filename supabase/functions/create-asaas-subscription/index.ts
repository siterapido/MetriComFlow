import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Allow jsr imports in local editors without Deno tooling
import { createClient } from "jsr:@supabase/supabase-js@2";

// Consistent CORS headers for preflight and all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

const ASAAS_API_KEY = (globalThis as any).Deno?.env.get("ASAAS_API_KEY") || "";
const ASAAS_API_URL = "https://api.asaas.com/v3";
const SUPABASE_URL = (globalThis as any).Deno?.env.get("SUPABASE_URL")!;
// Note: Supabase secrets cannot start with "SUPABASE_". Use SERVICE_ROLE_KEY.
const SERVICE_ROLE_KEY = (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY")!;
const ASAAS_MOCK_MODE = !ASAAS_API_KEY;

interface CreateSubscriptionRequest {
  // Internal Supabase subscription ID (existing org flow). Optional in public checkout flow
  subscriptionId?: string;
  // Plan to subscribe
  planSlug: string;
  // Billing data collected at checkout
  billingName: string;
  billingEmail: string;
  billingCpfCnpj: string;
  billingPhone: string;
  billingAddress: {
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
  };
  billingType: "CREDIT_CARD" | "PIX" | "BOLETO";
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  remoteIp?: string;
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse request body
    const body: CreateSubscriptionRequest = await req.json();
    console.log("📥 Request body received:", JSON.stringify(body, null, 2));

    const {
      subscriptionId,
      planSlug,
      billingName,
      billingEmail,
      billingCpfCnpj,
      billingPhone,
      billingAddress,
      billingType,
      creditCard,
      remoteIp,
    } = body;

    const isPublicCheckout = !subscriptionId;
    console.log(
      `🔄 Creating Asaas subscription for: ${subscriptionId ?? "PUBLIC_CHECKOUT"} | Plan: ${planSlug} | Type: ${billingType}`
    );

    // 1. Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planSlug}`);
    }

    // 2. Get subscription details (existing flow) OR create organization+subscription (public checkout)
    let subscription: any = null;
    let organizationId: string | null = null;

    if (!isPublicCheckout) {
      const { data: subData, error: subError } = await supabase
        .from("organization_subscriptions")
        .select("*, organizations(*)")
        .eq("id", subscriptionId as string)
        .single();
      if (subError || !subData) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }
      subscription = subData;
      organizationId = subscription.organization_id;
    } else {
      // Public checkout: create organization and initial subscription
      const orgName = billingName?.trim() || `Cliente ${plan.name}`;

      // Generate unique slug from name + timestamp
      const slugBase = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
        .replace(/^-+|-+$/g, ""); // Trim dashes
      const slug = `${slugBase}-${Date.now()}`;

      const { data: newOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: slug,
          // owner_id intentionally null during pay-first onboarding
        })
        .select("id")
        .single();
      if (orgErr || !newOrg) {
        console.error("❌ Failed to create organization:", {
          error: orgErr,
          message: orgErr?.message,
          details: orgErr?.details,
          hint: orgErr?.hint,
          code: orgErr?.code,
        });
        throw new Error(`Falha ao criar organização: ${orgErr?.message || "erro desconhecido"}`);
      }
      console.log("✅ Organization created:", newOrg.id);
      organizationId = newOrg.id;

      const { data: newSub, error: subInsErr } = await supabase
        .from("organization_subscriptions")
        .insert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: "trial", // will switch to active after Asaas subscription creation
          metadata: { checkout_started_at: new Date().toISOString() },
        })
        .select("*")
        .single();
      if (subInsErr || !newSub) {
        console.error("❌ Failed to create organization subscription:", {
          error: subInsErr,
          message: subInsErr?.message,
          details: subInsErr?.details,
          hint: subInsErr?.hint,
          code: subInsErr?.code,
        });
        throw new Error(`Falha ao criar assinatura: ${subInsErr?.message || "erro desconhecido"}`);
      }
      console.log("✅ Subscription created:", newSub.id);
      subscription = newSub;
    }

    // 3. Create or get Asaas customer
    let asaasCustomerId = subscription.asaas_customer_id;

    if (!asaasCustomerId && !ASAAS_MOCK_MODE) {
      // Create customer in Asaas
      const customerPayload = {
        name: billingName,
        email: billingEmail,
        cpfCnpj: billingCpfCnpj,
        phone: billingPhone,
        postalCode: billingAddress.postalCode,
        addressNumber: billingAddress.addressNumber,
        addressComplement: billingAddress.addressComplement,
        externalReference: organizationId, // Link to our org
      };

      console.log("🔄 Creating Asaas customer with payload:", JSON.stringify(customerPayload, null, 2));

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY!,
        },
        body: JSON.stringify(customerPayload),
      });

      const customerResponseText = await customerResponse.text();
      console.log(`📥 Asaas customer response (${customerResponse.status}):`, customerResponseText);

      if (!customerResponse.ok) {
        let errorData;
        try {
          errorData = JSON.parse(customerResponseText);
        } catch {
          errorData = { message: customerResponseText };
        }
        throw new Error(
          `Falha ao criar cliente no Asaas (${customerResponse.status}): ${JSON.stringify(errorData)}`
        );
      }

      const customerData = JSON.parse(customerResponseText);
      asaasCustomerId = customerData.id;

      console.log(`✅ Created Asaas customer: ${asaasCustomerId}`);
    }

    if (!asaasCustomerId && ASAAS_MOCK_MODE) {
      asaasCustomerId = `mock-customer-${crypto.randomUUID()}`;
      console.log("⚠️ ASAAS_API_KEY not set. Using mock customer:", asaasCustomerId);
    }

    // 4. Calculate next due date (today + 30 days or immediate)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const formattedDueDate = nextDueDate.toISOString().split("T")[0];

    // 5. Create subscription in Asaas
    let asaasSubscriptionId = subscription.asaas_subscription_id;
    let paymentLink: string | null = null;

    if (!ASAAS_MOCK_MODE) {
      const asaasSubscriptionPayload: any = {
        customer: asaasCustomerId,
        billingType: billingType,
        nextDueDate: formattedDueDate,
        value: plan.price,
        cycle: "MONTHLY",
        description: `Plano ${plan.name} - Metricom Flow`,
        externalReference: subscription.id, // Link to our subscription
      };

      // Add credit card info if provided
      if (billingType === "CREDIT_CARD" && creditCard) {
        asaasSubscriptionPayload.creditCard = {
          holderName: creditCard.holderName,
          number: creditCard.number,
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv,
        };

        asaasSubscriptionPayload.creditCardHolderInfo = {
          name: billingName,
          email: billingEmail,
          cpfCnpj: billingCpfCnpj,
          postalCode: billingAddress.postalCode,
          addressNumber: billingAddress.addressNumber,
          addressComplement: billingAddress.addressComplement,
          phone: billingPhone,
          mobilePhone: billingPhone,
        };

        if (remoteIp) {
          asaasSubscriptionPayload.remoteIp = remoteIp;
        }
      }

      const asaasResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY!,
        },
        body: JSON.stringify(asaasSubscriptionPayload),
      });

      if (!asaasResponse.ok) {
        const errorData = await asaasResponse.json();
        throw new Error(
          `Failed to create Asaas subscription: ${JSON.stringify(errorData)}`
        );
      }

      const asaasSubscription = await asaasResponse.json();
      asaasSubscriptionId = asaasSubscription.id;
      paymentLink = asaasSubscription.paymentLink ?? null;
      console.log(`Created Asaas subscription: ${asaasSubscriptionId}`);
    } else {
      if (!asaasSubscriptionId) {
        asaasSubscriptionId = `mock-subscription-${crypto.randomUUID()}`;
      }
      console.log("⚠️ Using mock Asaas subscription:", asaasSubscriptionId);
    }

    // 6. Update our subscription with Asaas details
    // Build metadata update (include claim token for public checkout)
    let claimToken: string | null = null;
    const newMetadata: Record<string, any> = subscription.metadata || {};
    if (isPublicCheckout) {
      claimToken = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      newMetadata.claim_token = claimToken;
      newMetadata.claim_email = billingEmail;
      newMetadata.checkout_completed_at = new Date().toISOString();
    }

    const serializedBillingAddress = billingAddress ? JSON.stringify(billingAddress) : null;

    const { error: updateError } = await supabase
      .from("organization_subscriptions")
      .update({
        asaas_subscription_id: asaasSubscriptionId,
        asaas_customer_id: asaasCustomerId,
        billing_name: billingName,
        billing_email: billingEmail,
        billing_cpf_cnpj: billingCpfCnpj,
        billing_phone: billingPhone,
        billing_address: serializedBillingAddress,
        payment_method: billingType,
        payment_gateway: ASAAS_MOCK_MODE ? "asaas-mock" : "asaas",
        status: "active", // Change from trial to active
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
      throw updateError;
    }

    // 7. Get the payment link if it's a payment link subscription
    const responsePaymentLink = paymentLink;

    return new Response(
      JSON.stringify({
        success: true,
        asaasSubscriptionId,
        asaasCustomerId: asaasCustomerId,
        paymentLink: responsePaymentLink,
        nextDueDate: formattedDueDate,
        message: "Subscription created successfully in Asaas",
        // Public checkout extras
        claimToken,
        organizationId,
        subscriptionId: subscription.id,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error("❌ Error creating Asaas subscription:", {
      message,
      stack,
      error: err,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: message || "Internal server error",
        details: stack ? stack.split("\n").slice(0, 3).join("\n") : undefined,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
