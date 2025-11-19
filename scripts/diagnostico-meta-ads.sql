-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO - Meta Ads Data
-- ============================================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- para verificar o estado atual das tabelas e dados

-- 1. VERIFICAR SE TABELAS EXISTEM
-- ============================================================================
SELECT
  'Tabelas existentes' as secao,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as total_colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('ad_sets', 'ads', 'ad_set_daily_insights', 'ad_daily_insights')
ORDER BY table_name;

-- 2. VERIFICAR CONTAGEM DE REGISTROS
-- ============================================================================
SELECT 'Contagem de Registros' as secao;

SELECT 'ad_campaigns' as tabela, COUNT(*) as total FROM ad_campaigns
UNION ALL
SELECT 'ad_sets' as tabela, COUNT(*) as total FROM ad_sets
UNION ALL
SELECT 'ads' as tabela, COUNT(*) as total FROM ads
UNION ALL
SELECT 'ad_set_daily_insights' as tabela, COUNT(*) as total FROM ad_set_daily_insights
UNION ALL
SELECT 'ad_daily_insights' as tabela, COUNT(*) as total FROM ad_daily_insights
ORDER BY tabela;

-- 3. VERIFICAR DISTRIBUIÇÃO DE DADOS POR ORGANIZAÇÃO
-- ============================================================================
SELECT
  'Distribuição por Organização' as secao,
  o.name as organizacao,
  COUNT(DISTINCT aa.id) as contas_ad,
  COUNT(DISTINCT c.id) as campanhas,
  COUNT(DISTINCT s.id) as ad_sets,
  COUNT(DISTINCT a.id) as ads
FROM organizations o
LEFT JOIN ad_accounts aa ON aa.organization_id = o.id
LEFT JOIN ad_campaigns c ON c.ad_account_id = aa.id
LEFT JOIN ad_sets s ON s.campaign_id = c.id
LEFT JOIN ads a ON a.ad_set_id = s.id
GROUP BY o.id, o.name
ORDER BY campanhas DESC;

-- 4. VERIFICAR ÚLTIMAS SINCRONIZAÇÕES (MÉTRICAS)
-- ============================================================================
SELECT 'Última Sincronização - Ad Sets' as secao;

SELECT
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente,
  COUNT(DISTINCT ad_set_id) as total_ad_sets_com_metricas,
  COUNT(DISTINCT date) as total_dias_com_dados,
  SUM(spend) as gasto_total,
  SUM(leads_count) as leads_totais
FROM ad_set_daily_insights;

SELECT 'Última Sincronização - Ads' as secao;

SELECT
  MIN(date) as data_mais_antiga,
  MAX(date) as data_mais_recente,
  COUNT(DISTINCT ad_id) as total_ads_com_metricas,
  COUNT(DISTINCT date) as total_dias_com_dados,
  SUM(spend) as gasto_total,
  SUM(leads_count) as leads_totais
FROM ad_daily_insights;

-- 5. VERIFICAR FUNÇÕES RPC
-- ============================================================================
SELECT
  'Funções RPC Disponíveis' as secao,
  routine_name as funcao,
  routine_type as tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_ad_set_metrics', 'get_ad_metrics')
ORDER BY routine_name;

-- 6. VERIFICAR ÍNDICES
-- ============================================================================
SELECT
  'Índices nas Tabelas' as secao,
  tablename as tabela,
  indexname as indice,
  indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_sets', 'ads', 'ad_set_daily_insights', 'ad_daily_insights')
ORDER BY tablename, indexname;

-- 7. VERIFICAR QUALITY RANKINGS (Ads)
-- ============================================================================
SELECT
  'Quality Rankings - Distribuição' as secao,
  quality_ranking,
  COUNT(*) as total_ads
FROM ad_daily_insights
WHERE quality_ranking IS NOT NULL
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY quality_ranking
ORDER BY total_ads DESC;

-- 8. VERIFICAR CRIATIVOS COM THUMBNAIL
-- ============================================================================
SELECT
  'Criativos com Thumbnail/Imagem' as secao,
  COUNT(*) as total_ads,
  COUNT(image_url) as com_image_url,
  COUNT(thumbnail_url) as com_thumbnail_url,
  COUNT(video_url) as com_video_url,
  ROUND(100.0 * COUNT(image_url) / NULLIF(COUNT(*), 0), 2) as percentual_com_imagem
FROM ads;

-- 9. RESUMO DE AÇÕES NECESSÁRIAS
-- ============================================================================
SELECT 'RESUMO E RECOMENDAÇÕES' as secao;

DO $$
DECLARE
  ad_sets_count INT;
  ads_count INT;
  adset_insights_count INT;
  ad_insights_count INT;
BEGIN
  SELECT COUNT(*) INTO ad_sets_count FROM ad_sets;
  SELECT COUNT(*) INTO ads_count FROM ads;
  SELECT COUNT(*) INTO adset_insights_count FROM ad_set_daily_insights;
  SELECT COUNT(*) INTO ad_insights_count FROM ad_daily_insights;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNÓSTICO COMPLETO';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Ad Sets: %', ad_sets_count;
  RAISE NOTICE 'Ads: %', ads_count;
  RAISE NOTICE 'Métricas Ad Sets: %', adset_insights_count;
  RAISE NOTICE 'Métricas Ads: %', ad_insights_count;
  RAISE NOTICE '============================================';

  IF ad_sets_count = 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Sincronizar Ad Sets (sync-ad-sets)';
  END IF;

  IF ads_count = 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Sincronizar Ads (sync-ads)';
  END IF;

  IF adset_insights_count = 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Sincronizar métricas de Ad Sets (sync-adset-insights)';
  END IF;

  IF ad_insights_count = 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Sincronizar métricas de Ads (sync-ad-insights)';
  END IF;

  IF ad_sets_count > 0 AND ads_count > 0 AND adset_insights_count > 0 AND ad_insights_count > 0 THEN
    RAISE NOTICE '✅ Todas as tabelas têm dados! Sistema pronto para uso.';
  END IF;
END $$;
