-- ============================================================================
-- Script de Verificação: O que está aplicado em Produção?
-- ============================================================================
-- Execute este script no SQL Editor do Supabase para verificar
-- quais otimizações já estão aplicadas e o que ainda falta

-- ============================================================================
-- 1. VERIFICAR ÍNDICES COMPOSTOS
-- ============================================================================
SELECT '1️⃣ ÍNDICES COMPOSTOS' as verificacao;

SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Índices compostos criados (' || COUNT(*) || ' encontrados)'
    ELSE '❌ FALTAM índices compostos (encontrados: ' || COUNT(*) || ')'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
  AND indexname LIKE '%composite%';

-- Listar índices compostos
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
  AND indexname LIKE '%composite%'
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR MATERIALIZED VIEWS
-- ============================================================================
SELECT '2️⃣ MATERIALIZED VIEWS' as verificacao;

SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Materialized views criadas (' || COUNT(*) || ' encontradas)'
    ELSE '❌ FALTAM materialized views (encontradas: ' || COUNT(*) || ')'
  END as status
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE 'meta_%';

-- Listar views
SELECT
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as tamanho,
  last_refresh
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname LIKE 'meta_%';

-- ============================================================================
-- 3. VERIFICAR FUNÇÕES RPC
-- ============================================================================
SELECT '3️⃣ FUNÇÕES RPC' as verificacao;

SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Funções RPC existem (' || COUNT(*) || ' encontradas)'
    ELSE '❌ FALTAM funções RPC (encontradas: ' || COUNT(*) || ')'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name = 'refresh_meta_dashboard_views'
    OR routine_name = 'invoke_edge_function'
    OR routine_name = 'invoke_edge_function_with_log'
  );

-- Listar funções
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%meta%'
ORDER BY routine_name;

-- ============================================================================
-- 4. VERIFICAR CRON JOBS
-- ============================================================================
SELECT '4️⃣ CRON JOBS' as verificacao;

SELECT
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ Cron jobs configurados (' || COUNT(*) || ' ativos)'
    WHEN COUNT(*) > 0 THEN '⚠️ Alguns cron jobs configurados (' || COUNT(*) || ' de 5)'
    ELSE '❌ FALTAM cron jobs (0 configurados)'
  END as status
FROM cron.job
WHERE jobname LIKE 'sync-%' OR jobname LIKE 'refresh-%';

-- Listar cron jobs
SELECT
  jobid,
  jobname,
  schedule,
  active,
  CASE
    WHEN active THEN '🟢 Ativo'
    ELSE '🔴 Inativo'
  END as status_visual
FROM cron.job
WHERE jobname LIKE 'sync-%' OR jobname LIKE 'refresh-%'
ORDER BY jobname;

-- ============================================================================
-- 5. VERIFICAR VARIÁVEIS DE AMBIENTE
-- ============================================================================
SELECT '5️⃣ VARIÁVEIS DE AMBIENTE' as verificacao;

DO $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.supabase_service_role_key', true);

    IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      RAISE NOTICE '✅ Variáveis de ambiente configuradas';
      RAISE NOTICE '   - app.supabase_url: %', supabase_url;
      RAISE NOTICE '   - app.supabase_service_role_key: %',
        CASE
          WHEN length(service_role_key) > 20 THEN substring(service_role_key from 1 for 20) || '...'
          ELSE service_role_key
        END;
    ELSIF supabase_url IS NOT NULL THEN
      RAISE NOTICE '⚠️ Apenas app.supabase_url configurada';
      RAISE NOTICE '❌ FALTA: app.supabase_service_role_key';
    ELSIF service_role_key IS NOT NULL THEN
      RAISE NOTICE '⚠️ Apenas app.supabase_service_role_key configurada';
      RAISE NOTICE '❌ FALTA: app.supabase_url';
    ELSE
      RAISE NOTICE '❌ FALTAM variáveis de ambiente';
      RAISE NOTICE '   Configure via: ALTER DATABASE postgres SET app.supabase_url = ''...''';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Erro ao verificar variáveis: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- 6. VERIFICAR DADOS SINCRONIZADOS
-- ============================================================================
SELECT '6️⃣ DADOS SINCRONIZADOS' as verificacao;

-- Contagem de registros
SELECT
  'ad_sets' as tabela,
  COUNT(*) as total,
  CASE
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '❌ FALTA SINCRONIZAR'
  END as status
FROM ad_sets
UNION ALL
SELECT
  'ads',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌ FALTA SINCRONIZAR' END
FROM ads
UNION ALL
SELECT
  'ad_set_daily_insights',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌ FALTA SINCRONIZAR' END
FROM ad_set_daily_insights
UNION ALL
SELECT
  'ad_daily_insights',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌ FALTA SINCRONIZAR' END
FROM ad_daily_insights;

-- Últimas sincronizações
SELECT
  'Última sincronização de insights' as info,
  MAX(date) as data_mais_recente,
  COUNT(DISTINCT date) as dias_com_dados,
  CURRENT_DATE - MAX(date) as dias_atras
FROM ad_daily_insights;

-- ============================================================================
-- 7. VERIFICAR LOGS DE SINCRONIZAÇÃO
-- ============================================================================
SELECT '7️⃣ LOGS DE SINCRONIZAÇÃO' as verificacao;

SELECT
  CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_sync_logs')
    THEN '✅ Tabela meta_sync_logs existe'
    ELSE '❌ Tabela meta_sync_logs NÃO existe'
  END as status;

-- Se a tabela existe, mostrar últimos logs
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_sync_logs') THEN
    RAISE NOTICE '📊 Últimos 5 logs de sincronização:';
    -- Query será executada separadamente abaixo
  END IF;
END $$;

-- Últimos logs (se existir)
SELECT
  job_name,
  status,
  started_at,
  completed_at - started_at as duracao,
  records_synced
FROM meta_sync_logs
ORDER BY started_at DESC
LIMIT 5;

-- ============================================================================
-- 8. TESTE DE PERFORMANCE
-- ============================================================================
SELECT '8️⃣ TESTE DE PERFORMANCE' as verificacao;

EXPLAIN ANALYZE
SELECT
  ad_set_id,
  SUM(spend) as total_spend,
  SUM(leads_count) as total_leads
FROM ad_set_daily_insights
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ad_set_id
ORDER BY total_spend DESC
LIMIT 10;

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================
SELECT '═══════════════════════════════════════════════' as linha;
SELECT '📋 RESUMO DO STATUS DE PRODUÇÃO' as titulo;
SELECT '═══════════════════════════════════════════════' as linha;

DO $$
DECLARE
  indices_ok BOOLEAN;
  views_ok BOOLEAN;
  funcs_ok BOOLEAN;
  crons_ok BOOLEAN;
  vars_ok BOOLEAN;
  dados_ok BOOLEAN;
  total_ok INT := 0;
BEGIN
  -- Verificar cada item
  SELECT COUNT(*) >= 2 INTO indices_ok FROM pg_indexes WHERE tablename IN ('ad_set_daily_insights', 'ad_daily_insights') AND indexname LIKE '%composite%';
  SELECT COUNT(*) >= 2 INTO views_ok FROM pg_matviews WHERE schemaname = 'public' AND matviewname LIKE 'meta_%';
  SELECT COUNT(*) >= 2 INTO funcs_ok FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%meta%';
  SELECT COUNT(*) >= 4 INTO crons_ok FROM cron.job WHERE jobname LIKE 'sync-%';

  BEGIN
    vars_ok := current_setting('app.supabase_url', true) IS NOT NULL
           AND current_setting('app.supabase_service_role_key', true) IS NOT NULL;
  EXCEPTION
    WHEN OTHERS THEN vars_ok := FALSE;
  END;

  SELECT COUNT(*) > 0 INTO dados_ok FROM ad_sets;

  -- Contar sucessos
  IF indices_ok THEN total_ok := total_ok + 1; END IF;
  IF views_ok THEN total_ok := total_ok + 1; END IF;
  IF funcs_ok THEN total_ok := total_ok + 1; END IF;
  IF crons_ok THEN total_ok := total_ok + 1; END IF;
  IF vars_ok THEN total_ok := total_ok + 1; END IF;
  IF dados_ok THEN total_ok := total_ok + 1; END IF;

  -- Resultado
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║  STATUS GERAL: % de 6 itens completos        ║', total_ok;
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '% Índices compostos', CASE WHEN indices_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '% Materialized views', CASE WHEN views_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '% Funções RPC', CASE WHEN funcs_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '% Cron jobs', CASE WHEN crons_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '% Variáveis de ambiente', CASE WHEN vars_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '% Dados sincronizados', CASE WHEN dados_ok THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';

  IF total_ok = 6 THEN
    RAISE NOTICE '🎉 TUDO CONFIGURADO! Sistema pronto para uso.';
  ELSIF total_ok >= 4 THEN
    RAISE NOTICE '⚠️ Quase lá! Faltam % itens.', 6 - total_ok;
    RAISE NOTICE '📖 Ver: PRODUCTION_DEPLOYMENT.md';
  ELSE
    RAISE NOTICE '❌ Várias configurações faltando.';
    RAISE NOTICE '📖 Ver: PRODUCTION_DEPLOYMENT.md';
    RAISE NOTICE '🚀 Aplique as migrations e configure as variáveis.';
  END IF;
END $$;
