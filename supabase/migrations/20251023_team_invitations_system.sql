-- Migration: Team Invitations & Organization Memberships
-- Description: Introduces organizations, memberships, invitation workflow, and supporting helpers
-- Created: 2025-10-23

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = organizations.id
        AND om.profile_id = auth.uid()
        AND om.is_active = TRUE
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- =====================================================
-- ORGANIZATION MEMBERSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, profile_id)
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memberships for their organizations"
  ON public.organization_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
        AND om.profile_id = auth.uid()
        AND om.is_active = TRUE
    )
  );

CREATE POLICY "Owners can manage memberships"
  ON public.organization_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = organization_memberships.organization_id
        AND org.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = organization_memberships.organization_id
        AND org.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_membership_org ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_profile ON public.organization_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_active ON public.organization_memberships(is_active);

CREATE OR REPLACE FUNCTION public.ensure_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_memberships (organization_id, profile_id, role, is_active, joined_at, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', TRUE, NOW(), NEW.owner_id)
  ON CONFLICT (organization_id, profile_id)
  DO UPDATE SET
    role = 'owner',
    is_active = TRUE,
    left_at = NULL,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_owner_membership ON public.organizations;

CREATE TRIGGER trg_ensure_owner_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_membership();

CREATE OR REPLACE FUNCTION public.set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_memberships_updated_at ON public.organization_memberships;
CREATE TRIGGER trg_org_memberships_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

-- =====================================================
-- TEAM INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  user_type user_type NOT NULL DEFAULT 'sales',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::JSONB,
  UNIQUE (email, organization_id, status) WHERE status = 'pending'
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view organization invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = team_invitations.organization_id
        AND org.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage organization invitations"
  ON public.team_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = team_invitations.organization_id
        AND org.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = team_invitations.organization_id
        AND org.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

CREATE OR REPLACE FUNCTION public.expire_old_team_invitations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < NOW() THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expire_team_invitation ON public.team_invitations;
CREATE TRIGGER trg_expire_team_invitation
  BEFORE INSERT OR UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.expire_old_team_invitations();

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(invitation_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  organization_id UUID,
  organization_name TEXT,
  invited_by UUID,
  role TEXT,
  user_type user_type,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ti.id,
    ti.email,
    ti.organization_id,
    org.name AS organization_name,
    ti.invited_by,
    ti.role,
    ti.user_type,
    ti.status,
    ti.created_at,
    ti.expires_at,
    ti.accepted_at,
    ti.accepted_by
  FROM public.team_invitations ti
  JOIN public.organizations org ON org.id = ti.organization_id
  WHERE ti.token = invitation_token;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_invitation_by_token IS 'Returns invitation details with organization metadata based on a unique token';

-- =====================================================
-- DATA BACKFILL HELPERS
-- =====================================================

DO $$
DECLARE
  owner_record RECORD;
BEGIN
  FOR owner_record IN
    SELECT DISTINCT ON (p.id)
      p.id AS owner_id,
      COALESCE(p.full_name, 'Equipe Metricom') AS owner_name
    FROM public.profiles p
    WHERE p.user_type = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.organizations org WHERE org.owner_id = p.id
      )
  LOOP
    INSERT INTO public.organizations (name, owner_id, billing_email, metadata)
    VALUES (
      owner_record.owner_name || ' Org',
      owner_record.owner_id,
      NULL,
      json_build_object('seeded', TRUE)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

