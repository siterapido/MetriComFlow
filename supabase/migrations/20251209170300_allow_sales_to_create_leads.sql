-- Migration: Allow sales and crm_user to create and update leads
-- Description: Update INSERT and UPDATE policies to allow sales/crm_user to create leads
-- Created: 2025-12-09

BEGIN;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create leads in their organization" ON public.leads;
DROP POLICY IF EXISTS "Users with CRM access can create leads" ON public.leads;

-- Create new INSERT policy that allows sales/crm_user to create leads
CREATE POLICY "Users with CRM access can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    has_crm_access(auth.uid())
    AND (
      -- Organization must be one the user belongs to
      organization_id IN (
        SELECT organization_id 
        FROM organization_memberships 
        WHERE profile_id = auth.uid() AND is_active = TRUE
      )
      OR
      -- Or user is the owner of the organization
      organization_id IN (
        SELECT id 
        FROM organizations 
        WHERE owner_id = auth.uid()
      )
    )
    AND (
      -- If assignee_id is set, it must be an active member
      assignee_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships om
        WHERE om.profile_id = assignee_id AND om.is_active = TRUE
      )
    )
  );

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update leads in their organization" ON public.leads;
DROP POLICY IF EXISTS "Users with CRM access can update leads" ON public.leads;

-- Create new UPDATE policy that allows sales/crm_user to update leads
CREATE POLICY "Users with CRM access can update leads"
  ON public.leads FOR UPDATE
  USING (
    has_crm_access(auth.uid())
    AND (
      -- Can update if owner
      is_owner(auth.uid())
      OR
      -- Or if it's their assigned lead
      assignee_id = auth.uid()
    )
  )
  WITH CHECK (
    has_crm_access(auth.uid())
    AND (
      -- If assignee_id is being set, it must be an active member
      assignee_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_memberships om
        WHERE om.profile_id = assignee_id AND om.is_active = TRUE
      )
    )
  );

COMMIT;

COMMENT ON POLICY "Users with CRM access can create leads" ON public.leads IS 
  'Allows owners, sales, and crm_user to create leads in their organization';
  
COMMENT ON POLICY "Users with CRM access can update leads" ON public.leads IS 
  'Owners can update all leads. Sales/CRM users can only update their assigned leads';
