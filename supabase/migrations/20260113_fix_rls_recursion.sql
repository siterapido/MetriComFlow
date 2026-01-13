-- Fix RLS Infinite Recursion on organization_memberships

-- 1. Create a secure function to get user's organization IDs
-- This function runs with SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id 
  FROM public.organization_memberships 
  WHERE profile_id = auth.uid() 
  AND is_active = TRUE;
$$;

-- 2. Update the recursive policy to use the secure function
-- This breaks the infinite loop: checking membership now uses the function 
-- which doesn't trigger the policy check on itself recursively
DROP POLICY IF EXISTS "Members can view memberships for their organizations" ON public.organization_memberships;

CREATE POLICY "Members can view memberships for their organizations"
  ON public.organization_memberships FOR SELECT
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids()
    )
  );
