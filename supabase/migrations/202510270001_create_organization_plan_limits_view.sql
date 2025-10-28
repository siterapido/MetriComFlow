-- Create materialized view for organization plan limits
-- This view combines subscription, plan, and usage data for efficient querying

CREATE OR REPLACE VIEW organization_plan_limits AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  sp.id AS plan_id,
  sp.name AS plan_name,
  sp.slug AS plan_slug,
  sp.max_ad_accounts,
  sp.max_users,
  sp.has_crm_access,
  sp.features,
  COALESCE(
    (SELECT COUNT(*) FROM ad_accounts WHERE organization_id = o.id),
    0
  ) AS current_ad_accounts,
  COALESCE(
    (SELECT COUNT(*) FROM organization_memberships WHERE organization_id = o.id AND is_active = true),
    0
  ) AS current_users,
  os.status AS subscription_status,
  os.current_period_end,
  GREATEST(0, sp.max_ad_accounts - COALESCE(
    (SELECT COUNT(*) FROM ad_accounts WHERE organization_id = o.id),
    0
  )) AS remaining_ad_accounts,
  GREATEST(0, sp.max_users - COALESCE(
    (SELECT COUNT(*) FROM organization_memberships WHERE organization_id = o.id AND is_active = true),
    0
  )) AS remaining_users,
  CASE
    WHEN COALESCE(
      (SELECT COUNT(*) FROM ad_accounts WHERE organization_id = o.id),
      0
    ) >= sp.max_ad_accounts THEN true
    ELSE false
  END AS ad_accounts_limit_reached,
  CASE
    WHEN COALESCE(
      (SELECT COUNT(*) FROM organization_memberships WHERE organization_id = o.id AND is_active = true),
      0
    ) >= sp.max_users THEN true
    ELSE false
  END AS users_limit_reached
FROM
  organizations o
  LEFT JOIN organization_subscriptions os ON os.organization_id = o.id
    AND os.status IN ('active', 'trial', 'past_due')
  LEFT JOIN subscription_plans sp ON sp.id = os.plan_id;

-- Grant access to authenticated users
GRANT SELECT ON organization_plan_limits TO authenticated;

-- Add comment
COMMENT ON VIEW organization_plan_limits IS 'Provides real-time organization plan limits and current usage statistics';
