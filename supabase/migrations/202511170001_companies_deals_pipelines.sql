-- Migration: Companies, Deals, Pipelines & Stages
-- Description: Introduces core CRM entities (companies, contacts, deals) and configurable pipelines/stages. Adds optional linkage from tasks/interactions to companies/deals.
-- Created: 2025-11-17

-- =====================================================
-- COMPANIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  domain TEXT,
  phone TEXT,
  address TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view companies"
  ON public.companies FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update companies they own or CRM access"
  ON public.companies FOR UPDATE
  USING (has_crm_access(auth.uid()) AND (owner_id = auth.uid() OR is_owner(auth.uid())));

CREATE POLICY "Owners/admins can delete companies"
  ON public.companies FOR DELETE
  USING (has_crm_access(auth.uid()) AND is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(domain);

COMMENT ON TABLE public.companies IS 'Empresas/contas com múltiplos contatos e negócios vinculados';

-- =====================================================
-- CONTACTS (Opcional: pode coexistir com leads durante transição)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view contacts"
  ON public.contacts FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update contacts they own or CRM access"
  ON public.contacts FOR UPDATE
  USING (has_crm_access(auth.uid()) AND (owner_id = auth.uid() OR is_owner(auth.uid())));

CREATE POLICY "Owners/admins can delete contacts"
  ON public.contacts FOR DELETE
  USING (has_crm_access(auth.uid()) AND is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);

COMMENT ON TABLE public.contacts IS 'Contatos vinculados a empresas; pode coexistir com leads';

-- =====================================================
-- DEAL PIPELINES & STAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.deal_pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.deal_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view pipelines"
  ON public.deal_pipelines FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create pipelines"
  ON public.deal_pipelines FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update pipelines with CRM access"
  ON public.deal_pipelines FOR UPDATE
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Owners/admins can delete pipelines"
  ON public.deal_pipelines FOR DELETE
  USING (has_crm_access(auth.uid()) AND is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_deal_pipelines_org ON public.deal_pipelines(organization_id);

COMMENT ON TABLE public.deal_pipelines IS 'Pipelines de negócios configuráveis por equipe/produto';

CREATE TABLE IF NOT EXISTS public.deal_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES public.deal_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  probability DECIMAL(5,2) CHECK (probability >= 0 AND probability <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view stages"
  ON public.deal_stages FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create stages"
  ON public.deal_stages FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update stages with CRM access"
  ON public.deal_stages FOR UPDATE
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Owners/admins can delete stages"
  ON public.deal_stages FOR DELETE
  USING (has_crm_access(auth.uid()) AND is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_deal_stages_pipeline ON public.deal_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deal_stages_position ON public.deal_stages(position);

COMMENT ON TABLE public.deal_stages IS 'Estágios de pipeline de negócios com probabilidade e ordem';

-- =====================================================
-- DEALS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  pipeline_id UUID REFERENCES public.deal_pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.deal_stages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_close_date DATE,
  source TEXT,
  lost_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view deals"
  ON public.deals FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update deals they own or CRM access"
  ON public.deals FOR UPDATE
  USING (has_crm_access(auth.uid()) AND (owner_id = auth.uid() OR is_owner(auth.uid())));

CREATE POLICY "Owners/admins can delete deals"
  ON public.deals FOR DELETE
  USING (has_crm_access(auth.uid()) AND is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_deals_org ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_company ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON public.deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);

COMMENT ON TABLE public.deals IS 'Oportunidades de venda separadas de leads, vinculadas a empresas/contatos e pipelines';

-- =====================================================
-- OPTIONAL LINKS: TASKS & INTERACTIONS → COMPANIES/DEALS
-- =====================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON public.tasks(deal_id);

ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON public.interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_interactions_deal_id ON public.interactions(deal_id);

-- =====================================================
-- VIEWS: DEAL METRICS (BÁSICO)
-- =====================================================

CREATE OR REPLACE VIEW public.deal_metrics AS
SELECT 
  d.organization_id,
  DATE_TRUNC('month', d.created_at) AS month,
  DATE_TRUNC('week', d.created_at) AS week,
  d.status,
  d.value,
  d.expected_close_date,
  s.probability,
  d.owner_id,
  d.pipeline_id,
  d.stage_id
FROM public.deals d
LEFT JOIN public.deal_stages s ON s.id = d.stage_id;

GRANT SELECT ON public.deal_metrics TO authenticated;

COMMENT ON VIEW public.deal_metrics IS 'KPIs básicos de deals por período/estágio';