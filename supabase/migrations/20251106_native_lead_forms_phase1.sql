-- Migration: Native Lead Forms - Phase 1
-- Description: Extends lead_forms metadata and introduces field definitions,
--              variants, submissions, and performance reporting.
-- Created: 2025-11-06

BEGIN;

-- ============================================================================
-- 1. Extend lead_forms metadata
-- ============================================================================

ALTER TABLE public.lead_forms
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS default_owner_id UUID REFERENCES public.team_members(id);

CREATE INDEX IF NOT EXISTS idx_lead_forms_organization ON public.lead_forms(organization_id);

-- ============================================================================
-- 2. Field definitions and variants
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'text', 'email', 'phone', 'textarea', 'select', 'multiselect', 'checkbox',
    'radio', 'date', 'hidden'
  )),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  help_text TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  validations JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_field TEXT,
  meta_field TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, key)
);

CREATE INDEX IF NOT EXISTS idx_lead_form_fields_form ON public.lead_form_fields(form_id, order_index);

ALTER TABLE public.lead_form_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_fields'
      AND policyname = 'CRM users manage lead form fields'
  ) THEN
    CREATE POLICY "CRM users manage lead form fields"
      ON public.lead_form_fields FOR ALL
      USING (has_crm_access(auth.uid()))
      WITH CHECK (has_crm_access(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_form_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  campaign_source TEXT,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  meta_ad_account_id TEXT,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  meta_ad_id TEXT,
  theme_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  automation_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_lead_form_variants_form ON public.lead_form_variants(form_id);
CREATE INDEX IF NOT EXISTS idx_lead_form_variants_campaign ON public.lead_form_variants(campaign_id);

ALTER TABLE public.lead_form_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_variants'
      AND policyname = 'CRM users manage lead form variants'
  ) THEN
    CREATE POLICY "CRM users manage lead form variants"
      ON public.lead_form_variants FOR ALL
      USING (has_crm_access(auth.uid()))
      WITH CHECK (has_crm_access(auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- 3. Submissions and events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lead_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.lead_form_variants(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  errors JSONB,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'validated', 'synced_crm', 'failed')),
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  meta_form_id TEXT,
  meta_lead_id TEXT,
  fbp TEXT,
  fbc TEXT,
  landing_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_form ON public.lead_form_submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_lead ON public.lead_form_submissions(lead_id);

ALTER TABLE public.lead_form_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_submissions'
      AND policyname = 'CRM users view lead form submissions'
  ) THEN
    CREATE POLICY "CRM users view lead form submissions"
      ON public.lead_form_submissions FOR SELECT
      USING (has_crm_access(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_submissions'
      AND policyname = 'Edge functions insert lead form submissions'
  ) THEN
    CREATE POLICY "Edge functions insert lead form submissions"
      ON public.lead_form_submissions FOR INSERT
      WITH CHECK (auth.role() = 'service_role' OR has_crm_access(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_submissions'
      AND policyname = 'Edge functions update lead form submissions'
  ) THEN
    CREATE POLICY "Edge functions update lead form submissions"
      ON public.lead_form_submissions FOR UPDATE
      USING (auth.role() = 'service_role' OR has_crm_access(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_form_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.lead_form_submissions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_form_submission_events_submission
  ON public.lead_form_submission_events(submission_id, created_at DESC);

ALTER TABLE public.lead_form_submission_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_submission_events'
      AND policyname = 'CRM users view lead form submission events'
  ) THEN
    CREATE POLICY "CRM users view lead form submission events"
      ON public.lead_form_submission_events FOR SELECT
      USING (has_crm_access(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_form_submission_events'
      AND policyname = 'Edge functions manage lead form submission events'
  ) THEN
    CREATE POLICY "Edge functions manage lead form submission events"
      ON public.lead_form_submission_events FOR ALL
      USING (auth.role() = 'service_role' OR has_crm_access(auth.uid()))
      WITH CHECK (auth.role() = 'service_role' OR has_crm_access(auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- 4. Triggers to maintain updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS trg_lead_form_fields_updated_at ON public.lead_form_fields;
CREATE TRIGGER trg_lead_form_fields_updated_at
  BEFORE UPDATE ON public.lead_form_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lead_form_variants_updated_at ON public.lead_form_variants;
CREATE TRIGGER trg_lead_form_variants_updated_at
  BEFORE UPDATE ON public.lead_form_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lead_form_submissions_updated_at ON public.lead_form_submissions;
CREATE TRIGGER trg_lead_form_submissions_updated_at
  BEFORE UPDATE ON public.lead_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Performance view
-- ============================================================================

CREATE OR REPLACE VIEW public.lead_form_performance AS
SELECT
  lf.id AS form_id,
  lf.name AS form_name,
  lfv.id AS variant_id,
  lfv.name AS variant_name,
  DATE_TRUNC('day', lfs.created_at) AS day,
  COUNT(*) FILTER (WHERE lfs.status IN ('validated', 'synced_crm')) AS submissions,
  COUNT(*) FILTER (WHERE lfs.lead_id IS NOT NULL) AS leads_crm,
  COUNT(*) FILTER (WHERE l.status = 'fechado_ganho') AS deals_closed,
  COALESCE(SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho'), 0) AS revenue_won
FROM public.lead_forms lf
LEFT JOIN public.lead_form_variants lfv
  ON lfv.form_id = lf.id
LEFT JOIN public.lead_form_submissions lfs
  ON lfs.form_id = lf.id AND (lfv.id IS NULL OR lfs.variant_id = lfv.id)
LEFT JOIN public.leads l
  ON l.id = lfs.lead_id
GROUP BY 1,2,3,4,5;

COMMENT ON VIEW public.lead_form_performance IS 'Aggregated performance metrics for native lead forms and variants';

COMMIT;
