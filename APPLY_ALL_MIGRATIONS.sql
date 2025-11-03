-- ============================================================================
-- APLICAR TODAS AS MIGRATIONS PENDENTES
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- Habilitar extensão UUID (necessária)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MIGRATION: Meta Conversions API
-- ============================================================================

BEGIN;

-- Table to log all conversion events sent to Meta CAPI
CREATE TABLE IF NOT EXISTS public.meta_conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_time BIGINT NOT NULL,
  email_hash TEXT,
  phone_hash TEXT,
  first_name_hash TEXT,
  last_name_hash TEXT,
  fbclid TEXT,
  value DECIMAL(10, 2),
  currency TEXT DEFAULT 'BRL',
  content_ids TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  response_data JSON,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT valid_event_name CHECK (event_name IN ('Lead', 'Purchase', 'CompleteRegistration', 'AddToCart', 'InitiateCheckout'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_lead_id ON public.meta_conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_campaign_id ON public.meta_conversion_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_status ON public.meta_conversion_events(status);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_created_at ON public.meta_conversion_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_organization_id ON public.meta_conversion_events(organization_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_meta_conversion_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meta_conversion_events_updated_at ON public.meta_conversion_events;
CREATE TRIGGER meta_conversion_events_updated_at
  BEFORE UPDATE ON public.meta_conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_conversion_events_updated_at();

-- RLS Policies
ALTER TABLE public.meta_conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's conversion events" ON public.meta_conversion_events;
CREATE POLICY "Users can view their org's conversion events"
  ON public.meta_conversion_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Service role can manage conversion events" ON public.meta_conversion_events;
CREATE POLICY "Service role can manage conversion events"
  ON public.meta_conversion_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Trigger to create conversion event when lead is qualified or won
CREATE OR REPLACE FUNCTION create_meta_conversion_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event_name TEXT;
  v_organization_id UUID;
BEGIN
  IF NEW.source != 'meta_ads' THEN
    RETURN NEW;
  END IF;

  v_organization_id := NEW.organization_id;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'qualificado' AND (OLD.status IS NULL OR OLD.status != 'qualificado') THEN
      v_event_name := 'Lead';
    ELSIF NEW.status = 'fechado_ganho' AND (OLD.status IS NULL OR OLD.status != 'fechado_ganho') THEN
      v_event_name := 'Purchase';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.meta_conversion_events (
      lead_id, campaign_id, event_name, event_time, fbclid, value, currency,
      content_ids, status, organization_id
    ) VALUES (
      NEW.id,
      NEW.campaign_id,
      v_event_name,
      EXTRACT(EPOCH FROM NOW())::BIGINT,
      NEW.fbclid,
      CASE WHEN v_event_name = 'Purchase' THEN NEW.value ELSE NULL END,
      'BRL',
      CASE WHEN NEW.campaign_id IS NOT NULL THEN ARRAY[NEW.campaign_id::TEXT] ELSE ARRAY[]::TEXT[] END,
      'pending',
      v_organization_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_meta_conversion_event ON public.leads;
CREATE TRIGGER trigger_create_meta_conversion_event
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.value IS DISTINCT FROM NEW.value)
  EXECUTE FUNCTION create_meta_conversion_event();

COMMIT;

-- ============================================================================
-- MIGRATION: UTM Tracking
-- ============================================================================

BEGIN;

-- Add UTM columns to lead_form_submissions
ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT;

-- Indexes for lead_form_submissions
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_utm_source ON public.lead_form_submissions(utm_source);
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_utm_campaign ON public.lead_form_submissions(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_fbclid ON public.lead_form_submissions(fbclid);

-- Add fbclid to leads if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'fbclid'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN fbclid TEXT;
    CREATE INDEX idx_leads_fbclid ON public.leads(fbclid);
  END IF;
END $$;

-- Add UTM columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON public.leads(utm_campaign);

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT
  'meta_conversion_events table' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAILED' END as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'meta_conversion_events'

UNION ALL

SELECT
  'meta_conversion_events columns' as check_name,
  CASE WHEN COUNT(*) >= 15 THEN '✅ OK (' || COUNT(*) || ' columns)' ELSE '❌ FAILED' END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'meta_conversion_events'

UNION ALL

SELECT
  'leads UTM columns' as check_name,
  CASE WHEN COUNT(*) >= 6 THEN '✅ OK (' || COUNT(*) || ' columns)' ELSE '❌ FAILED' END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid')

UNION ALL

SELECT
  'lead_form_submissions UTM columns' as check_name,
  CASE WHEN COUNT(*) >= 6 THEN '✅ OK (' || COUNT(*) || ' columns)' ELSE '❌ FAILED' END as status
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lead_form_submissions'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid')

UNION ALL

SELECT
  'trigger_create_meta_conversion_event' as check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAILED' END as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_meta_conversion_event';

-- Mostrar contadores
SELECT
  'SUMMARY' as section,
  'Migrations applied successfully!' as message;
