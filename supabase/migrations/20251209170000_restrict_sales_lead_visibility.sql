-- Migration: Restrict sales users to only see assigned leads
-- Description: Modify RLS policy so sales/crm_user only see leads where assignee_id = their user ID
-- Created: 2025-12-09

BEGIN;

-- Drop existing SELECT policy for leads
DROP POLICY IF EXISTS "Users with CRM access can view leads" ON public.leads;

-- Create new policy with assignee restriction
CREATE POLICY "Users can view assigned or all leads based on role"
  ON public.leads FOR SELECT
  USING (
    -- Owners see all leads in their organization (no restriction)
    is_owner(auth.uid())
    OR
    -- Sales and CRM users only see leads assigned to them
    (
      has_crm_access(auth.uid()) 
      AND assignee_id = auth.uid()
    )
  );

COMMIT;

-- Add helpful comment
COMMENT ON POLICY "Users can view assigned or all leads based on role" ON public.leads IS 
  'Owners see all leads. Sales and CRM users only see leads where they are the assignee.';
