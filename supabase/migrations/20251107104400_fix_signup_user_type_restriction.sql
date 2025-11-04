-- Migration: Fix signup user_type restriction
-- Description: Remove restriction that prevents creating users with user_type owner during signup
-- Created: 2025-11-07

-- =====================================================
-- REMOVE: Triggers that restrict user_type assignment
-- =====================================================

-- Drop the triggers that prevent user_type owner assignment
DROP TRIGGER IF EXISTS enforce_profile_user_type_insert ON public.profiles;
DROP TRIGGER IF EXISTS enforce_profile_user_type_change ON public.profiles;
-- Drop the functions as well
DROP FUNCTION IF EXISTS public.enforce_profile_user_type_on_insert();
DROP FUNCTION IF EXISTS public.enforce_profile_user_type_change();
-- =====================================================
-- UPDATE: handle_new_user function
-- =====================================================
-- Modify to create basic profile without setting user_type
-- The user_type will be set by the Edge Function after signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create basic profile record without setting user_type
  -- This avoids the restriction and allows the Edge Function to handle promotion
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.handle_new_user IS 'Creates basic profile on auth.users insert; user_type and organization setup handled by Edge Function';
-- =====================================================
-- OPTIONAL: Add safer user_type policies
-- =====================================================
-- Instead of triggers, use RLS policies for better control

-- Allow users to update their own basic profile info but not user_type
DROP POLICY IF EXISTS "Users can update own profile basic info" ON profiles;
CREATE POLICY "Users can update own profile basic info"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND 
    -- Prevent users from changing their own user_type
    user_type IS NOT DISTINCT FROM (SELECT user_type FROM profiles WHERE id = auth.uid())
  );
-- Only owners can modify user_type of any profile
DROP POLICY IF EXISTS "Owners can update any profile user_type" ON profiles;
CREATE POLICY "Owners can update any profile user_type"
  ON profiles FOR UPDATE
  USING (is_owner(auth.uid()));
-- =====================================================
-- NOTES
-- =====================================================
-- After this migration:
-- 1. New users will be created with default user_type (sales)
-- 2. An Edge Function should be called after signup to:
--    - Promote the user to 'owner' if needed
--    - Create the organization
--    - Set up organization membership
-- 3. This approach is more secure and flexible than triggers;
