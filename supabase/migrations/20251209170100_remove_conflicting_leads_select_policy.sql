-- Migration: Remove conflicting SELECT policy on leads
-- Description: Remove old "Users can view leads in their organization" policy that conflicts with assignee restriction
-- Created: 2025-12-09

BEGIN;

-- Drop the old conflicting policy that allows all org members to see all leads
DROP POLICY IF EXISTS "Users can view leads in their organization" ON public.leads;

COMMIT;

-- Verify: Now only "Users can view assigned or all leads based on role" policy should remain for SELECT
