import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkSubscriptions() {
  console.log('🔍 Verificando assinaturas criadas...\n');
  
  const { data: subscriptions, error } = await supabase
    .from('organization_subscriptions')
    .select(`
      id,
      organization_id,
      plan_id,
      status,
      asaas_subscription_id,
      asaas_customer_id,
      created_at,
      subscription_plans!inner(name, slug, price)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ Nenhuma assinatura encontrada');
    return;
  }

  subscriptions.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.subscription_plans?.name} (${sub.subscription_plans?.slug})`);
    console.log(`   📋 ID: ${sub.id}`);
    console.log(`   📦 Org ID: ${sub.organization_id}`);
    console.log(`   📊 Status: ${sub.status}`);
    console.log(`   💰 Preço: R$ ${sub.subscription_plans?.price}`);
    console.log(`   💳 Asaas Sub: ${sub.asaas_subscription_id}`);
    console.log(`   👤 Asaas Customer: ${sub.asaas_customer_id}`);
    console.log(`   📅 Criado em: ${new Date(sub.created_at).toLocaleString('pt-BR')}`);
    console.log('');
  });

  console.log(`✅ Total de assinaturas encontradas: ${subscriptions.length}`);
}

checkSubscriptions().catch(console.error);