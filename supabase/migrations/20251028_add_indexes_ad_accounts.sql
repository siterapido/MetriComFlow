-- Migration: Add missing indexes for ad_accounts foreign keys
-- Reason: Supabase Advisors flagged unindexed foreign keys for connected_by and organization_id
-- Date: 2025-10-28

BEGIN;

-- Covering index for connected_by (FK to profiles.id)
CREATE INDEX IF NOT EXISTS idx_ad_accounts_connected_by
  ON public.ad_accounts(connected_by);

-- Covering index for organization_id (FK to organizations.id)
CREATE INDEX IF NOT EXISTS idx_ad_accounts_organization_id
  ON public.ad_accounts(organization_id);

COMMIT;