-- Migration: Update has_crm_access to include crm_user
-- Description: Allow crm_user type to have CRM access (with assignee restriction via RLS)
-- Created: 2025-12-09

BEGIN;

-- Update has_crm_access function to include crm_user
CREATE OR REPLACE FUNCTION public.has_crm_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_type;
BEGIN
  -- Fetch the user's role; absence means no permissions
  SELECT p.user_type
  INTO user_role
  FROM public.profiles p
  WHERE p.id = user_id;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Owners, sales reps, and CRM users qualify for CRM, subject to plan constraints
  IF user_role NOT IN ('owner', 'sales', 'crm_user') THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    WITH candidate_orgs AS (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.profile_id = user_id
        AND om.is_active = TRUE
      UNION
      SELECT o.id
      FROM public.organizations o
      WHERE o.owner_id = user_id
    ),
    org_plans AS (
      SELECT DISTINCT ON (os.organization_id)
        os.organization_id,
        sp.has_crm_access
      FROM candidate_orgs c
      JOIN public.organization_subscriptions os
        ON os.organization_id = c.organization_id
      JOIN public.subscription_plans sp
        ON sp.id = os.plan_id
      WHERE os.status IN ('active', 'trial', 'past_due')
      ORDER BY
        os.organization_id,
        CASE os.status
          WHEN 'active' THEN 1
          WHEN 'trial' THEN 2
          WHEN 'past_due' THEN 3
          ELSE 4
        END,
        os.updated_at DESC NULLS LAST
    )
    SELECT 1
    FROM org_plans
    WHERE has_crm_access = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

COMMIT;

-- Add comment
COMMENT ON FUNCTION public.has_crm_access IS 'Checks if user can access CRM features (owner, sales, or crm_user)';
