-- Migration: Fix RLS to allow admins to manage invitations
-- Description: Replace owner-only policies with role-based checks
-- Date: 2025-11-04
-- Issue: #5 - RLS Policy too restrictive, admin cannot send invites

-- Drop existing policies that only check owner_id
DROP POLICY IF EXISTS "Owners can view organization invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Owners can manage organization invitations" ON public.team_invitations;

-- Create new policies that allow both owners and admins
CREATE POLICY "Organization members with admin role can view invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = team_invitations.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = TRUE
    )
  );

CREATE POLICY "Organization members with admin role can manage invitations"
  ON public.team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = team_invitations.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = team_invitations.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = TRUE
    )
  );
