-- Migration: Add missing indexes for ad_accounts foreign keys
-- Reason: Supabase Advisors flagged unindexed foreign keys for connected_by and organization_id
-- Date: 2025-10-28

BEGIN;

-- Add organization_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.ad_accounts
      ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Covering index for connected_by (FK to profiles.id)
CREATE INDEX IF NOT EXISTS idx_ad_accounts_connected_by
  ON public.ad_accounts(connected_by);

-- Covering index for organization_id (FK to organizations.id)
CREATE INDEX IF NOT EXISTS idx_ad_accounts_organization_id
  ON public.ad_accounts(organization_id);

COMMIT;