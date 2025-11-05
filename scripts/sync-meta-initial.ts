#!/usr/bin/env tsx
/**
 * Script de Sincronização Inicial Completa - Meta Ads
 *
 * Sincroniza TODA a estrutura e métricas do Meta Ads em uma única execução:
 * 1. Campanhas (via connect-ad-account)
 * 2. Ad Sets
 * 3. Ads/Criativos
 * 4. Métricas de Ad Sets (últimos 90 dias)
 * 5. Métricas de Ads (últimos 90 dias)
 *
 * USO:
 *   npx tsx scripts/sync-meta-initial.ts
 *
 * OU com parâmetros customizados:
 *   npx tsx scripts/sync-meta-initial.ts --days=180 --account=<account-id>
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Parse argumentos de linha de comando
const args = process.argv.slice(2);
const daysArg = args.find(arg => arg.startsWith('--days='));
const accountArg = args.find(arg => arg.startsWith('--account='));

const DAYS_TO_SYNC = daysArg ? parseInt(daysArg.split('=')[1]) : 90;
const SPECIFIC_ACCOUNT_ID = accountArg ? accountArg.split('=')[1] : null;

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function syncAllMetaData() {
  console.log('\n🚀 ============================================');
  console.log('   SINCRONIZAÇÃO INICIAL COMPLETA - META ADS');
  console.log('   ============================================\n');
  console.log(`📅 Período: Últimos ${DAYS_TO_SYNC} dias`);

  const startTime = Date.now();
  let totalErrors = 0;

  try {
    // ========================================================================
    // ETAPA 1: Buscar Contas Conectadas
    // ========================================================================
    console.log('\n📊 ETAPA 1/5: Buscando contas Meta conectadas...');

    let accountsQuery = supabase
      .from('ad_accounts')
      .select('id, business_name, external_id, organization_id')
      .eq('is_active', true);

    if (SPECIFIC_ACCOUNT_ID) {
      accountsQuery = accountsQuery.eq('id', SPECIFIC_ACCOUNT_ID);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error('❌ Erro ao buscar contas:', accountsError.message);
      process.exit(1);
    }

    if (!accounts || accounts.length === 0) {
      console.error('❌ Nenhuma conta Meta conectada encontrada.');
      console.error('   Conecte uma conta em /meta-ads-config primeiro.');
      process.exit(1);
    }

    console.log(`✅ Encontradas ${accounts.length} conta(s) Meta ativa(s):`);
    accounts.forEach(acc => {
      console.log(`   - ${acc.business_name || acc.external_id} (ID: ${acc.id})`);
    });

    const accountIds = accounts.map(a => a.id);

    // ========================================================================
    // ETAPA 2: Sincronizar Ad Sets
    // ========================================================================
    console.log('\n📊 ETAPA 2/5: Sincronizando conjuntos de anúncios...');

    try {
      const { data: adSetsResult, error: adSetsError } = await supabase.functions.invoke('sync-ad-sets', {
        body: { ad_account_ids: accountIds },
      });

      if (adSetsError) {
        console.error('⚠️ Erro ao sincronizar ad sets:', adSetsError.message);
        totalErrors++;
      } else {
        const synced = adSetsResult?.synced_ad_sets || 0;
        console.log(`✅ ${synced} conjunto(s) de anúncios sincronizado(s)`);
      }
    } catch (error) {
      console.error('⚠️ Erro na sincronização de ad sets:', error);
      totalErrors++;
    }

    // Aguardar 2 segundos entre requests (rate limiting)
    await sleep(2000);

    // ========================================================================
    // ETAPA 3: Sincronizar Ads/Criativos
    // ========================================================================
    console.log('\n📊 ETAPA 3/5: Sincronizando criativos (ads)...');

    try {
      const { data: adsResult, error: adsError } = await supabase.functions.invoke('sync-ads', {
        body: { ad_account_ids: accountIds },
      });

      if (adsError) {
        console.error('⚠️ Erro ao sincronizar ads:', adsError.message);
        totalErrors++;
      } else {
        const synced = adsResult?.synced_ads || 0;
        console.log(`✅ ${synced} criativo(s) sincronizado(s)`);
      }
    } catch (error) {
      console.error('⚠️ Erro na sincronização de ads:', error);
      totalErrors++;
    }

    await sleep(2000);

    // ========================================================================
    // ETAPA 4: Sincronizar Métricas de Ad Sets
    // ========================================================================
    console.log(`\n📊 ETAPA 4/5: Sincronizando métricas de conjuntos (últimos ${DAYS_TO_SYNC} dias)...`);

    const since = new Date();
    since.setDate(since.getDate() - DAYS_TO_SYNC);
    const until = new Date();

    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];

    console.log(`   Período: ${sinceStr} até ${untilStr}`);

    try {
      const { data: adSetInsightsResult, error: adSetInsightsError } = await supabase.functions.invoke('sync-adset-insights', {
        body: {
          since: sinceStr,
          until: untilStr,
          ad_account_ids: accountIds,
        },
      });

      if (adSetInsightsError) {
        console.error('⚠️ Erro ao sincronizar métricas de ad sets:', adSetInsightsError.message);
        totalErrors++;
      } else {
        console.log('✅ Métricas de conjuntos sincronizadas');
        if (adSetInsightsResult?.synced_records) {
          console.log(`   ${adSetInsightsResult.synced_records} registro(s) de métricas`);
        }
      }
    } catch (error) {
      console.error('⚠️ Erro na sincronização de métricas de ad sets:', error);
      totalErrors++;
    }

    await sleep(2000);

    // ========================================================================
    // ETAPA 5: Sincronizar Métricas de Ads
    // ========================================================================
    console.log(`\n📊 ETAPA 5/5: Sincronizando métricas de criativos (últimos ${DAYS_TO_SYNC} dias)...`);

    try {
      const { data: adInsightsResult, error: adInsightsError } = await supabase.functions.invoke('sync-ad-insights', {
        body: {
          since: sinceStr,
          until: untilStr,
          ad_account_ids: accountIds,
        },
      });

      if (adInsightsError) {
        console.error('⚠️ Erro ao sincronizar métricas de ads:', adInsightsError.message);
        totalErrors++;
      } else {
        console.log('✅ Métricas de criativos sincronizadas');
        if (adInsightsResult?.synced_records) {
          console.log(`   ${adInsightsResult.synced_records} registro(s) de métricas`);
        }
      }
    } catch (error) {
      console.error('⚠️ Erro na sincronização de métricas de ads:', error);
      totalErrors++;
    }

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================
    const duration = Date.now() - startTime;

    console.log('\n============================================');
    if (totalErrors === 0) {
      console.log('🎉 SINCRONIZAÇÃO COMPLETA - 100% SUCESSO');
    } else {
      console.log(`⚠️  SINCRONIZAÇÃO COMPLETA - ${totalErrors} erro(s) encontrado(s)`);
    }
    console.log('============================================');
    console.log(`⏱️  Tempo total: ${formatDuration(duration)}`);
    console.log('');

    // Verificar dados sincronizados
    console.log('📊 Resumo de dados sincronizados:');

    const { count: adSetsCount } = await supabase
      .from('ad_sets')
      .select('*', { count: 'exact', head: true });

    const { count: adsCount } = await supabase
      .from('ads')
      .select('*', { count: 'exact', head: true });

    const { count: adSetInsightsCount } = await supabase
      .from('ad_set_daily_insights')
      .select('*', { count: 'exact', head: true });

    const { count: adInsightsCount } = await supabase
      .from('ad_daily_insights')
      .select('*', { count: 'exact', head: true });

    console.log(`   - Ad Sets: ${adSetsCount || 0}`);
    console.log(`   - Ads/Criativos: ${adsCount || 0}`);
    console.log(`   - Métricas de Ad Sets: ${adSetInsightsCount || 0} registros`);
    console.log(`   - Métricas de Ads: ${adInsightsCount || 0} registros`);
    console.log('');

    if (totalErrors > 0) {
      console.log('⚠️  Verifique os erros acima para mais detalhes.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erro fatal durante a sincronização:', error);
    process.exit(1);
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Meta Ads - Script de Sincronização Inicial Completa      ║');
console.log('╚════════════════════════════════════════════════════════════╝');

syncAllMetaData()
  .then(() => {
    console.log('✅ Script finalizado com sucesso!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });
