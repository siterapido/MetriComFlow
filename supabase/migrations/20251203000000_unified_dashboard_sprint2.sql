-- ============================================================================
-- Sprint 2: Dashboard Unificado CRM + Meta Ads
-- ============================================================================
-- Objetivo: Criar views e funções para exibir métricas integradas de Meta Ads
-- e CRM, permitindo análise completa de ROI real (investimento → receita).
-- ============================================================================

-- ============================================================================
-- 1. VIEW: unified_dashboard_metrics
-- ============================================================================
-- Métricas unificadas por período com filtros de conta/campanha
-- Combina dados de Meta Ads (investimento, impressões, cliques, leads do Meta)
-- com dados do CRM (leads criados, qualificados, fechados, receita)
-- ============================================================================

CREATE OR REPLACE VIEW public.unified_dashboard_metrics AS
WITH meta_ads_summary AS (
  -- Agregar métricas do Meta Ads por campanha
  SELECT
    c.id as campaign_id,
    c.name as campaign_name,
    c.ad_account_id,
    a.business_name as account_name,
    a.organization_id,
    SUM(i.spend) as total_spend,
    SUM(i.impressions) as total_impressions,
    SUM(i.clicks) as total_clicks,
    SUM(i.leads_count) as meta_leads_count,
    MIN(i.date) as first_insight_date,
    MAX(i.date) as last_insight_date
  FROM public.campaign_daily_insights i
  JOIN public.ad_campaigns c ON c.id = i.campaign_id
  JOIN public.ad_accounts a ON a.id = c.ad_account_id
  WHERE a.is_active = TRUE
  GROUP BY c.id, c.name, c.ad_account_id, a.business_name, a.organization_id
),
crm_leads_summary AS (
  -- Agregar leads do CRM por campanha
  SELECT
    l.campaign_id,
    l.organization_id,
    COUNT(*) FILTER (WHERE l.status = 'novo_lead') as novo_lead_count,
    COUNT(*) FILTER (WHERE l.status = 'qualificacao') as qualificacao_count,
    COUNT(*) FILTER (WHERE l.status = 'proposta') as proposta_count,
    COUNT(*) FILTER (WHERE l.status = 'negociacao') as negociacao_count,
    COUNT(*) FILTER (WHERE l.status = 'fechado_ganho') as fechado_ganho_count,
    COUNT(*) FILTER (WHERE l.status = 'fechado_perdido') as fechado_perdido_count,
    SUM(CASE WHEN l.status = 'fechado_ganho' THEN l.value ELSE 0 END) as total_revenue,
    SUM(CASE WHEN l.status NOT IN ('fechado_ganho', 'fechado_perdido') THEN l.value ELSE 0 END) as pipeline_value,
    COUNT(*) as total_crm_leads
  FROM public.leads l
  WHERE l.campaign_id IS NOT NULL
  GROUP BY l.campaign_id, l.organization_id
)
SELECT
  m.campaign_id,
  m.campaign_name,
  m.ad_account_id,
  m.account_name,
  m.organization_id,
  -- Meta Ads metrics
  COALESCE(m.total_spend, 0) as meta_spend,
  COALESCE(m.total_impressions, 0) as meta_impressions,
  COALESCE(m.total_clicks, 0) as meta_clicks,
  COALESCE(m.meta_leads_count, 0) as meta_leads,
  CASE
    WHEN COALESCE(m.total_impressions, 0) > 0 THEN
      (COALESCE(m.total_clicks, 0)::DECIMAL / COALESCE(m.total_impressions, 0)) * 100
    ELSE 0
  END as ctr,
  CASE
    WHEN COALESCE(m.meta_leads_count, 0) > 0 THEN
      COALESCE(m.total_spend, 0) / COALESCE(m.meta_leads_count, 0)
    ELSE NULL
  END as meta_cpl,
  m.first_insight_date,
  m.last_insight_date,
  -- CRM metrics
  COALESCE(c.novo_lead_count, 0) as crm_novo_lead,
  COALESCE(c.qualificacao_count, 0) as crm_qualificacao,
  COALESCE(c.proposta_count, 0) as crm_proposta,
  COALESCE(c.negociacao_count, 0) as crm_negociacao,
  COALESCE(c.fechado_ganho_count, 0) as crm_fechado_ganho,
  COALESCE(c.fechado_perdido_count, 0) as crm_fechado_perdido,
  COALESCE(c.total_crm_leads, 0) as crm_total_leads,
  COALESCE(c.total_revenue, 0) as crm_revenue,
  COALESCE(c.pipeline_value, 0) as crm_pipeline_value,
  -- Calculated unified metrics
  CASE
    WHEN COALESCE(c.total_crm_leads, 0) > 0 THEN
      COALESCE(m.total_spend, 0) / COALESCE(c.total_crm_leads, 0)
    ELSE NULL
  END as real_cpl, -- Custo por lead REAL (CRM)
  CASE
    WHEN COALESCE(m.total_spend, 0) > 0 THEN
      COALESCE(c.total_revenue, 0) / COALESCE(m.total_spend, 0)
    ELSE NULL
  END as real_roas, -- ROAS REAL (receita CRM / investimento Meta)
  CASE
    WHEN (COALESCE(c.fechado_ganho_count, 0) + COALESCE(c.fechado_perdido_count, 0)) > 0 THEN
      (COALESCE(c.fechado_ganho_count, 0)::DECIMAL / (COALESCE(c.fechado_ganho_count, 0) + COALESCE(c.fechado_perdido_count, 0))) * 100
    ELSE 0
  END as conversion_rate, -- Taxa de conversão real (ganho / total fechado)
  CASE
    WHEN COALESCE(c.fechado_ganho_count, 0) > 0 THEN
      COALESCE(c.total_revenue, 0) / COALESCE(c.fechado_ganho_count, 0)
    ELSE 0
  END as avg_deal_size -- Ticket médio
FROM meta_ads_summary m
LEFT JOIN crm_leads_summary c
  ON c.campaign_id = m.campaign_id
  AND c.organization_id = m.organization_id;
COMMENT ON VIEW public.unified_dashboard_metrics IS
'View unificada que combina métricas do Meta Ads (investimento, impressões, cliques) com métricas do CRM (leads, conversões, receita). Permite análise completa de ROI real por campanha.';
-- Grant permissions
GRANT SELECT ON public.unified_dashboard_metrics TO authenticated;
GRANT SELECT ON public.unified_dashboard_metrics TO service_role;
-- ============================================================================
-- 2. FUNCTION: get_unified_metrics_summary
-- ============================================================================
-- Retorna métricas agregadas do período completo (com filtros opcionais)
-- Útil para exibir KPIs no topo do dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_metrics_summary(
  p_organization_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE(
  -- Meta Ads aggregates
  total_spend NUMERIC,
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_meta_leads BIGINT,
  avg_ctr NUMERIC,
  avg_meta_cpl NUMERIC,
  -- CRM aggregates
  total_crm_leads BIGINT,
  total_qualificados BIGINT,
  total_propostas BIGINT,
  total_negociacoes BIGINT,
  total_fechados_ganho BIGINT,
  total_fechados_perdido BIGINT,
  total_revenue NUMERIC,
  total_pipeline_value NUMERIC,
  -- Unified metrics
  real_cpl NUMERIC,
  real_roas NUMERIC,
  conversion_rate NUMERIC,
  avg_deal_size NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_start_date DATE;
v_end_date DATE;
BEGIN
  -- Default date range: últimos 90 dias
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '90 days');
v_end_date := COALESCE(p_end_date, CURRENT_DATE);
RETURN QUERY
  WITH filtered_insights AS (
    SELECT
      i.spend,
      i.impressions,
      i.clicks,
      i.leads_count,
      c.id as campaign_id,
      c.ad_account_id
    FROM public.campaign_daily_insights i
    JOIN public.ad_campaigns c ON c.id = i.campaign_id
    JOIN public.ad_accounts a ON a.id = c.ad_account_id
    WHERE a.organization_id = p_organization_id
      AND a.is_active = TRUE
      AND i.date >= v_start_date
      AND i.date <= v_end_date
      AND (p_account_id IS NULL OR c.ad_account_id = p_account_id)
      AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
  ),
  filtered_leads AS (
    SELECT
      l.status,
      l.value,
      l.campaign_id
    FROM public.leads l
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= v_start_date
      AND l.created_at <= v_end_date + INTERVAL '1 day'
      AND (p_campaign_id IS NULL OR l.campaign_id = p_campaign_id)
      AND (p_account_id IS NULL OR l.campaign_id IN (
        SELECT c.id FROM public.ad_campaigns c WHERE c.ad_account_id = p_account_id
      ))
  ),
  meta_agg AS (
    SELECT
      SUM(spend) as spend_sum,
      SUM(impressions) as impressions_sum,
      SUM(clicks) as clicks_sum,
      SUM(leads_count) as leads_sum
    FROM filtered_insights
  ),
  crm_agg AS (
    SELECT
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE status = 'qualificacao') as qualificados,
      COUNT(*) FILTER (WHERE status = 'proposta') as propostas,
      COUNT(*) FILTER (WHERE status = 'negociacao') as negociacoes,
      COUNT(*) FILTER (WHERE status = 'fechado_ganho') as fechados_ganho,
      COUNT(*) FILTER (WHERE status = 'fechado_perdido') as fechados_perdido,
      SUM(CASE WHEN status = 'fechado_ganho' THEN value ELSE 0 END) as revenue,
      SUM(CASE WHEN status NOT IN ('fechado_ganho', 'fechado_perdido') THEN value ELSE 0 END) as pipeline
    FROM filtered_leads
  )
  SELECT
    -- Meta Ads
    COALESCE(m.spend_sum, 0)::NUMERIC as total_spend,
    COALESCE(m.impressions_sum, 0)::BIGINT as total_impressions,
    COALESCE(m.clicks_sum, 0)::BIGINT as total_clicks,
    COALESCE(m.leads_sum, 0)::BIGINT as total_meta_leads,
    CASE
      WHEN COALESCE(m.impressions_sum, 0) > 0 THEN
        (COALESCE(m.clicks_sum, 0)::NUMERIC / COALESCE(m.impressions_sum, 0)) * 100
      ELSE 0
    END::NUMERIC as avg_ctr,
    CASE
      WHEN COALESCE(m.leads_sum, 0) > 0 THEN
        COALESCE(m.spend_sum, 0)::NUMERIC / COALESCE(m.leads_sum, 0)
      ELSE NULL
    END::NUMERIC as avg_meta_cpl,
    -- CRM
    COALESCE(c.total_leads, 0)::BIGINT as total_crm_leads,
    COALESCE(c.qualificados, 0)::BIGINT as total_qualificados,
    COALESCE(c.propostas, 0)::BIGINT as total_propostas,
    COALESCE(c.negociacoes, 0)::BIGINT as total_negociacoes,
    COALESCE(c.fechados_ganho, 0)::BIGINT as total_fechados_ganho,
    COALESCE(c.fechados_perdido, 0)::BIGINT as total_fechados_perdido,
    COALESCE(c.revenue, 0)::NUMERIC as total_revenue,
    COALESCE(c.pipeline, 0)::NUMERIC as total_pipeline_value,
    -- Unified metrics
    CASE
      WHEN COALESCE(c.total_leads, 0) > 0 THEN
        COALESCE(m.spend_sum, 0)::NUMERIC / COALESCE(c.total_leads, 0)
      ELSE NULL
    END::NUMERIC as real_cpl,
    CASE
      WHEN COALESCE(m.spend_sum, 0) > 0 THEN
        COALESCE(c.revenue, 0)::NUMERIC / COALESCE(m.spend_sum, 0)
      ELSE NULL
    END::NUMERIC as real_roas,
    CASE
      WHEN (COALESCE(c.fechados_ganho, 0) + COALESCE(c.fechados_perdido, 0)) > 0 THEN
        (COALESCE(c.fechados_ganho, 0)::NUMERIC / (COALESCE(c.fechados_ganho, 0) + COALESCE(c.fechados_perdido, 0))) * 100
      ELSE 0
    END::NUMERIC as conversion_rate,
    CASE
      WHEN COALESCE(c.fechados_ganho, 0) > 0 THEN
        COALESCE(c.revenue, 0)::NUMERIC / COALESCE(c.fechados_ganho, 0)
      ELSE 0
    END::NUMERIC as avg_deal_size
  FROM meta_agg m, crm_agg c;
END;
$;
COMMENT ON FUNCTION public.get_unified_metrics_summary IS
'Retorna métricas agregadas unificadas (Meta Ads + CRM) para o período especificado. Suporta filtros por conta, campanha e intervalo de datas. Calcula CPL real, ROAS real, taxa de conversão e ticket médio.';
-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unified_metrics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_metrics_summary TO service_role;
-- ============================================================================
-- 3. FUNCTION: get_unified_daily_breakdown
-- ============================================================================
-- Retorna breakdown diário de métricas unificadas
-- Útil para gráficos de evolução temporal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_unified_daily_breakdown(
  p_organization_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE(
  date DATE,
  spend NUMERIC,
  impressions BIGINT,
  clicks BIGINT,
  meta_leads BIGINT,
  crm_leads_created BIGINT,
  crm_leads_qualified BIGINT,
  crm_leads_closed_won BIGINT,
  revenue NUMERIC,
  ctr NUMERIC,
  cpl NUMERIC,
  roas NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_start_date DATE;
v_end_date DATE;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
v_end_date := COALESCE(p_end_date, CURRENT_DATE);
RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, v_end_date, '1 day'::INTERVAL)::DATE as day
  ),
  daily_meta AS (
    SELECT
      i.date,
      SUM(i.spend) as spend_sum,
      SUM(i.impressions) as impressions_sum,
      SUM(i.clicks) as clicks_sum,
      SUM(i.leads_count) as leads_sum
    FROM public.campaign_daily_insights i
    JOIN public.ad_campaigns c ON c.id = i.campaign_id
    JOIN public.ad_accounts a ON a.id = c.ad_account_id
    WHERE a.organization_id = p_organization_id
      AND a.is_active = TRUE
      AND i.date >= v_start_date
      AND i.date <= v_end_date
      AND (p_account_id IS NULL OR c.ad_account_id = p_account_id)
      AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
    GROUP BY i.date
  ),
  daily_crm AS (
    SELECT
      l.created_at::DATE as date,
      COUNT(*) as leads_created,
      COUNT(*) FILTER (WHERE l.status = 'qualificacao') as leads_qualified,
      COUNT(*) FILTER (WHERE l.status = 'fechado_ganho') as leads_won,
      SUM(CASE WHEN l.status = 'fechado_ganho' THEN l.value ELSE 0 END) as revenue_sum
    FROM public.leads l
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= v_start_date
      AND l.created_at <= v_end_date + INTERVAL '1 day'
      AND (p_campaign_id IS NULL OR l.campaign_id = p_campaign_id)
      AND (p_account_id IS NULL OR l.campaign_id IN (
        SELECT c.id FROM public.ad_campaigns c WHERE c.ad_account_id = p_account_id
      ))
    GROUP BY l.created_at::DATE
  )
  SELECT
    ds.day as date,
    COALESCE(m.spend_sum, 0)::NUMERIC as spend,
    COALESCE(m.impressions_sum, 0)::BIGINT as impressions,
    COALESCE(m.clicks_sum, 0)::BIGINT as clicks,
    COALESCE(m.leads_sum, 0)::BIGINT as meta_leads,
    COALESCE(c.leads_created, 0)::BIGINT as crm_leads_created,
    COALESCE(c.leads_qualified, 0)::BIGINT as crm_leads_qualified,
    COALESCE(c.leads_won, 0)::BIGINT as crm_leads_closed_won,
    COALESCE(c.revenue_sum, 0)::NUMERIC as revenue,
    CASE
      WHEN COALESCE(m.impressions_sum, 0) > 0 THEN
        (COALESCE(m.clicks_sum, 0)::NUMERIC / COALESCE(m.impressions_sum, 0)) * 100
      ELSE 0
    END::NUMERIC as ctr,
    CASE
      WHEN COALESCE(c.leads_created, 0) > 0 THEN
        COALESCE(m.spend_sum, 0)::NUMERIC / COALESCE(c.leads_created, 0)
      ELSE NULL
    END::NUMERIC as cpl,
    CASE
      WHEN COALESCE(m.spend_sum, 0) > 0 THEN
        COALESCE(c.revenue_sum, 0)::NUMERIC / COALESCE(m.spend_sum, 0)
      ELSE NULL
    END::NUMERIC as roas
  FROM date_series ds
  LEFT JOIN daily_meta m ON m.date = ds.day
  LEFT JOIN daily_crm c ON c.date = ds.day
  ORDER BY ds.day ASC;
END;
$;
COMMENT ON FUNCTION public.get_unified_daily_breakdown IS
'Retorna breakdown diário de métricas unificadas (Meta Ads + CRM) para gráficos de evolução temporal. Preenche lacunas com zeros para garantir série temporal contínua.';
-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unified_daily_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_daily_breakdown TO service_role;
-- ============================================================================
-- 4. INDEXES para performance
-- ============================================================================

-- Garantir índices existentes em campaign_daily_insights
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_campaign
  ON public.campaign_daily_insights(date, campaign_id);
-- Garantir índices existentes em leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at_campaign
  ON public.leads(created_at, campaign_id)
  WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_closed_won_at
  ON public.leads(closed_won_at)
  WHERE status = 'fechado_ganho';
-- ============================================================================
-- 5. RLS Policies (herdam das tabelas base)
-- ============================================================================
-- Views herdam automaticamente as policies das tabelas base (ad_campaigns, leads, etc.)
-- Funções usam SECURITY DEFINER com filtros explícitos por organization_id

-- ============================================================================
-- FIM DA MIGRATION - Sprint 2
-- ============================================================================;
