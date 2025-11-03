-- Migration: Meta Conversions API (CAPI) Integration
-- Enables sending conversion events back to Meta Ads for campaign optimization

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

CREATE TRIGGER meta_conversion_events_updated_at
  BEFORE UPDATE ON public.meta_conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION update_meta_conversion_events_updated_at();

-- RLS Policies
ALTER TABLE public.meta_conversion_events ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's conversion events
CREATE POLICY "Users can view their org's conversion events"
  ON public.meta_conversion_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Service role can insert/update (for Edge Functions)
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
