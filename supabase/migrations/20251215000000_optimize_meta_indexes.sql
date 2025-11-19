-- ============================================================================
-- Migration: Otimização de Índices para Meta Ads
-- Data: 2025-12-15
-- Descrição: Adiciona índices compostos para melhorar performance de queries
--            de agregação em períodos longos
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ÍNDICES COMPOSTOS PARA AD_SET_DAILY_INSIGHTS
-- ============================================================================

-- Índice para queries por ad_set_id + date (mais comum)
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_set_date
  ON ad_set_daily_insights(ad_set_id, date DESC);

-- Índice para queries por campaign + date
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_campaign_date
  ON ad_set_daily_insights(campaign_id, date DESC);

-- Índice composto para aggregations (RPC get_ad_set_metrics)
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_composite
  ON ad_set_daily_insights(ad_set_id, campaign_id, date DESC)
  INCLUDE (spend, impressions, clicks, leads_count);

-- Índice para filtros por período (common range queries)
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_date_range
  ON ad_set_daily_insights(date DESC)
  WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================
-- 2. ÍNDICES COMPOSTOS PARA AD_DAILY_INSIGHTS
-- ============================================================================

-- Índice para queries por ad_id + date
CREATE INDEX IF NOT EXISTS idx_ad_insights_ad_date
  ON ad_daily_insights(ad_id, date DESC);

-- Índice para queries por ad_set + date
CREATE INDEX IF NOT EXISTS idx_ad_insights_adset_date
  ON ad_daily_insights(ad_set_id, date DESC);

-- Índice para queries por campaign + date
CREATE INDEX IF NOT EXISTS idx_ad_insights_campaign_date
  ON ad_daily_insights(campaign_id, date DESC);

-- Índice composto para aggregations (RPC get_ad_metrics)
CREATE INDEX IF NOT EXISTS idx_ad_insights_composite
  ON ad_daily_insights(ad_id, ad_set_id, campaign_id, date DESC)
  INCLUDE (spend, impressions, clicks, leads_count, quality_ranking);

-- Índice para filtros por período
CREATE INDEX IF NOT EXISTS idx_ad_insights_date_range
  ON ad_daily_insights(date DESC)
  WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Índice para queries de quality ranking (análise de qualidade)
CREATE INDEX IF NOT EXISTS idx_ad_insights_quality
  ON ad_daily_insights(quality_ranking, engagement_ranking, conversion_ranking)
  WHERE quality_ranking IS NOT NULL;

-- ============================================================================
-- 3. ÍNDICES PARA TABELAS DE ESTRUTURA
-- ============================================================================

-- Índice GIN para busca em creative_data JSONB (ads)
CREATE INDEX IF NOT EXISTS idx_ads_creative_data_gin
  ON ads USING GIN (creative_data);

-- Índice GIN para busca em targeting JSONB (ad_sets)
CREATE INDEX IF NOT EXISTS idx_ad_sets_targeting_gin
  ON ad_sets USING GIN (targeting);

-- Índice composto para busca de ads ativos
CREATE INDEX IF NOT EXISTS idx_ads_status_type
  ON ads(status, creative_type)
  WHERE status IN ('ACTIVE', 'PAUSED');

-- Índice composto para busca de ad_sets ativos
CREATE INDEX IF NOT EXISTS idx_ad_sets_status_goal
  ON ad_sets(status, optimization_goal)
  WHERE status IN ('ACTIVE', 'PAUSED');

-- ============================================================================
-- 4. ÍNDICES PARA CAMPAIGNS (se ainda não existirem)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON ad_campaigns(status)
  WHERE status IN ('ACTIVE', 'PAUSED');

CREATE INDEX IF NOT EXISTS idx_campaigns_objective
  ON ad_campaigns(objective);

-- ============================================================================
-- 5. STATISTICS UPDATE (para melhor otimização de queries)
-- ============================================================================

-- Atualizar estatísticas das tabelas para melhor query planner
ANALYZE ad_set_daily_insights;
ANALYZE ad_daily_insights;
ANALYZE ad_sets;
ANALYZE ads;
ANALYZE ad_campaigns;

-- ============================================================================
-- 6. COMENTÁRIOS
-- ============================================================================

COMMENT ON INDEX idx_ad_set_insights_composite IS
  'Índice composto otimizado para queries de agregação de métricas de ad sets';

COMMENT ON INDEX idx_ad_insights_composite IS
  'Índice composto otimizado para queries de agregação de métricas de ads';

COMMENT ON INDEX idx_ads_creative_data_gin IS
  'Índice GIN para busca full-text em dados de criativos (JSONB)';

COMMENT ON INDEX idx_ad_sets_targeting_gin IS
  'Índice GIN para busca em dados de targeting (JSONB)';

-- ============================================================================
-- 7. VACUUM ANALYZE (manutenção)
-- ============================================================================

-- Executar VACUUM ANALYZE para liberar espaço e atualizar stats
VACUUM ANALYZE ad_set_daily_insights;
VACUUM ANALYZE ad_daily_insights;
VACUUM ANALYZE ad_sets;
VACUUM ANALYZE ads;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO DOS ÍNDICES CRIADOS
-- ============================================================================

-- Query para verificar todos os índices criados
-- Execute separadamente após a migration:

/*
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights', 'ad_sets', 'ads', 'ad_campaigns')
ORDER BY tablename, indexname;
*/
