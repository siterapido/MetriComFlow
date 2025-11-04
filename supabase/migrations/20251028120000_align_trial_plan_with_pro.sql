-- =====================================================
-- Align "teste"/"trial" plans capabilities with Pro plan
-- =====================================================

WITH pro_plan AS (
  SELECT max_ad_accounts, max_users, has_crm_access, features
  FROM public.subscription_plans
  WHERE slug = 'pro'
  LIMIT 1
)
UPDATE public.subscription_plans AS target
SET
  max_ad_accounts = pro_plan.max_ad_accounts,
  max_users = pro_plan.max_users,
  has_crm_access = pro_plan.has_crm_access,
  features = pro_plan.features,
  updated_at = NOW()
FROM pro_plan
WHERE target.slug IN ('teste', 'trial');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'organization_plan_limits'
  ) THEN
    REFRESH MATERIALIZED VIEW public.organization_plan_limits;
  END IF;
END $$;
