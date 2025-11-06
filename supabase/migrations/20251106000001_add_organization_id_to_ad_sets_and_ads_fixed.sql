-- Migration: Add organization_id to ad_sets and ads tables (FIXED)
-- Description: Adiciona organization_id às tabelas ad_sets e ads para melhorar performance
-- e simplificar queries. Preenche retroativamente usando dados de ad_campaigns -> ad_accounts.

BEGIN;

-- ============================================================================
-- 1. ADICIONAR organization_id e provider À TABELA ad_sets
-- ============================================================================

-- Adicionar coluna organization_id
ALTER TABLE public.ad_sets
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Adicionar coluna provider (para consistência com outras tabelas)
ALTER TABLE public.ad_sets
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta';

-- Preencher organization_id retroativamente através de ad_campaigns -> ad_accounts
UPDATE public.ad_sets
SET organization_id = aa.organization_id
FROM public.ad_campaigns ac
INNER JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
WHERE ad_sets.campaign_id = ac.id
AND ad_sets.organization_id IS NULL;

-- Tornar organization_id NOT NULL após preencher dados
ALTER TABLE public.ad_sets
ALTER COLUMN organization_id SET NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_ad_sets_organization_id ON public.ad_sets(organization_id);

-- Ajustar UNIQUE constraint para incluir organization_id
ALTER TABLE public.ad_sets DROP CONSTRAINT IF EXISTS ad_sets_external_id_key;
ALTER TABLE public.ad_sets ADD CONSTRAINT ad_sets_external_id_organization_unique UNIQUE(external_id, organization_id);

-- ============================================================================
-- 2. ADICIONAR organization_id e provider À TABELA ads
-- ============================================================================

-- Adicionar coluna organization_id
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Adicionar coluna provider (para consistência)
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'meta';

-- Adicionar coluna creative_name (usada no connect-ad-account)
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS creative_name TEXT;

-- Preencher organization_id retroativamente através de ad_sets -> ad_campaigns -> ad_accounts
UPDATE public.ads
SET organization_id = aa.organization_id
FROM public.ad_sets ad_set
INNER JOIN public.ad_campaigns ac ON ac.id = ad_set.campaign_id
INNER JOIN public.ad_accounts aa ON aa.id = ac.ad_account_id
WHERE ads.ad_set_id = ad_set.id
AND ads.organization_id IS NULL;

-- Tornar organization_id NOT NULL após preencher dados
ALTER TABLE public.ads
ALTER COLUMN organization_id SET NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_ads_organization_id ON public.ads(organization_id);

-- Ajustar UNIQUE constraint para incluir organization_id
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_external_id_key;
ALTER TABLE public.ads ADD CONSTRAINT ads_external_id_organization_unique UNIQUE(external_id, organization_id);

-- ============================================================================
-- 3. ATUALIZAR RLS POLICIES (simplificadas com organization_id)
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view ad sets from their org campaigns" ON public.ad_sets;
DROP POLICY IF EXISTS "Users can view ads from their org ad sets" ON public.ads;

-- Criar políticas simplificadas usando organization_id diretamente
CREATE POLICY "Users can view ad sets from their organization"
  ON public.ad_sets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can view ads from their organization"
  ON public.ads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- 4. ATUALIZAR INSIGHTS TABLES (adicionar organization_id)
-- ============================================================================

-- ad_set_daily_insights
ALTER TABLE public.ad_set_daily_insights
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.ad_set_daily_insights
SET organization_id = ad_set.organization_id
FROM public.ad_sets ad_set
WHERE ad_set_daily_insights.ad_set_id = ad_set.id
AND ad_set_daily_insights.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ad_set_insights_organization ON public.ad_set_daily_insights(organization_id);

-- ad_daily_insights
ALTER TABLE public.ad_daily_insights
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.ad_daily_insights
SET organization_id = ad.organization_id
FROM public.ads ad
WHERE ad_daily_insights.ad_id = ad.id
AND ad_daily_insights.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ad_insights_organization ON public.ad_daily_insights(organization_id);

-- Atualizar RLS policies para insights
DROP POLICY IF EXISTS "Users can view ad set insights from their org" ON public.ad_set_daily_insights;
DROP POLICY IF EXISTS "Users can view ad insights from their org" ON public.ad_daily_insights;

CREATE POLICY "Users can view ad set insights from their organization"
  ON public.ad_set_daily_insights FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can view ad insights from their organization"
  ON public.ad_daily_insights FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- 5. COMENTÁRIOS
-- ============================================================================

COMMENT ON COLUMN public.ad_sets.organization_id IS 'Organização dona do conjunto de anúncios (desnormalizado para performance)';
COMMENT ON COLUMN public.ads.organization_id IS 'Organização dona do anúncio (desnormalizado para performance)';
COMMENT ON COLUMN public.ad_set_daily_insights.organization_id IS 'Organização (desnormalizado para performance de queries)';
COMMENT ON COLUMN public.ad_daily_insights.organization_id IS 'Organização (desnormalizado para performance de queries)';

COMMIT;
