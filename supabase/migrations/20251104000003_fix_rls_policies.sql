-- Migration: Fix RLS policies to avoid trigger conflict
-- Description: Simplify RLS policies to allow proper INSERT
-- Date: 2025-11-04

-- Drop the problematic policies
DROP POLICY IF EXISTS "Organization members with admin role can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Organization members with admin role can manage invitations" ON public.team_invitations;

-- Create simpler policies that allow owner/admin to manage invitations
-- SELECT policy: view invitations if you're owner or admin of the org
CREATE POLICY "Admins can view organization invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships
      WHERE organization_id = team_invitations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    )
  );

-- INSERT policy: owner/admin can create invitations
CREATE POLICY "Admins can create organization invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships
      WHERE organization_id = team_invitations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    )
  );

-- UPDATE policy: owner/admin can update invitations
CREATE POLICY "Admins can update organization invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships
      WHERE organization_id = team_invitations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    )
  );

-- DELETE policy: owner/admin can delete invitations
CREATE POLICY "Admins can delete organization invitations"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships
      WHERE organization_id = team_invitations.organization_id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    )
  );
