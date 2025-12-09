-- Migration: Leads Soft Delete (Lixeira)
-- Description: Adds soft delete support for leads with deleted_at column and updates RLS policies
-- Created: 2025-12-21

BEGIN;

-- =====================================================
-- STEP 1: ADD deleted_at COLUMN TO LEADS TABLE
-- =====================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for performance when filtering deleted leads
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at
  ON public.leads(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- =====================================================
-- STEP 2: UPDATE RLS POLICIES TO FILTER DELETED LEADS
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view leads in their organization" ON public.leads;

-- Create new SELECT policy that excludes deleted leads
CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- STEP 3: UPDATE DELETE POLICY TO USE SOFT DELETE
-- =====================================================

-- Note: We keep the existing DELETE policy but will handle soft delete via UPDATE in the application
-- The DELETE policy remains for potential hard delete scenarios

COMMIT;


