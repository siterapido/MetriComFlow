/**
 * Script de Teste - Asaas Subscription Integration
 *
 * Este script testa a criação de uma assinatura no Asaas
 *
 * Para executar:
 * npx tsx scripts/test-asaas-subscription.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  console.error('   Certifique-se que o arquivo .env existe com:');
  console.error('   - VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Configuração:');
console.log(`   Supabase URL: ${SUPABASE_URL}`);
console.log(`   Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Faltando'}`);
console.log('');

// Use service role for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testAsaasSubscription() {
  console.log('🚀 Iniciando teste de criação de assinatura Asaas...\n');

  try {
    // 1. Get a test organization
    console.log('1️⃣ Buscando organização de teste...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (orgError || !org) {
      throw new Error('Nenhuma organização encontrada. Crie uma organização primeiro.');
    }

    console.log(`   ✅ Organização encontrada: ${org.name} (${org.id})`);

    // 2. Get the "Básico" plan
    console.log('\n2️⃣ Buscando plano Básico...');
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'basico')
      .single();

    if (planError || !plan) {
      throw new Error('Plano Básico não encontrado.');
    }

    console.log(`   ✅ Plano encontrado: ${plan.name} - R$ ${plan.price}/mês`);

    // 3. Create a test subscription
    console.log('\n3️⃣ Criando assinatura de teste no Supabase...');
    const { data: subscription, error: subError } = await supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: org.id,
        plan_id: plan.id,
        status: 'trial',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (subError || !subscription) {
      throw new Error(`Erro ao criar assinatura: ${subError?.message}`);
    }

    console.log(`   ✅ Assinatura criada: ${subscription.id}`);

    // 4. Call Edge Function to create Asaas subscription
    console.log('\n4️⃣ Chamando Edge Function para criar assinatura no Asaas...');

    const payload = {
      subscriptionId: subscription.id,
      planSlug: 'basico',
      billingName: 'Teste Asaas',
      billingEmail: 'teste@metricom.com.br',
      billingCpfCnpj: '12345678901', // CPF de teste
      billingPhone: '11999999999',
      billingAddress: {
        postalCode: '01310-100',
        addressNumber: '123',
        addressComplement: 'Apto 45',
      },
      billingType: 'BOLETO', // Usar boleto para teste (não cobra cartão de verdade)
    };

    console.log('   📤 Payload:', JSON.stringify(payload, null, 2));

    const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke(
      'create-asaas-subscription',
      {
        body: payload,
      }
    );

    if (edgeFunctionError) {
      console.error('   ❌ Erro na Edge Function:', edgeFunctionError);
      throw edgeFunctionError;
    }

    console.log('\n   ✅ Resposta da Edge Function:');
    console.log(JSON.stringify(edgeFunctionResponse, null, 2));

    // 5. Verify subscription was updated
    console.log('\n5️⃣ Verificando se assinatura foi atualizada...');
    const { data: updatedSub, error: updateError } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('id', subscription.id)
      .single();

    if (updateError || !updatedSub) {
      throw new Error('Erro ao buscar assinatura atualizada');
    }

    console.log(`   ✅ Status da assinatura: ${updatedSub.status}`);
    console.log(`   ✅ Asaas Subscription ID: ${updatedSub.asaas_subscription_id || 'N/A'}`);
    console.log(`   ✅ Asaas Customer ID: ${updatedSub.asaas_customer_id || 'N/A'}`);
    console.log(`   ✅ Payment Gateway: ${updatedSub.payment_gateway || 'N/A'}`);

    // 6. Check if payment was created
    console.log('\n6️⃣ Verificando se pagamento foi criado...');
    const { data: payments, error: paymentsError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscription.id);

    if (paymentsError) {
      console.warn('   ⚠️  Erro ao buscar pagamentos:', paymentsError.message);
    } else if (payments && payments.length > 0) {
      console.log(`   ✅ ${payments.length} pagamento(s) encontrado(s):`);
      payments.forEach((p, i) => {
        console.log(`      ${i + 1}. Status: ${p.status}, Valor: R$ ${p.amount}, Vencimento: ${p.due_date}`);
      });
    } else {
      console.log('   ℹ️  Nenhum pagamento registrado ainda (webhook pode demorar alguns segundos)');
    }

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO! 🎉\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Acesse o painel do Asaas para verificar a assinatura criada');
    console.log('   2. Monitore os webhooks em: npx supabase functions logs asaas-webhook');
    console.log('   3. Verifique a tabela subscription_payments após alguns segundos\n');

    // Cleanup (opcional - comentado para você ver os dados no banco)
    // console.log('🧹 Limpando dados de teste...');
    // await supabase.from('organization_subscriptions').delete().eq('id', subscription.id);
    // console.log('   ✅ Dados de teste removidos');

  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:', error.message || error);
    console.error('\n📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute test
testAsaasSubscription();
