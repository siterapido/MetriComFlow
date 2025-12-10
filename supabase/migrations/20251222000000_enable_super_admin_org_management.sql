-- Migration: Enable Super Admin Organization Management
-- Description: Adds is_super_admin to profiles and enables organization management
-- Created: 2025-12-22

-- Add is_super_admin to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS for organizations
CREATE POLICY "Super admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Super admins can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update all organizations"
  ON public.organizations FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Super admins can delete all organizations"
  ON public.organizations FOR DELETE
  USING (is_super_admin());

-- Update RLS for profiles (to allow viewing owner info of other orgs)
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_super_admin());

-- Grant usage on is_super_admin function
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
