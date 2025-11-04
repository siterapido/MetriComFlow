-- Migration: Meta Ad Sets and Ads (Criativos)
-- Description: Adiciona tabelas para conjuntos de anúncios (ad sets) e anúncios (ads/criativos)
-- para permitir análise granular de performance por conjunto e criativo

BEGIN;
-- ============================================================================
-- 1. TABELA DE CONJUNTOS DE ANÚNCIOS (AD SETS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE, -- ID do Meta (ex: "23851234567890")
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT, -- ACTIVE, PAUSED, ARCHIVED, DELETED

  -- Configurações do conjunto
  optimization_goal TEXT, -- REACH, LINK_CLICKS, LEAD_GENERATION, etc.
  billing_event TEXT, -- IMPRESSIONS, LINK_CLICKS, etc.
  bid_strategy TEXT, -- LOWEST_COST, COST_CAP, BID_CAP

  -- Segmentação
  targeting JSONB, -- Dados completos de targeting do Meta
  daily_budget DECIMAL(15,2),
  lifetime_budget DECIMAL(15,2),

  -- Datas
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_status ON public.ad_sets(status);
CREATE INDEX IF NOT EXISTS idx_ad_sets_external_id ON public.ad_sets(external_id);
-- RLS Policies
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ad sets from their org campaigns"
  ON public.ad_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_campaigns c
      INNER JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      WHERE c.id = ad_sets.campaign_id
      AND aa.organization_id IN (
        SELECT organization_id FROM public.organization_memberships
        WHERE profile_id = auth.uid() AND is_active = TRUE
      )
    )
  );
CREATE POLICY "Service role can insert ad sets"
  ON public.ad_sets FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
CREATE POLICY "Service role can update ad sets"
  ON public.ad_sets FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
-- ============================================================================
-- 2. TABELA DE ANÚNCIOS/CRIATIVOS (ADS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE, -- ID do Meta (ex: "23851234567891")
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE, -- Desnormalizado para queries rápidas
  name TEXT NOT NULL,
  status TEXT, -- ACTIVE, PAUSED, ARCHIVED, DELETED

  -- Informações do criativo
  creative_id TEXT, -- ID do creative no Meta
  creative_type TEXT, -- IMAGE, VIDEO, CAROUSEL, COLLECTION, etc.

  -- Conteúdo do criativo (extraído da API)
  title TEXT,
  body TEXT,
  call_to_action TEXT, -- LEARN_MORE, SHOP_NOW, SIGN_UP, etc.
  link_url TEXT,
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,

  -- Dados completos do creative (JSON)
  creative_data JSONB,

  -- Datas
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON public.ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_external_id ON public.ads(external_id);
CREATE INDEX IF NOT EXISTS idx_ads_creative_type ON public.ads(creative_type);
-- RLS Policies
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ads from their org ad sets"
  ON public.ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets s
      INNER JOIN public.ad_campaigns c ON c.id = s.campaign_id
      INNER JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      WHERE s.id = ads.ad_set_id
      AND aa.organization_id IN (
        SELECT organization_id FROM public.organization_memberships
        WHERE profile_id = auth.uid() AND is_active = TRUE
      )
    )
  );
CREATE POLICY "Service role can insert ads"
  ON public.ads FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
CREATE POLICY "Service role can update ads"
  ON public.ads FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
-- ============================================================================
-- 3. MÉTRICAS DIÁRIAS DE AD SETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_set_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE, -- Desnormalizado
  date DATE NOT NULL,

  -- Métricas principais
  spend DECIMAL(15,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads_count BIGINT DEFAULT 0,

  -- Métricas adicionais
  reach BIGINT DEFAULT 0, -- Alcance único
  frequency DECIMAL(10,2) DEFAULT 0, -- Frequência média

  -- Conversões
  actions JSONB, -- Array completo de actions da Meta API

  -- Custos
  cpc DECIMAL(15,2) DEFAULT 0, -- Custo por clique
  cpm DECIMAL(15,2) DEFAULT 0, -- Custo por mil impressões
  cpl DECIMAL(15,2) DEFAULT 0, -- Custo por lead

  -- Engajamento
  link_clicks BIGINT DEFAULT 0,
  post_engagement BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_set_id, date)
);
-- Índices
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_date ON public.ad_set_daily_insights(ad_set_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_set_insights_campaign ON public.ad_set_daily_insights(campaign_id, date DESC);
-- RLS
ALTER TABLE public.ad_set_daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ad set insights from their org"
  ON public.ad_set_daily_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_sets s
      INNER JOIN public.ad_campaigns c ON c.id = s.campaign_id
      INNER JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      WHERE s.id = ad_set_daily_insights.ad_set_id
      AND aa.organization_id IN (
        SELECT organization_id FROM public.organization_memberships
        WHERE profile_id = auth.uid() AND is_active = TRUE
      )
    )
  );
CREATE POLICY "Service role can manage ad set insights"
  ON public.ad_set_daily_insights FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
-- ============================================================================
-- 4. MÉTRICAS DIÁRIAS DE ADS (CRIATIVOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  ad_set_id UUID REFERENCES public.ad_sets(id) ON DELETE CASCADE, -- Desnormalizado
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE, -- Desnormalizado
  date DATE NOT NULL,

  -- Métricas principais
  spend DECIMAL(15,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads_count BIGINT DEFAULT 0,

  -- Métricas adicionais
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(10,2) DEFAULT 0,

  -- Conversões
  actions JSONB, -- Array completo de actions da Meta API

  -- Custos
  cpc DECIMAL(15,2) DEFAULT 0,
  cpm DECIMAL(15,2) DEFAULT 0,
  cpl DECIMAL(15,2) DEFAULT 0,

  -- Engajamento
  link_clicks BIGINT DEFAULT 0,
  post_engagement BIGINT DEFAULT 0,
  video_views BIGINT DEFAULT 0,
  video_avg_time_watched DECIMAL(10,2) DEFAULT 0,

  -- Relevância (Meta Quality Ranking)
  quality_ranking TEXT, -- ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE
  engagement_ranking TEXT,
  conversion_ranking TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, date)
);
-- Índices
CREATE INDEX IF NOT EXISTS idx_ad_insights_date ON public.ad_daily_insights(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_insights_ad_set ON public.ad_daily_insights(ad_set_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_insights_campaign ON public.ad_daily_insights(campaign_id, date DESC);
-- RLS
ALTER TABLE public.ad_daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ad insights from their org"
  ON public.ad_daily_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ads a
      INNER JOIN public.ad_sets s ON s.id = a.ad_set_id
      INNER JOIN public.ad_campaigns c ON c.id = s.campaign_id
      INNER JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      WHERE a.id = ad_daily_insights.ad_id
      AND aa.organization_id IN (
        SELECT organization_id FROM public.organization_memberships
        WHERE profile_id = auth.uid() AND is_active = TRUE
      )
    )
  );
CREATE POLICY "Service role can manage ad insights"
  ON public.ad_daily_insights FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NOT NULL);
-- ============================================================================
-- 5. TRIGGERS PARA UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_ad_sets_updated_at
  BEFORE UPDATE ON public.ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================================================
-- 6. COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE public.ad_sets IS 'Conjuntos de anúncios (Ad Sets) do Meta Ads - nível intermediário entre campanha e anúncio';
COMMENT ON TABLE public.ads IS 'Anúncios individuais (criativos) do Meta Ads - nível mais granular de análise';
COMMENT ON TABLE public.ad_set_daily_insights IS 'Métricas diárias por conjunto de anúncios';
COMMENT ON TABLE public.ad_daily_insights IS 'Métricas diárias por anúncio/criativo individual';
COMMENT ON COLUMN public.ads.creative_type IS 'Tipo de criativo: IMAGE, VIDEO, CAROUSEL, COLLECTION, etc.';
COMMENT ON COLUMN public.ad_daily_insights.quality_ranking IS 'Meta Quality Ranking: ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE';
COMMIT;
