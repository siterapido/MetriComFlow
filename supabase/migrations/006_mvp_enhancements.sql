-- Migration 006: MVP Enhancements
-- Objetivo: Adicionar suporte completo para Meta Ads, atualizar status de leads e criar views de negócio

BEGIN;
-- ============================================================================
-- 1. ATUALIZAR TABELA DE LEADS
-- ============================================================================

-- 1.1 Atualizar enum de status para refletir funil de vendas
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo_lead', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido'));
-- 1.2 Adicionar campos para rastreamento de origem e fechamento
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('meta_ads', 'manual')) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS closed_won_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_lost_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;
-- 1.3 Adicionar campos para integração Meta Ads (deduplicação e rastreio)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS external_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL;
-- 1.4 Criar índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_external_lead_id_not_null
  ON public.leads(external_lead_id) WHERE external_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
-- ============================================================================
-- 2. CRIAR/VALIDAR TABELAS META ADS
-- ============================================================================

-- 2.1 Garantir que campaign_daily_insights existe
CREATE TABLE IF NOT EXISTS public.campaign_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend DECIMAL(15,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads_count BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);
-- 2.2 Habilitar RLS
ALTER TABLE public.campaign_daily_insights ENABLE ROW LEVEL SECURITY;
-- 2.3 Criar políticas RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'campaign_daily_insights'
    AND policyname = 'Users can view campaign insights'
  ) THEN
    CREATE POLICY "Users can view campaign insights"
    ON public.campaign_daily_insights FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
-- 2.4 Criar índices
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date
  ON public.campaign_daily_insights(campaign_id, date DESC);
-- ============================================================================
-- 3. CRIAR VIEWS DE NEGÓCIO
-- ============================================================================

-- 3.1 View para KPIs de negócio consolidados (inclui CPL e ROAS)
CREATE OR REPLACE VIEW public.business_kpis AS
WITH current_month AS (
  SELECT DATE_TRUNC('month', CURRENT_DATE) AS month_start
),
kpis AS (
  SELECT
    -- Investimento total em Meta Ads no mês atual
    COALESCE((
      SELECT SUM(spend)
      FROM public.campaign_daily_insights cdi
      CROSS JOIN current_month cm
      WHERE cdi.date >= cm.month_start
    ), 0) AS investimento_total,

    -- Leads gerados via Meta Ads no mês atual
    COALESCE((
      SELECT COUNT(*)
      FROM public.leads l
      CROSS JOIN current_month cm
      WHERE l.source = 'meta_ads'
      AND l.created_at >= cm.month_start
    ), 0) AS leads_gerados,

    -- Clientes fechados (vendas ganhas) no mês atual
    COALESCE((
      SELECT COUNT(*)
      FROM public.leads l
      CROSS JOIN current_month cm
      WHERE l.status = 'fechado_ganho'
      AND l.closed_won_at >= cm.month_start
    ), 0) AS clientes_fechados,

    -- Faturamento realizado (vendas ganhas) no mês atual
    COALESCE((
      SELECT SUM(value)
      FROM public.leads l
      CROSS JOIN current_month cm
      WHERE l.status = 'fechado_ganho'
      AND l.closed_won_at >= cm.month_start
    ), 0) AS faturamento_realizado,

    -- Faturamento previsto (em negociação + proposta) no mês atual
    COALESCE((
      SELECT SUM(value)
      FROM public.leads l
      CROSS JOIN current_month cm
      WHERE l.status IN ('negociacao', 'proposta')
      AND l.updated_at >= cm.month_start
    ), 0) AS faturamento_previsto,

    -- Leads ativos (não fechados) no mês atual
    COALESCE((
      SELECT COUNT(*)
      FROM public.leads l
      WHERE l.status NOT IN ('fechado_ganho', 'fechado_perdido')
    ), 0) AS leads_ativos
)
SELECT
  *,
  -- CPL (Custo por Lead)
  CASE
    WHEN leads_gerados > 0 THEN ROUND((investimento_total / leads_gerados)::numeric, 2)
    ELSE NULL
  END AS cpl,

  -- ROAS (Return on Ad Spend)
  CASE
    WHEN investimento_total > 0 THEN ROUND((faturamento_realizado / investimento_total)::numeric, 2)
    ELSE NULL
  END AS roas,

  -- Taxa de conversão (fechados / gerados)
  CASE
    WHEN leads_gerados > 0 THEN ROUND((clientes_fechados::numeric / leads_gerados * 100), 2)
    ELSE 0
  END AS taxa_conversao
FROM kpis;
-- 3.2 View para financeiros por campanha
CREATE OR REPLACE VIEW public.campaign_financials AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.status AS campaign_status,
  c.objective AS campaign_objective,
  aa.business_name AS account_name,

  -- Métricas de investimento
  COALESCE(SUM(ci.spend), 0) AS investimento,
  COALESCE(SUM(ci.impressions), 0) AS impressions,
  COALESCE(SUM(ci.clicks), 0) AS clicks,

  -- Métricas de leads
  COALESCE(COUNT(l.id) FILTER (WHERE l.source = 'meta_ads'), 0) AS leads_gerados,
  COALESCE(COUNT(l.id) FILTER (WHERE l.status = 'fechado_ganho'), 0) AS vendas_fechadas,
  COALESCE(COUNT(l.id) FILTER (WHERE l.status = 'fechado_perdido'), 0) AS vendas_perdidas,
  COALESCE(COUNT(l.id) FILTER (WHERE l.status IN ('negociacao', 'proposta')), 0) AS em_negociacao,

  -- Métricas financeiras
  COALESCE(SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho'), 0) AS faturamento,
  COALESCE(SUM(l.value) FILTER (WHERE l.status IN ('negociacao', 'proposta')), 0) AS pipeline_value,

  -- CPL (Custo por Lead)
  CASE
    WHEN COUNT(l.id) FILTER (WHERE l.source = 'meta_ads') > 0
    THEN ROUND((COALESCE(SUM(ci.spend), 0) / COUNT(l.id) FILTER (WHERE l.source = 'meta_ads'))::numeric, 2)
    ELSE NULL
  END AS cpl,

  -- ROAS (Return on Ad Spend)
  CASE
    WHEN COALESCE(SUM(ci.spend), 0) > 0
    THEN ROUND((COALESCE(SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho'), 0) / COALESCE(SUM(ci.spend), 0))::numeric, 2)
    ELSE NULL
  END AS roas,

  -- CTR (Click Through Rate)
  CASE
    WHEN COALESCE(SUM(ci.impressions), 0) > 0
    THEN ROUND((COALESCE(SUM(ci.clicks), 0)::numeric / COALESCE(SUM(ci.impressions), 0) * 100), 2)
    ELSE 0
  END AS ctr,

  -- Taxa de conversão
  CASE
    WHEN COUNT(l.id) FILTER (WHERE l.source = 'meta_ads') > 0
    THEN ROUND((COUNT(l.id) FILTER (WHERE l.status = 'fechado_ganho')::numeric / COUNT(l.id) FILTER (WHERE l.source = 'meta_ads') * 100), 2)
    ELSE 0
  END AS taxa_conversao

FROM public.ad_campaigns c
LEFT JOIN public.ad_accounts aa ON c.ad_account_id = aa.id
LEFT JOIN public.campaign_daily_insights ci ON ci.campaign_id = c.id
LEFT JOIN public.leads l ON l.campaign_id = c.id
GROUP BY c.id, c.name, c.status, c.objective, aa.business_name
ORDER BY investimento DESC;
-- ============================================================================
-- 4. TRIGGERS E FUNÇÕES
-- ============================================================================

-- 4.1 Função para atualizar automaticamente closed_won_at e closed_lost_at
CREATE OR REPLACE FUNCTION public.update_lead_closed_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para fechado_ganho, registrar data
  IF NEW.status = 'fechado_ganho' AND OLD.status != 'fechado_ganho' THEN
    NEW.closed_won_at = NOW();
    NEW.closed_lost_at = NULL;
  END IF;

  -- Se mudou para fechado_perdido, registrar data
  IF NEW.status = 'fechado_perdido' AND OLD.status != 'fechado_perdido' THEN
    NEW.closed_lost_at = NOW();
    NEW.closed_won_at = NULL;
  END IF;

  -- Se saiu de fechado, limpar datas
  IF NEW.status NOT IN ('fechado_ganho', 'fechado_perdido') THEN
    IF OLD.status IN ('fechado_ganho', 'fechado_perdido') THEN
      NEW.closed_won_at = NULL;
      NEW.closed_lost_at = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 4.2 Criar trigger para atualizar datas de fechamento
DROP TRIGGER IF EXISTS trigger_update_lead_closed_dates ON public.leads;
CREATE TRIGGER trigger_update_lead_closed_dates
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_lead_closed_dates();
-- ============================================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON VIEW public.business_kpis IS 'KPIs consolidados do negócio: investimento, leads, CPL, ROAS, conversão';
COMMENT ON VIEW public.campaign_financials IS 'Métricas financeiras e de performance por campanha de Meta Ads';
COMMENT ON TABLE public.campaign_daily_insights IS 'Insights diários das campanhas (gasto, impressões, cliques, leads)';
COMMENT ON COLUMN public.leads.source IS 'Origem do lead: meta_ads (Facebook/Instagram) ou manual';
COMMENT ON COLUMN public.leads.external_lead_id IS 'ID externo do lead no Meta (para deduplicação)';
COMMENT ON COLUMN public.leads.campaign_id IS 'Campanha de origem (se source = meta_ads)';
COMMENT ON COLUMN public.leads.closed_won_at IS 'Data de fechamento da venda (ganho)';
COMMENT ON COLUMN public.leads.closed_lost_at IS 'Data de fechamento da venda (perdido)';
COMMIT;
