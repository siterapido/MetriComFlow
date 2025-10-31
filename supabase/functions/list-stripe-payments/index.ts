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
  limit?: number;
};

type PaymentMethodInfo = {
  type: string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  wallet_type?: string | null;
};

type StripePaymentSummary = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  receipt_url: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  payment_method: PaymentMethodInfo | null;
};

function unixToIso(unixTime: number | null | undefined): string | null {
  if (!unixTime) return null;
  try {
    return new Date(unixTime * 1000).toISOString();
  } catch {
    return null;
  }
}

function formatAmount(amount: number | null | undefined): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toFixed(2);
}

function resolveDueDate(payment: StripePaymentSummary): string {
  return (
    payment.due_date ??
    payment.created_at ??
    new Date().toISOString()
  );
}

function describePaymentMethod(method: PaymentMethodInfo | null): string | null {
  if (!method || !method.type) {
    return null;
  }

  if (method.type === "card") {
    const brand = method.brand ? method.brand.toUpperCase() : "CARD";
    const last4 = method.last4 ? ` •••• ${method.last4}` : "";
    return `${brand}${last4}`.trim();
  }

  return method.type;
}

async function syncStripePayments(
  adminClient: any,
  subscriptionId: string,
  payments: StripePaymentSummary[],
) {
  if (!payments.length) return;

  const invoiceIds = payments
    .map((payment) => payment.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (!invoiceIds.length) return;

  const { data: existing, error: existingError } = await adminClient
    .from("subscription_payments")
    .select("id, stripe_invoice_id")
    .eq("subscription_id", subscriptionId)
    .in("stripe_invoice_id", invoiceIds);

  if (existingError) {
    throw existingError;
  }

  const existingMap = new Map<string, string>();
  for (const row of existing ?? []) {
    if (row?.stripe_invoice_id && row?.id) {
      existingMap.set(row.stripe_invoice_id, row.id);
    }
  }

  const nowIso = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; payload: Record<string, unknown> }[] = [];

  for (const payment of payments) {
    if (!payment.id) continue;

    const paymentMethodLabel = describePaymentMethod(payment.payment_method);
    const basePayload: Record<string, unknown> = {
      subscription_id: subscriptionId,
      amount: formatAmount(payment.amount ?? 0),
      payment_method: paymentMethodLabel,
      status: payment.status ?? "open",
      due_date: resolveDueDate(payment),
      payment_date: payment.paid_at ?? null,
      stripe_payment_intent_id: payment.payment_intent_id ?? null,
      stripe_invoice_id: payment.id,
      stripe_hosted_invoice_url: payment.hosted_invoice_url ?? null,
      stripe_receipt_url: payment.receipt_url ?? null,
      metadata: {
        source: "stripe",
        invoice_number: payment.number ?? null,
        payment_method: payment.payment_method ?? null,
        stripe_charge_id: payment.charge_id ?? null,
        synced_at: nowIso,
      },
      updated_at: nowIso,
    };

    const existingId = existingMap.get(payment.id);
    if (existingId) {
      updates.push({ id: existingId, payload: basePayload });
    } else {
      inserts.push({ ...basePayload, created_at: nowIso });
    }
  }

  if (inserts.length) {
    const { error: insertError } = await adminClient
      .from("subscription_payments")
      .insert(inserts);
    if (insertError) {
      throw insertError;
    }
  }

  for (const update of updates) {
    const { id, payload } = update;
    const { error: updateError } = await adminClient
      .from("subscription_payments")
      .update(payload)
      .eq("id", id);
    if (updateError) {
      throw updateError;
    }
  }
}

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 10;
  const safe = Math.floor(limit);
  if (safe < 1) return 1;
  if (safe > 30) return 30;
  return safe;
}

export default (globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let stripeSecret: string | undefined;
  let SUPABASE_URL: string | undefined;
  let SERVICE_ROLE_KEY: string | undefined;

  try {
    stripeSecret = (globalThis as any).Deno?.env.get("STRIPE_SECRET_KEY");
    SUPABASE_URL =
      (globalThis as any).Deno?.env.get("PROJECT_URL") ??
      (globalThis as any).Deno?.env.get("SUPABASE_URL") ??
      "";
    SERVICE_ROLE_KEY =
      (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      (globalThis as any).Deno?.env.get("SERVICE_ROLE_KEY") ??
      "";
  } catch {
    // Ignore, handled below
  }

  if (!stripeSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe não configurado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configuração do Supabase ausente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "Não autenticado." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let payload: RequestBody;
  try {
    payload = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Payload inválido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!payload.subscriptionId) {
    return new Response(
      JSON.stringify({ error: "subscriptionId é obrigatório." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
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
    const subscriptionId = payload.subscriptionId;

    const { data: subscription, error: subscriptionError } = await adminClient
      .from("organization_subscriptions")
      .select("id, organization_id, stripe_subscription_id, stripe_customer_id, metadata")
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
      .select("id")
      .eq("organization_id", subscription.organization_id)
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Acesso negado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metadataStripe =
      (subscription.metadata as Record<string, unknown> | null | undefined)?.stripe as
        | { subscription_id?: string; customer_id?: string }
        | undefined;

    const stripeSubscriptionId =
      (subscription as any).stripe_subscription_id ??
      metadataStripe?.subscription_id ??
      null;

    const stripeCustomerId =
      (subscription as any).stripe_customer_id ?? metadataStripe?.customer_id ?? null;

    if (!stripeSubscriptionId && !stripeCustomerId) {
      return new Response(
        JSON.stringify({ payments: [], warning: "Assinatura não vinculada à Stripe." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    const limit = normalizeLimit(payload.limit);

    const listParams: Stripe.InvoiceListParams = {
      limit,
      expand: ["data.payment_intent.payment_method", "data.charge"],
    };

    if (stripeSubscriptionId) {
      listParams.subscription = stripeSubscriptionId;
    } else if (stripeCustomerId) {
      listParams.customer = stripeCustomerId;
    }

    const invoices = await stripe.invoices.list(listParams);

    const payments: StripePaymentSummary[] = invoices.data.map((invoice) => {
      const paymentIntent =
        typeof invoice.payment_intent === "string" ? null : invoice.payment_intent;
      const charge = typeof invoice.charge === "string" ? null : invoice.charge;

      let paymentMethod: PaymentMethodInfo | null = null;

      const chargeDetails = charge?.payment_method_details;
      if (chargeDetails?.type === "card" && chargeDetails.card) {
        paymentMethod = {
          type: "card",
          brand: chargeDetails.card.brand ?? null,
          last4: chargeDetails.card.last4 ?? null,
          exp_month: chargeDetails.card.exp_month ?? null,
          exp_year: chargeDetails.card.exp_year ?? null,
          wallet_type: chargeDetails.card.wallet?.type ?? null,
        };
      } else if (paymentIntent && typeof paymentIntent.payment_method !== "string") {
        const pm = paymentIntent.payment_method;
        if (pm?.type === "card" && pm.card) {
          paymentMethod = {
            type: "card",
            brand: pm.card.brand ?? null,
            last4: pm.card.last4 ?? null,
            exp_month: pm.card.exp_month ?? null,
            exp_year: pm.card.exp_year ?? null,
            wallet_type: pm.card.wallet?.type ?? null,
          };
        } else if (pm) {
          paymentMethod = { type: pm.type ?? null };
        }
      } else if (chargeDetails) {
        paymentMethod = { type: chargeDetails.type ?? null };
      }

      const amountTotal = typeof invoice.total === "number" ? invoice.total / 100 : 0;
      const currency = invoice.currency ? invoice.currency.toUpperCase() : "BRL";
      const status = invoice.status ?? "open";
      const dueDateIso = unixToIso(invoice.due_date ?? null) ?? unixToIso(invoice.created);
      const paidAtIso =
        unixToIso(invoice.status_transitions?.paid_at ?? null) ??
        unixToIso(paymentIntent?.status === "succeeded" ? paymentIntent.created : null);

      return {
        id: invoice.id,
        number: invoice.number ?? null,
        amount: amountTotal,
        currency,
        status,
        due_date: dueDateIso,
        paid_at: paidAtIso,
        created_at: unixToIso(invoice.created),
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf_url: invoice.invoice_pdf ?? null,
        receipt_url: charge?.receipt_url ?? null,
        payment_intent_id:
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : paymentIntent?.id ?? null,
        charge_id: typeof invoice.charge === "string" ? invoice.charge : charge?.id ?? null,
        payment_method: paymentMethod,
      };
    });

    let warning: string | null = null;

    try {
      await syncStripePayments(adminClient, subscriptionId, payments);
    } catch (syncError) {
      console.error("Falha ao sincronizar pagamentos com o banco:", syncError);
      warning =
        "Pagamentos carregados da Stripe, mas houve erro ao atualizar o histórico local.";
    }

    return new Response(
      JSON.stringify({ payments, warning }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erro ao buscar pagamentos Stripe:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
