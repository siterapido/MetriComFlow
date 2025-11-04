-- Migration: Enforce that lead assignee is an active org member
-- Description: Tighten RLS so only owner/sales can write, and assignee_id (if set) must be an active member
-- Created: 2025-11-03

BEGIN;
-- Recreate INSERT/UPDATE policies for leads with a WITH CHECK guard on assignee_id
DO $$
BEGIN
  -- INSERT policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users with CRM access can create leads'
  ) THEN
    DROP POLICY "Users with CRM access can create leads" ON public.leads;
  END IF;

  CREATE POLICY "Users with CRM access can create leads"
    ON public.leads FOR INSERT
    WITH CHECK (
      has_crm_access(auth.uid())
      AND (
        assignee_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = assignee_id AND om.is_active = TRUE
        )
      )
    );

  -- UPDATE policy (replace existing simple USING with a WITH CHECK guard)
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users with CRM access can update leads'
  ) THEN
    DROP POLICY "Users with CRM access can update leads" ON public.leads;
  END IF;

  CREATE POLICY "Users with CRM access can update leads"
    ON public.leads FOR UPDATE
    USING (has_crm_access(auth.uid()))
    WITH CHECK (
      has_crm_access(auth.uid())
      AND (
        assignee_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.organization_memberships om
          WHERE om.profile_id = assignee_id AND om.is_active = TRUE
        )
      )
    );
END $$;
COMMIT;
