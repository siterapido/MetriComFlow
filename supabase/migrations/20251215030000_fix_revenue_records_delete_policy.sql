-- Fix revenue record deletion policy so lead removal can clean up related entries
-- This adds an organization-scoped DELETE policy after the multi-tenant migration dropped it.

DROP POLICY IF EXISTS "Members can delete revenue in their organization" ON public.revenue_records;

CREATE POLICY "Members can delete revenue in their organization"
  ON public.revenue_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.organization_id = revenue_records.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = TRUE
    )
  );
