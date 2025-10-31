import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fjoaliipjfcnokermkhy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw'
);

async function checkAccounts() {
  console.log('=== VERIFICANDO CONTAS DE ANÚNCIOS ===\n');

  // 1. Verificar contas existentes
  const { data: accounts, error: accError } = await supabase
    .from('ad_accounts')
    .select('*')
    .order('connected_at', { ascending: false });

  if (accError) {
    console.error('Erro ao buscar contas:', accError);
  } else {
    const total = accounts ? accounts.length : 0;
    console.log(`Total de contas: ${total}\n`);
    if (accounts) {
      accounts.forEach((acc: any, i: number) => {
        console.log(`Conta ${i + 1}:`);
        console.log(`  ID: ${acc.id}`);
        console.log(`  External ID: ${acc.external_id}`);
        console.log(`  Nome: ${acc.business_name}`);
        console.log(`  Organização: ${acc.organization_id}`);
        console.log(`  Ativa: ${acc.is_active}`);
        console.log(`  Conectada em: ${acc.connected_at}`);
        console.log(`  Última sync: ${acc.last_synced_at || 'Nunca'}\n`);
      });
    }
  }

  // 2. Verificar campanhas
  const { data: campaigns, error: campError } = await supabase
    .from('ad_campaigns')
    .select('id, external_id, name, ad_account_id, status');

  if (campError) {
    console.error('Erro ao buscar campanhas:', campError);
  } else {
    const totalCampaigns = campaigns ? campaigns.length : 0;
    console.log(`\n=== CAMPANHAS ===`);
    console.log(`Total: ${totalCampaigns}\n`);
  }

  // 3. Verificar insights
  const { data: insights, error: insError } = await supabase
    .from('campaign_daily_insights')
    .select('campaign_id, date, spend, impressions, clicks, leads_count')
    .order('date', { ascending: false })
    .limit(5);

  if (insError) {
    console.error('Erro ao buscar insights:', insError);
  } else {
    const totalInsights = insights ? insights.length : 0;
    console.log(`\n=== INSIGHTS (últimos 5 registros) ===`);
    console.log(`Total de registros: ${totalInsights}`);
    if (insights && insights.length > 0) {
      insights.forEach((ins: any) => {
        console.log(`  Data: ${ins.date} | Gasto: R$ ${ins.spend} | Leads: ${ins.leads_count}`);
      });
    }
  }

  // 4. Verificar organizações
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug');

  if (orgError) {
    console.error('Erro ao buscar organizações:', orgError);
  } else {
    console.log(`\n=== ORGANIZAÇÕES ===`);
    if (orgs) {
      orgs.forEach((org: any) => {
        console.log(`  ${org.name} (${org.id})`);
      });
    }
  }
}

checkAccounts().catch(console.error);
