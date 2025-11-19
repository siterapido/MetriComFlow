-- Migration: Lead Import Tables and RLS
-- Created: 2025-11-17

BEGIN;

-- lead_import_batches: one record per import batch
CREATE TABLE IF NOT EXISTS public.lead_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  user_id UUID,
  source_file_name TEXT,
  source_file_url TEXT,
  source_file_hash TEXT,
  sheet_name TEXT,
  mapping_json JSONB,
  row_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- lead_import_rows: per-row audit within a batch
CREATE TABLE IF NOT EXISTS public.lead_import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.lead_import_batches(id) ON DELETE CASCADE,
  original_values JSONB NOT NULL,
  normalized_values JSONB,
  status TEXT NOT NULL CHECK (status IN ('imported','skipped')),
  errors TEXT[],
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- lead_import_mappings: saved mapping templates per org/user
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_import_batches_org_started ON public.lead_import_batches(organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_import_rows_batch_status ON public.lead_import_rows(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_import_mappings_org_usage ON public.lead_import_mappings(organization_id, usage_count DESC);

-- Enable RLS
ALTER TABLE public.lead_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_import_mappings ENABLE ROW LEVEL SECURITY;

-- RLS helper: has_crm_access already exists in CRM migrations; if not, fallback to auth check
CREATE POLICY IF NOT EXISTS "View own org batches" ON public.lead_import_batches
  FOR SELECT USING (
    (auth.uid() IS NOT NULL) AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND has_crm_access(auth.uid())
    )
  );
CREATE POLICY IF NOT EXISTS "Insert own org batches" ON public.lead_import_batches
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL) AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND has_crm_access(auth.uid())
    )
  );
CREATE POLICY IF NOT EXISTS "Update own org batches" ON public.lead_import_batches
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL) AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND has_crm_access(auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "View rows by batch" ON public.lead_import_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lead_import_batches b
      WHERE b.id = batch_id AND has_crm_access(auth.uid())
    )
  );
CREATE POLICY IF NOT EXISTS "Insert rows by batch" ON public.lead_import_rows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lead_import_batches b
      WHERE b.id = batch_id AND has_crm_access(auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "View own org mappings" ON public.lead_import_mappings
  FOR SELECT USING (
    (auth.uid() IS NOT NULL) AND organization_id IN (
      SELECT organization_id FROM public.team_members tm WHERE tm.profile_id = auth.uid()
    )
  );
CREATE POLICY IF NOT EXISTS "Insert own org mappings" ON public.lead_import_mappings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );
CREATE POLICY IF NOT EXISTS "Update own org mappings" ON public.lead_import_mappings
  FOR UPDATE USING (
    auth.uid() = user_id
  );

COMMIT;