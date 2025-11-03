-- ============================================================================
-- SCRIPT PARA APLICAR MIGRATIONS MANUALMENTE NO SUPABASE SQL EDITOR
-- ============================================================================
--
-- INSTRUÇÕES:
-- 1. Abra o Supabase Dashboard: https://supabase.com/dashboard
-- 2. Vá em SQL Editor
-- 3. Cole este script completo
-- 4. Execute
--
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Meta Conversions API (CAPI)
-- ============================================================================

BEGIN;

-- Table to log all conversion events sent to Meta CAPI
CREATE TABLE IF NOT EXISTS public.meta_conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lead reference
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

  -- Meta campaign reference (optional, for attribution)
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,

  -- Event details
  event_name TEXT NOT NULL, -- 'Lead', 'Purchase', 'CompleteRegistration'
  event_time BIGINT NOT NULL, -- Unix timestamp

  -- User data (hashed)
  email_hash TEXT, -- SHA-256 of email
  phone_hash TEXT, -- SHA-256 of phone
  first_name_hash TEXT, -- SHA-256 of first name
  last_name_hash TEXT, -- SHA-256 of last name
  fbclid TEXT, -- Facebook Click ID (if available)

  -- Custom data
  value DECIMAL(10, 2), -- Lead value or purchase amount
  currency TEXT DEFAULT 'BRL',
  content_ids TEXT[], -- Campaign/product IDs

  -- Dispatch status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Meta API response
  response_data JSON,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Organization for multi-tenancy
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT valid_event_name CHECK (event_name IN ('Lead', 'Purchase', 'CompleteRegistration', 'AddToCart', 'InitiateCheckout'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_lead_id
  ON public.meta_conversion_events(lead_id);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_campaign_id
  ON public.meta_conversion_events(campaign_id);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_status
  ON public.meta_conversion_events(status);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_created_at
  ON public.meta_conversion_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_events_organization_id
  ON public.meta_conversion_events(organization_id);

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

-- Users can view their organization's conversion events
DROP POLICY IF EXISTS "Users can view their org's conversion events" ON public.meta_conversion_events;
CREATE POLICY "Users can view their org's conversion events"
  ON public.meta_conversion_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Service role can manage conversion events
DROP POLICY IF EXISTS "Service role can manage conversion events" ON public.meta_conversion_events;
CREATE POLICY "Service role can manage conversion events"
  ON public.meta_conversion_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Trigger function to create conversion event when lead is qualified or won
CREATE OR REPLACE FUNCTION create_meta_conversion_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event_name TEXT;
  v_organization_id UUID;
BEGIN
  -- Only process Meta Ads leads
  IF NEW.source != 'meta_ads' THEN
    RETURN NEW;
  END IF;

  -- Get organization_id from lead
  v_organization_id := NEW.organization_id;

  -- Determine event type based on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Lead qualified → Send "Lead" event
    IF NEW.status = 'qualificado' AND OLD.status != 'qualificado' THEN
      v_event_name := 'Lead';

    -- Lead won → Send "Purchase" event
    ELSIF NEW.status = 'fechado_ganho' AND OLD.status != 'fechado_ganho' THEN
      v_event_name := 'Purchase';

    ELSE
      -- No relevant status change
      RETURN NEW;
    END IF;

    -- Insert conversion event (will be processed by Edge Function)
    INSERT INTO public.meta_conversion_events (
      lead_id,
      campaign_id,
      event_name,
      event_time,
      email_hash,
      phone_hash,
      first_name_hash,
      last_name_hash,
      fbclid,
      value,
      currency,
      content_ids,
      status,
      organization_id
    ) VALUES (
      NEW.id,
      NEW.campaign_id,
      v_event_name,
      EXTRACT(EPOCH FROM NOW())::BIGINT,
      -- Hashing will be done in Edge Function for security
      NULL, -- email_hash (computed later)
      NULL, -- phone_hash (computed later)
      NULL, -- first_name_hash (computed later)
      NULL, -- last_name_hash (computed later)
      NEW.fbclid,
      CASE
        WHEN v_event_name = 'Purchase' THEN NEW.value
        ELSE NULL
      END,
      'BRL',
      CASE
        WHEN NEW.campaign_id IS NOT NULL THEN ARRAY[NEW.campaign_id::TEXT]
        ELSE ARRAY[]::TEXT[]
      END,
      'pending',
      v_organization_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on leads table
DROP TRIGGER IF EXISTS trigger_create_meta_conversion_event ON public.leads;
CREATE TRIGGER trigger_create_meta_conversion_event
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.value IS DISTINCT FROM NEW.value)
  EXECUTE FUNCTION create_meta_conversion_event();

-- Comment
COMMENT ON TABLE public.meta_conversion_events IS 'Stores Meta Conversions API events for tracking lead conversions back to Meta Ads';
COMMENT ON COLUMN public.meta_conversion_events.event_name IS 'Type of conversion event: Lead (qualified), Purchase (closed won)';
COMMENT ON COLUMN public.meta_conversion_events.status IS 'Dispatch status: pending (not sent), sent (successfully sent), failed (error)';
COMMENT ON COLUMN public.meta_conversion_events.retry_count IS 'Number of retry attempts for failed events';

COMMIT;

-- ============================================================================
-- MIGRATION 2: UTM Tracking
-- ============================================================================

BEGIN;

-- Add UTM columns to lead_form_submissions table
ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT; -- Facebook Click ID

-- Add indexes for common UTM queries
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_utm_source
  ON public.lead_form_submissions(utm_source);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_utm_campaign
  ON public.lead_form_submissions(utm_campaign);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_fbclid
  ON public.lead_form_submissions(fbclid);

-- Add fbclid column to leads table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'leads'
    AND column_name = 'fbclid'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN fbclid TEXT;
    CREATE INDEX idx_leads_fbclid ON public.leads(fbclid);
  END IF;
END $$;

-- Add UTM columns to leads table (for direct capture)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Add indexes for leads UTM tracking
CREATE INDEX IF NOT EXISTS idx_leads_utm_source
  ON public.leads(utm_source);

CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign
  ON public.leads(utm_campaign);

-- Comment
COMMENT ON COLUMN public.lead_form_submissions.utm_source IS 'UTM Source parameter for campaign attribution';
COMMENT ON COLUMN public.lead_form_submissions.utm_campaign IS 'UTM Campaign parameter for campaign attribution';
COMMENT ON COLUMN public.lead_form_submissions.fbclid IS 'Facebook Click ID for Meta Ads attribution';

COMMENT ON COLUMN public.leads.utm_source IS 'UTM Source parameter for campaign attribution';
COMMENT ON COLUMN public.leads.utm_campaign IS 'UTM Campaign parameter for campaign attribution';
COMMENT ON COLUMN public.leads.fbclid IS 'Facebook Click ID for Meta Conversions API';

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar se as tabelas foram criadas
SELECT
  'meta_conversion_events' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'meta_conversion_events'

UNION ALL

SELECT
  'leads (utm columns)' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name IN ('utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'fbclid');

-- Verificar se os triggers foram criados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_create_meta_conversion_event', 'meta_conversion_events_updated_at')
ORDER BY trigger_name;
