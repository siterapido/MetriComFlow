import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPlanoTeste() {
  console.log('🧪 Teste do Plano TESTE - R$ 5,00');
  console.log('=' .repeat(60));
  console.log('');

  try {
    const timestamp = Date.now();

    // Get Teste plan (R$ 5,00)
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'teste')
      .single();

    if (planError) throw planError;

    console.log(`📦 Plano: ${plan.name}`);
    console.log(`💰 Preço: R$ ${plan.price}`);
    console.log(`📅 Período: ${plan.billing_period}`);
    console.log('');

    // Create subscription with credit card
    const checkoutData = {
      planSlug: plan.slug,
      billingName: 'Cliente Teste R$ 5',
      billingEmail: `teste-5reais-${timestamp}@metricom.com.br`,
      billingCpfCnpj: '24971563792',
      billingPhone: '47999887766',
      billingAddress: {
        postalCode: '01310100',
        street: 'Avenida Paulista',
        addressNumber: '1000',
        addressComplement: '',
        province: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      billingType: 'CREDIT_CARD',
      creditCard: {
        holderName: 'MARIA SILVA',
        number: '5162306219378829',
        expiryMonth: '12',
        expiryYear: '2028',
        ccv: '318',
      },
    };

    console.log('🔄 Criando assinatura de R$ 5,00 com cartão de crédito...');
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
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid response: ${responseText}`);
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    console.log('✅ Assinatura criada!');
    console.log('');
    console.log('📊 Resultado:');
    console.log(`   💰 Valor: R$ ${plan.price}`);
    console.log(`   💳 Asaas Subscription ID: ${result.asaasSubscriptionId}`);
    console.log(`   👤 Asaas Customer ID: ${result.asaasCustomerId}`);
    console.log(`   🏢 Organization ID: ${result.organizationId}`);
    console.log(`   📋 Subscription ID: ${result.subscriptionId}`);
    console.log(`   🔑 Claim Token: ${result.claimToken}`);
    console.log(`   📅 Next Due Date: ${result.nextDueDate}`);
    console.log('');
    console.log('🎉 TESTE DE R$ 5,00 CONCLUÍDO COM SUCESSO!');
    console.log('');
    console.log('🔗 Verificar no Asaas Sandbox:');
    console.log(`   https://sandbox.asaas.com/subscriptions/${result.asaasSubscriptionId}`);
    console.log('');
    console.log('🔗 Finalization URL:');
    console.log(`   /finalizar-cadastro?org=${result.organizationId}&sub=${result.subscriptionId}&claim=${result.claimToken}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Erro:', error.message || error);
    process.exit(1);
  }
}

testPlanoTeste();
