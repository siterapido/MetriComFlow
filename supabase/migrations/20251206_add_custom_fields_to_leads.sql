-- Add custom_fields column to leads table
-- Created: 2025-12-06

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.custom_fields IS 'Stores ad-hoc custom fields from imports or other sources';

-- Add index for better performance when querying custom fields
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON public.leads USING gin (custom_fields);



