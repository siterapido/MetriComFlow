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

async function testImmediatePayment() {
  console.log('🧪 Teste de Pagamento Imediato com Cartão de Crédito');
  console.log('=' .repeat(60));
  console.log('');

  try {
    const timestamp = Date.now();
    const todayFormatted = new Date().toISOString().split('T')[0];

    console.log(`📅 Data Esperada (hoje): ${todayFormatted}`);
    console.log('');

    // Get Básico plan
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'basico')
      .single();

    if (planError) throw planError;

    console.log(`📦 Plano: ${plan.name} (R$ ${plan.price})`);
    console.log('');

    // Create subscription with credit card
    const checkoutData = {
      planSlug: plan.slug,
      billingName: 'Teste Pagamento Imediato',
      billingEmail: `teste-imediato-${timestamp}@metricom.com.br`,
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

    console.log('🔄 Criando assinatura com cartão de crédito...');
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
    console.log(`   Asaas Subscription ID: ${result.asaasSubscriptionId}`);
    console.log(`   Asaas Customer ID: ${result.asaasCustomerId}`);
    console.log(`   📅 Next Due Date: ${result.nextDueDate}`);
    console.log('');

    // Verificar se a data está correta
    if (result.nextDueDate === todayFormatted) {
      console.log('✅ DATA CORRETA! Pagamento será cobrado HOJE (imediato)');
      console.log('');
      console.log('💳 Com cartão de crédito, o Asaas irá:');
      console.log('   1. Processar a cobrança IMEDIATAMENTE');
      console.log('   2. Enviar webhook PAYMENT_CREATED');
      console.log('   3. Enviar webhook PAYMENT_CONFIRMED (se aprovado)');
      console.log('   4. Próxima cobrança: 1 mês após hoje');
    } else {
      console.log(`❌ DATA INCORRETA!`);
      console.log(`   Esperado: ${todayFormatted} (hoje)`);
      console.log(`   Recebido: ${result.nextDueDate}`);
      console.log('');
      console.log('⚠️  A cobrança será agendada para o futuro ao invés de imediata!');
      process.exit(1);
    }

    console.log('');
    console.log('🔗 Verificar no Asaas Sandbox:');
    console.log(`   https://sandbox.asaas.com/subscriptions/${result.asaasSubscriptionId}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Erro:', error.message || error);
    process.exit(1);
  }
}

testImmediatePayment();
