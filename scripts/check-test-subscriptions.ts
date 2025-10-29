import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) antes de executar.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscriptions() {
  console.log('🔍 Verificando últimas assinaturas...\n');

  const { data: subscriptions, error } = await supabase
    .from('organization_subscriptions')
    .select(`
      id,
      organization_id,
      plan_id,
      status,
      stripe_subscription_id,
      stripe_customer_id,
      stripe_checkout_session_id,
      stripe_invoice_id,
      created_at,
      updated_at,
      subscription_plans!inner(name, slug, price)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erro na consulta:', error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('ℹ️ Nenhuma assinatura encontrada.');
    return;
  }

  subscriptions.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.subscription_plans?.name} (${sub.subscription_plans?.slug})`);
    console.log(`   📋 ID: ${sub.id}`);
    console.log(`   🏢 Organização: ${sub.organization_id}`);
    console.log(`   📊 Status: ${sub.status}`);
    console.log(`   💰 Preço: R$ ${sub.subscription_plans?.price}`);
    console.log(`   💳 Stripe Subscription: ${sub.stripe_subscription_id || '—'}`);
    console.log(`   👤 Stripe Customer: ${sub.stripe_customer_id || '—'}`);
    console.log(`   🧾 Última Invoice: ${sub.stripe_invoice_id || '—'}`);
    console.log(`   🪪 Checkout Session: ${sub.stripe_checkout_session_id || '—'}`);
    console.log(`   🕒 Criado em: ${new Date(sub.created_at).toLocaleString('pt-BR')}`);
    console.log(`   🔄 Atualizado em: ${new Date(sub.updated_at).toLocaleString('pt-BR')}`);
    console.log('');
  });

  console.log(`✅ Total exibido: ${subscriptions.length}`);
}

checkSubscriptions().catch((error) => {
  console.error('❌ Erro inesperado:', error);
  process.exit(1);
});
