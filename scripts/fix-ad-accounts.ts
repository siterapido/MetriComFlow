import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kyysmixnhdqrxynxjbwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODU4NDMsImV4cCI6MjA3OTM2MTg0M30.wjYCzJAZyW71CjgcJKlu6ZPCwyIJZSETvBeHNJ1WxG0'
);

async function fixAccounts() {
  console.log('=== DIAGNÓSTICO E CORREÇÃO DE CONTAS ===\n');

  // 1. Verificar contas existentes (com campos corretos)
  const { data: accounts, error: accError } = await supabase
    .from('ad_accounts')
    .select('*');

  if (accError) {
    console.error('Erro ao buscar contas:', accError);
    return;
  }

  console.log(`Total de contas encontradas: ${accounts?.length || 0}\n`);

  if (accounts && accounts.length > 0) {
    console.log('CONTAS EXISTENTES:');
    accounts.forEach((acc: any, i: number) => {
      console.log(`\n${i + 1}. ${acc.business_name}`);
      console.log(`   External ID: ${acc.external_id}`);
      console.log(`   Organization ID: ${acc.organization_id}`);
      console.log(`   Ativa: ${acc.is_active}`);
      console.log(`   Provider: ${acc.provider}`);
    });

    console.log('\n\n=== AÇÃO: LIMPANDO CONTAS ANTIGAS ===\n');

    // Deletar todas as contas antigas
    const { error: deleteError } = await supabase
      .from('ad_accounts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (deleteError) {
      console.error('Erro ao deletar contas antigas:', deleteError);
    } else {
      console.log('✅ Todas as contas antigas foram removidas com sucesso!');
    }
  } else {
    console.log('✅ Não há contas antigas para remover.');
  }

  // 2. Verificar campanhas órfãs
  const { data: campaigns, error: campError } = await supabase
    .from('ad_campaigns')
    .select('*');

  if (!campError && campaigns && campaigns.length > 0) {
    console.log(`\n\n=== REMOVENDO ${campaigns.length} CAMPANHAS ÓRFÃS ===\n`);

    const { error: delCampError } = await supabase
      .from('ad_campaigns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delCampError) {
      console.error('Erro ao deletar campanhas:', delCampError);
    } else {
      console.log('✅ Campanhas removidas com sucesso!');
    }
  }

  // 3. Verificar insights órfãos
  const { data: insights, error: insError } = await supabase
    .from('campaign_daily_insights')
    .select('id');

  if (!insError && insights && insights.length > 0) {
    console.log(`\n\n=== REMOVENDO ${insights.length} INSIGHTS ÓRFÃOS ===\n`);

    const { error: delInsError } = await supabase
      .from('campaign_daily_insights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delInsError) {
      console.error('Erro ao deletar insights:', delInsError);
    } else {
      console.log('✅ Insights removidos com sucesso!');
    }
  }

  // 4. Verificar conexões Meta
  const { data: metaConns, error: metaError } = await supabase
    .from('meta_business_connections')
    .select('*');

  if (!metaError && metaConns) {
    console.log(`\n\n=== CONEXÕES META ===`);
    console.log(`Total: ${metaConns.length}`);
    metaConns.forEach((conn: any) => {
      console.log(`\n  User: ${conn.user_id}`);
      console.log(`  Meta User: ${conn.meta_user_name}`);
      console.log(`  Ativa: ${conn.is_active}`);
      console.log(`  Token expira: ${conn.token_expires_at || 'Não expira'}`);
    });
  }

  console.log('\n\n=== LIMPEZA CONCLUÍDA ===');
  console.log('✅ Agora você pode conectar suas contas novamente sem conflitos!');
  console.log('\nPróximos passos:');
  console.log('1. Acesse /meta-ads-config');
  console.log('2. Clique em "Conectar Contas"');
  console.log('3. Selecione as contas desejadas');
  console.log('4. Os dados serão sincronizados automaticamente');
}

fixAccounts().catch(console.error);
