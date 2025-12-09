-- Migration: Ensure Lead Import Tables and RLS
-- Created: 2025-12-20
-- Description: Ensures lead import tables exist and RLS policies are applied,
-- fixing the 404 error when fetching lead_import_mappings.

BEGIN;

-- 1. Create lead_import_mappings if not exists
CREATE TABLE IF NOT EXISTS public.lead_import_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mapping_json JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_lead_import_mappings_org_usage ON public.lead_import_mappings(organization_id, usage_count DESC);

-- Enable RLS
ALTER TABLE public.lead_import_mappings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean state (idempotent)
DROP POLICY IF EXISTS "View own org mappings" ON public.lead_import_mappings;
DROP POLICY IF EXISTS "Insert own org mappings" ON public.lead_import_mappings;
DROP POLICY IF EXISTS "Update own org mappings" ON public.lead_import_mappings;

-- 3. Create RLS policies
CREATE POLICY "View own org mappings" ON public.lead_import_mappings
  FOR SELECT USING (
    (auth.uid() IS NOT NULL) AND organization_id IN (
      SELECT organization_id FROM public.team_members tm WHERE tm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Insert own org mappings" ON public.lead_import_mappings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND organization_id IN (
      SELECT organization_id FROM public.team_members tm WHERE tm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Update own org mappings" ON public.lead_import_mappings
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- 4. Grant permissions
GRANT ALL ON TABLE public.lead_import_mappings TO authenticated;
GRANT ALL ON TABLE public.lead_import_mappings TO service_role;

COMMIT;





