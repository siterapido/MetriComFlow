-- ============================================================================
-- Migration: Materialized View para Dashboard de Meta Ads
-- Data: 2025-12-15
-- Descrição: Cria view materializada com métricas pré-calculadas para
--            acelerar queries de dashboard e overview
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MATERIALIZED VIEW: Resumo Mensal de Campanhas
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS meta_campaigns_monthly_summary AS
SELECT
  aa.organization_id,
  aa.id as account_id,
  aa.business_name as account_name,
  c.id as campaign_id,
  c.name as campaign_name,
  c.objective as campaign_objective,
  c.status as campaign_status,
  DATE_TRUNC('month', cdi.date)::date as month,
  COUNT(DISTINCT cdi.date) as days_with_data,

  -- Métricas agregadas
  SUM(cdi.spend) as total_spend,
  SUM(cdi.impressions) as total_impressions,
  SUM(cdi.clicks) as total_clicks,
  SUM(cdi.leads_count) as total_leads,

  -- Métricas derivadas (médias)
  AVG(cdi.cpl) as avg_cpl,
  AVG(cdi.cpm) as avg_cpm,
  AVG(cdi.cpc) as avg_cpc,

  -- CTR calculado
  CASE
    WHEN SUM(cdi.impressions) > 0 THEN
      (SUM(cdi.clicks)::DECIMAL / SUM(cdi.impressions)) * 100
    ELSE 0
  END as ctr,

  -- Métricas de alcance
  AVG(cdi.reach) as avg_reach,
  AVG(cdi.frequency) as avg_frequency,

  -- Timestamps
  MIN(cdi.date) as first_data_date,
  MAX(cdi.date) as last_data_date,
  NOW() as refreshed_at

FROM campaign_daily_insights cdi
INNER JOIN ad_campaigns c ON c.id = cdi.campaign_id
INNER JOIN ad_accounts aa ON aa.id = c.ad_account_id
WHERE cdi.date >= CURRENT_DATE - INTERVAL '12 months'  -- Últimos 12 meses
GROUP BY
  aa.organization_id,
  aa.id,
  aa.business_name,
  c.id,
  c.name,
  c.objective,
  c.status,
  DATE_TRUNC('month', cdi.date);

-- Índice único para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_campaigns_monthly_summary_unique
  ON meta_campaigns_monthly_summary(organization_id, account_id, campaign_id, month);

-- Índices adicionais para queries comuns
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_monthly_org_month
  ON meta_campaigns_monthly_summary(organization_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_monthly_account
  ON meta_campaigns_monthly_summary(account_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_monthly_campaign
  ON meta_campaigns_monthly_summary(campaign_id, month DESC);

-- ============================================================================
-- 2. MATERIALIZED VIEW: Top Criativos (Best Performers)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS meta_top_creatives AS
SELECT
  aa.organization_id,
  a.id as ad_id,
  a.name as ad_name,
  a.creative_type,
  a.image_url,
  a.thumbnail_url,
  s.id as ad_set_id,
  s.name as ad_set_name,
  c.id as campaign_id,
  c.name as campaign_name,

  -- Período analisado (últimos 30 dias)
  MIN(adi.date) as period_start,
  MAX(adi.date) as period_end,

  -- Métricas agregadas
  SUM(adi.spend) as total_spend,
  SUM(adi.impressions) as total_impressions,
  SUM(adi.clicks) as total_clicks,
  SUM(adi.leads_count) as total_leads,

  -- Métricas derivadas
  CASE
    WHEN SUM(adi.leads_count) > 0 THEN
      SUM(adi.spend) / SUM(adi.leads_count)
    ELSE 0
  END as cpl,

  CASE
    WHEN SUM(adi.impressions) > 0 THEN
      (SUM(adi.spend) / SUM(adi.impressions)) * 1000
    ELSE 0
  END as cpm,

  CASE
    WHEN SUM(adi.clicks) > 0 THEN
      SUM(adi.spend) / SUM(adi.clicks)
    ELSE 0
  END as cpc,

  CASE
    WHEN SUM(adi.impressions) > 0 THEN
      (SUM(adi.clicks)::DECIMAL / SUM(adi.impressions)) * 100
    ELSE 0
  END as ctr,

  -- Quality rankings (mais recente)
  (
    SELECT quality_ranking
    FROM ad_daily_insights
    WHERE ad_id = a.id
      AND quality_ranking IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  ) as latest_quality_ranking,

  -- Timestamps
  NOW() as refreshed_at

FROM ad_daily_insights adi
INNER JOIN ads a ON a.id = adi.ad_id
INNER JOIN ad_sets s ON s.id = a.ad_set_id
INNER JOIN ad_campaigns c ON c.id = s.campaign_id
INNER JOIN ad_accounts aa ON aa.id = c.ad_account_id
WHERE adi.date >= CURRENT_DATE - INTERVAL '30 days'  -- Últimos 30 dias
GROUP BY
  aa.organization_id,
  a.id,
  a.name,
  a.creative_type,
  a.image_url,
  a.thumbnail_url,
  s.id,
  s.name,
  c.id,
  c.name
HAVING SUM(adi.spend) > 0;  -- Apenas criativos com gasto

-- Índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_top_creatives_unique
  ON meta_top_creatives(organization_id, ad_id);

-- Índices por performance
CREATE INDEX IF NOT EXISTS idx_meta_top_creatives_leads
  ON meta_top_creatives(organization_id, total_leads DESC);

CREATE INDEX IF NOT EXISTS idx_meta_top_creatives_ctr
  ON meta_top_creatives(organization_id, ctr DESC);

CREATE INDEX IF NOT EXISTS idx_meta_top_creatives_cpl
  ON meta_top_creatives(organization_id, cpl ASC)
  WHERE cpl > 0;

-- ============================================================================
-- 3. FUNÇÃO PARA REFRESH DAS VIEWS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_meta_dashboard_views()
RETURNS TEXT AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INTERVAL;
BEGIN
  start_time := clock_timestamp();

  -- Refresh concorrente (não bloqueia leituras)
  REFRESH MATERIALIZED VIEW CONCURRENTLY meta_campaigns_monthly_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY meta_top_creatives;

  end_time := clock_timestamp();
  duration := end_time - start_time;

  RETURN format('Views atualizadas com sucesso em %s', duration);
EXCEPTION
  WHEN OTHERS THEN
    RETURN format('Erro ao atualizar views: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. COMENTÁRIOS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW meta_campaigns_monthly_summary IS
  'Resumo mensal de performance de campanhas - atualizar 1x/dia via cron';

COMMENT ON MATERIALIZED VIEW meta_top_creatives IS
  'Top criativos dos últimos 30 dias por performance - atualizar 1x/dia';

COMMENT ON FUNCTION refresh_meta_dashboard_views() IS
  'Função para atualizar todas as materialized views do Meta Ads dashboard';

-- ============================================================================
-- 5. GRANTS (para uso via RPC ou Edge Functions)
-- ============================================================================

-- Permitir execução da função de refresh via service role
GRANT EXECUTE ON FUNCTION refresh_meta_dashboard_views() TO service_role;

-- Permitir leitura das views para usuários autenticados
GRANT SELECT ON meta_campaigns_monthly_summary TO authenticated;
GRANT SELECT ON meta_top_creatives TO authenticated;

-- ============================================================================
-- 6. RLS POLICIES (Row Level Security para as views)
-- ============================================================================

-- As materialized views já filtram por organization_id, mas vamos adicionar RLS

ALTER MATERIALIZED VIEW meta_campaigns_monthly_summary OWNER TO postgres;
ALTER MATERIALIZED VIEW meta_top_creatives OWNER TO postgres;

-- Nota: Materialized views não suportam RLS diretamente
-- Alternativa: criar views normais sobre as materialized views com RLS

CREATE OR REPLACE VIEW meta_campaigns_monthly_summary_rls AS
SELECT * FROM meta_campaigns_monthly_summary
WHERE organization_id IN (
  SELECT organization_id
  FROM organization_memberships
  WHERE profile_id = auth.uid()
    AND is_active = TRUE
);

CREATE OR REPLACE VIEW meta_top_creatives_rls AS
SELECT * FROM meta_top_creatives
WHERE organization_id IN (
  SELECT organization_id
  FROM organization_memberships
  WHERE profile_id = auth.uid()
    AND is_active = TRUE
);

-- Habilitar RLS nas views
ALTER VIEW meta_campaigns_monthly_summary_rls OWNER TO postgres;
ALTER VIEW meta_top_creatives_rls OWNER TO postgres;

GRANT SELECT ON meta_campaigns_monthly_summary_rls TO authenticated;
GRANT SELECT ON meta_top_creatives_rls TO authenticated;

COMMIT;

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================

/*
-- 1. Executar refresh manual (primeira vez):
SELECT refresh_meta_dashboard_views();

-- 2. Agendar refresh automático (pg_cron):
SELECT cron.schedule(
  'refresh-meta-dashboard-views',
  '0 4 * * *',  -- 4 AM diariamente
  'SELECT refresh_meta_dashboard_views();'
);

-- 3. Query de exemplo (usar view com RLS):
SELECT *
FROM meta_campaigns_monthly_summary_rls
WHERE month >= '2025-01-01'
ORDER BY month DESC, total_spend DESC;

-- 4. Top 10 criativos por leads:
SELECT
  ad_name,
  campaign_name,
  total_leads,
  cpl,
  ctr,
  latest_quality_ranking
FROM meta_top_creatives_rls
ORDER BY total_leads DESC
LIMIT 10;
*/
