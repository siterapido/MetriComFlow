-- Migration: UTM Tracking for Lead Forms and Leads
-- Adds UTM parameters and fbclid tracking for attribution

BEGIN;
-- Add UTM columns to lead_form_submissions table
ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT;
-- Facebook Click ID

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
