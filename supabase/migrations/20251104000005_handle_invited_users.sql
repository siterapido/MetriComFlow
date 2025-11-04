-- Migration: Update handle_new_user for invited users
-- Description: Modify handle_new_user to support both personal orgs and invited users
-- Date: 2025-11-04
-- Purpose: When a user is invited via Supabase Auth, organization_id is passed in user_metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  invited_org_id UUID;
  invited_role TEXT;
  invited_user_type TEXT;
BEGIN
  -- Extract data from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  invited_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  invited_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  invited_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'sales');

  -- 1. Create profile
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    invited_user_type::public.user_type
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Handle organization membership
  IF invited_org_id IS NOT NULL THEN
    -- User was invited to an existing organization
    INSERT INTO public.organization_memberships (
      organization_id,
      profile_id,
      role,
      is_active,
      joined_at,
      invited_by
    )
    VALUES (
      invited_org_id,
      NEW.id,
      invited_role,
      TRUE,
      NOW(),
      NEW.id
    )
    ON CONFLICT (organization_id, profile_id) DO NOTHING;
  ELSE
    -- User registered on their own - create personal organization
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      user_full_name || '''s Organization',
      lower(regexp_replace(user_full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 8),
      NEW.id
    )
    RETURNING id INTO new_org_id;

    -- Create owner membership for personal org
    INSERT INTO public.organization_memberships (
      organization_id,
      profile_id,
      role,
      is_active,
      joined_at,
      invited_by
    )
    VALUES (
      new_org_id,
      NEW.id,
      'owner',
      TRUE,
      NOW(),
      NEW.id
    )
    ON CONFLICT (organization_id, profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and handles organization membership for both new users and invited users';
