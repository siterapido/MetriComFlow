-- Migrações Propostas (MVP)
-- Valide em branch de desenvolvimento e aplique via Supabase CLI.

-- 1) Atualizar enum de status em leads
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo_lead','em_negociacao','proposta_enviada','venda_ganha','venda_perdida'));

-- 2) Campos para origem e fechos
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('meta_ads','manual')) DEFAULT 'manual';
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS closed_won_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS closed_lost_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- 2.1) Campos externos para integração Meta (deduplicação e rastreio)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS external_lead_id TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ad_id TEXT;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS adset_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_external_lead_id_not_null
  ON public.leads(external_lead_id) WHERE external_lead_id IS NOT NULL;

-- 3) Tabelas para contas e campanhas de anúncios
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'meta' CHECK (provider IN ('meta')),
  external_id TEXT NOT NULL,
  business_name TEXT,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins_managers_can_select_ad_accounts"
  ON public.ad_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE POLICY IF NOT EXISTS "authenticated_can_insert_ad_accounts"
  ON public.ad_accounts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins_managers_can_select_ad_campaigns"
  ON public.ad_campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_account ON public.ad_campaigns(ad_account_id);

-- 4) Insights diários
CREATE TABLE IF NOT EXISTS public.campaign_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend DECIMAL(15,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads_count BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.campaign_daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins_managers_can_select_campaign_daily_insights"
  ON public.campaign_daily_insights FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','manager')));
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date ON public.campaign_daily_insights(campaign_id, date);

-- 5) Vincular leads à campanha
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(campaign_id);

-- 6) View para KPIs de negócio (inclui CPL e ROAS)
CREATE OR REPLACE VIEW public.business_kpis AS
WITH k AS (
  SELECT
    COALESCE((SELECT SUM(spend) FROM public.campaign_daily_insights WHERE date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS investimento_total,
    COALESCE((SELECT COUNT(*) FROM public.leads WHERE source='meta_ads' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS leads_gerados,
    COALESCE((SELECT COUNT(*) FROM public.leads WHERE status='venda_ganha' AND closed_won_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS clientes_fechados,
    COALESCE((SELECT SUM(value) FROM public.leads WHERE status='venda_ganha' AND closed_won_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS faturamento_realizado,
    COALESCE((SELECT SUM(value) FROM public.leads WHERE status IN ('em_negociacao','proposta_enviada') AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS faturamento_previsto
)
SELECT *,
  CASE WHEN leads_gerados > 0 THEN investimento_total / leads_gerados ELSE NULL END AS cpl,
  CASE WHEN investimento_total > 0 THEN faturamento_realizado / investimento_total ELSE NULL END AS roas
FROM k;

-- 7) View de financeiros por campanha
CREATE OR REPLACE VIEW public.campaign_financials AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  COALESCE(SUM(ci.spend), 0) AS investimento,
  COALESCE(COUNT(l.id) FILTER (WHERE l.source='meta_ads'), 0) AS leads_gerados,
  COALESCE(COUNT(l.id) FILTER (WHERE l.status='venda_ganha'), 0) AS vendas_fechadas,
  COALESCE(SUM(l.value) FILTER (WHERE l.status='venda_ganha'), 0) AS faturamento,
  CASE WHEN COALESCE(SUM(ci.spend), 0) > 0
       THEN COALESCE(SUM(l.value) FILTER (WHERE l.status='venda_ganha'), 0) / COALESCE(SUM(ci.spend), 0)
       ELSE NULL END AS roas
FROM public.ad_campaigns c
LEFT JOIN public.campaign_daily_insights ci ON ci.campaign_id = c.id
LEFT JOIN public.leads l ON l.campaign_id = c.id
GROUP BY c.id, c.name;

-- Observação: RLS não se aplica a views. Para restringir acesso a métricas financeiras por perfil,
-- exponha-as preferencialmente via funções RPC (security definer) com checagem de role em `profiles`.
-- Observação 2: Caso webhook de leads não esteja disponível, pode-se usar `SUM(campaign_daily_insights.leads_count)`
-- como alternativa para `leads_gerados` em relatórios agregados.