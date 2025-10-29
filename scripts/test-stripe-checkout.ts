import { config } from "dotenv";

config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variáveis de ambiente ausentes. Informe SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY).");
  process.exit(1);
}

const planSlug = process.argv[2] || "basico";
const billingEmail = `checkout-test+${Date.now()}@insightfy.com.br`;

const payload = {
  planSlug,
  billingName: "Teste Stripe Checkout",
  billingEmail,
  billingCpfCnpj: "24971563792",
  billingPhone: "(47) 99988-7766",
  billingAddress: {
    postalCode: "01310-100",
    street: "Avenida Paulista",
    addressNumber: "1000",
    addressComplement: "Conjunto 101",
    province: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
};

async function main() {
  console.log("🚀 Testando Stripe Checkout");
  console.log("Plan slug:", planSlug);
  console.log("Supabase URL:", supabaseUrl);
  console.log("Email de teste:", billingEmail);
  console.log("");

  const response = await fetch(`${supabaseUrl}/functions/v1/create-stripe-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "x-application-name": "stripe-checkout-test-script",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: any;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("❌ Falha ao parsear resposta:", text);
    throw error;
  }

  console.log("📥 Status:", response.status, response.statusText);
  console.log("📦 Corpo:", JSON.stringify(json, null, 2));

  if (!response.ok || !json?.success) {
    console.error("❌ Erro ao criar sessão de checkout.");
    process.exit(1);
  }

  console.log("");
  console.log("✅ Sessão criada com sucesso!");
  console.log("🔗 URL do Checkout:", json.checkoutUrl);
  console.log("🏢 Organização:", json.organizationId);
  console.log("🪪 Assinatura:", json.subscriptionId);
  console.log("🧾 Session ID:", json.stripeCheckoutSessionId);
  console.log("");
  console.log("Abra a URL acima em um navegador autenticado na Stripe (modo teste) para finalizar o pagamento.");
}

main().catch((error) => {
  console.error("❌ Erro inesperado:", error);
  process.exit(1);
});
