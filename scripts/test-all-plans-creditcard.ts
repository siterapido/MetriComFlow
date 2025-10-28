import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config(); // Load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Asaas Sandbox test card
const TEST_CARD = {
  holderName: 'MARIA SILVA',
  number: '5162306219378829',
  expiryMonth: '12',
  expiryYear: '2028',
  ccv: '318',
};

interface TestResult {
  planSlug: string;
  planName: string;
  planPrice: number;
  success: boolean;
  error?: string;
  organizationId?: string;
  subscriptionId?: string;
  asaasSubscriptionId?: string;
  asaasCustomerId?: string;
  claimToken?: string;
}

async function testPlanCheckout(planSlug: string): Promise<TestResult> {
  const timestamp = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing Plan: ${planSlug.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Get plan details
    console.log('📋 Step 1: Fetching plan details...');
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planSlug}`);
    }

    console.log(`✅ Plan: ${plan.name}`);
    console.log(`   Price: R$ ${plan.price}/mês`);
    console.log(`   Slug: ${plan.slug}\n`);

    // Prepare checkout data
    console.log('📋 Step 2: Preparing checkout data...');
    const checkoutData = {
      planSlug: plan.slug,
      billingName: `Cliente Teste ${plan.name}`,
      billingEmail: `teste-${planSlug}-${timestamp}@metricom.com.br`,
      billingCpfCnpj: '24971563792', // Valid test CPF
      billingPhone: '47999887766',
      billingAddress: {
        postalCode: '01310100',
        street: 'Avenida Paulista',
        addressNumber: '1000',
        addressComplement: `Andar ${planSlug}`,
        province: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      billingType: 'CREDIT_CARD',
      creditCard: TEST_CARD,
    };

    console.log(`✅ Customer: ${checkoutData.billingName}`);
    console.log(`   Email: ${checkoutData.billingEmail}`);
    console.log(`   Payment: CREDIT_CARD 💳\n`);

    // Call Edge Function
    console.log('📋 Step 3: Creating subscription via Edge Function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/create-asaas-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(checkoutData),
    });

    const responseText = await response.text();
    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}: ${responseText}`);
    }

    console.log(`✅ Subscription Created!`);
    console.log(`   Organization ID: ${result.organizationId}`);
    console.log(`   Subscription ID: ${result.subscriptionId}`);
    console.log(`   Asaas Subscription: ${result.asaasSubscriptionId}`);
    console.log(`   Asaas Customer: ${result.asaasCustomerId}`);
    console.log(`   Claim Token: ${result.claimToken}`);
    console.log(`   Next Due Date: ${result.nextDueDate}`);

    return {
      planSlug: plan.slug,
      planName: plan.name,
      planPrice: plan.price,
      success: true,
      organizationId: result.organizationId,
      subscriptionId: result.subscriptionId,
      asaasSubscriptionId: result.asaasSubscriptionId,
      asaasCustomerId: result.asaasCustomerId,
      claimToken: result.claimToken,
    };

  } catch (error: any) {
    console.error(`\n❌ Test Failed: ${error.message || error}\n`);
    return {
      planSlug,
      planName: planSlug,
      planPrice: 0,
      success: false,
      error: error.message || String(error),
    };
  }
}

async function testAllPlans() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🧪 TESTE DE TODOS OS PLANOS - CARTÃO DE CRÉDITO         ║');
  console.log('║   Ambiente: SANDBOX (Asaas Homologação)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const plans = ['basico', 'intermediario', 'pro'];
  const results: TestResult[] = [];

  for (const planSlug of plans) {
    const result = await testPlanCheckout(planSlug);
    results.push(result);

    // Wait 2 seconds between tests to avoid rate limiting
    if (planSlug !== plans[plans.length - 1]) {
      console.log('\n⏳ Aguardando 2 segundos antes do próximo teste...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     📊 RESUMO DOS TESTES                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total de Testes: ${results.length}`);
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}\n`);

  console.log('┌────────────────┬─────────────┬──────────┬─────────────────────────────┐');
  console.log('│ Plano          │ Preço       │ Status   │ Asaas Subscription ID       │');
  console.log('├────────────────┼─────────────┼──────────┼─────────────────────────────┤');

  results.forEach(result => {
    const planName = result.planName.padEnd(14);
    const price = `R$ ${result.planPrice.toFixed(2)}`.padEnd(11);
    const status = result.success ? '✅ OK    ' : '❌ FALHA ';
    const subId = result.asaasSubscriptionId || result.error?.substring(0, 27) || '-';

    console.log(`│ ${planName} │ ${price} │ ${status} │ ${subId.padEnd(27)} │`);
  });

  console.log('└────────────────┴─────────────┴──────────┴─────────────────────────────┘\n');

  // Print details for successful tests
  const successfulTests = results.filter(r => r.success);
  if (successfulTests.length > 0) {
    console.log('🎉 DETALHES DAS ASSINATURAS CRIADAS:\n');
    successfulTests.forEach((result, index) => {
      console.log(`${index + 1}. ${result.planName} (${result.planSlug})`);
      console.log(`   📦 Organization ID: ${result.organizationId}`);
      console.log(`   📋 Subscription ID: ${result.subscriptionId}`);
      console.log(`   💳 Asaas Subscription: ${result.asaasSubscriptionId}`);
      console.log(`   👤 Asaas Customer: ${result.asaasCustomerId}`);
      console.log(`   🔑 Claim Token: ${result.claimToken}`);
      console.log(`   🔗 Finalization URL:`);
      console.log(`      /finalizar-cadastro?org=${result.organizationId}&sub=${result.subscriptionId}&claim=${result.claimToken}\n`);
    });
  }

  // Print details for failed tests
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('❌ ERROS ENCONTRADOS:\n');
    failedTests.forEach((result, index) => {
      console.log(`${index + 1}. ${result.planSlug}`);
      console.log(`   Erro: ${result.error}\n`);
    });
  }

  // Print next steps
  console.log('📝 PRÓXIMOS PASSOS:\n');
  console.log('1. Verifique as assinaturas no painel Asaas Sandbox:');
  console.log('   https://sandbox.asaas.com/subscriptions\n');
  console.log('2. Verifique os customers criados:');
  console.log('   https://sandbox.asaas.com/customers\n');
  console.log('3. Configure o webhook para receber eventos de pagamento:');
  console.log('   URL: https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/asaas-webhook\n');
  console.log('4. Aguarde os webhooks de PAYMENT_CREATED e PAYMENT_CONFIRMED\n');

  // Exit with error if any test failed
  if (failCount > 0) {
    console.error('⚠️  Alguns testes falharam. Verifique os erros acima.\n');
    process.exit(1);
  }

  console.log('✅ Todos os testes passaram com sucesso!\n');
}

testAllPlans();
