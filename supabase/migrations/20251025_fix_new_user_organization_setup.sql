-- Migration: Fix New User Organization Setup
-- Description: Ensures new users are created as organization owners with automatic org creation
-- Created: 2025-10-25

-- =====================================================
-- UPDATE: handle_new_user function
-- =====================================================
-- This function now:
-- 1. Creates profile with user_type = 'owner' (not 'sales')
-- 2. Creates a personal organization for the new user
-- 3. Creates organization_membership with role = 'owner'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Extract full name
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- 1. Create profile with owner user_type (not sales)
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    'owner'::public.user_type -- Changed from 'sales' to 'owner'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create personal organization for the new user
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    user_full_name || '''s Organization', -- e.g., "John's Organization"
    lower(regexp_replace(user_full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- 3. Create organization membership with owner role
  -- Note: The trigger trg_ensure_owner_membership will also run, but this is idempotent
  INSERT INTO public.organization_memberships (organization_id, profile_id, role, is_active, joined_at, invited_by)
  VALUES (new_org_id, NEW.id, 'owner', TRUE, NOW(), NEW.id)
  ON CONFLICT (organization_id, profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile, organization, and owner membership for new users';
-- =====================================================
-- BACKFILL: Fix existing users without organizations
-- =====================================================
-- This ensures any existing users who registered before this fix
-- also get their personal organizations

DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  FOR user_record IN
    SELECT p.id, p.full_name, p.email
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      WHERE om.profile_id = p.id AND om.is_active = TRUE
    )
  LOOP
    -- Create organization
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(user_record.full_name, user_record.email) || '''s Organization',
      lower(regexp_replace(COALESCE(user_record.full_name, user_record.email), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 8),
      user_record.id
    )
    RETURNING id INTO new_org_id;

    -- Create owner membership
    INSERT INTO public.organization_memberships (organization_id, profile_id, role, is_active, joined_at, invited_by)
    VALUES (new_org_id, user_record.id, 'owner', TRUE, NOW(), user_record.id)
    ON CONFLICT (organization_id, profile_id) DO NOTHING;

    RAISE NOTICE 'Created organization % for user %', new_org_id, user_record.email;
  END LOOP;
END;
$$;
