-- Migration: Subscription Plans & Organization Subscriptions
-- Description: Implements subscription tiers with usage limits and billing management
-- Created: 2025-10-26

-- =====================================================
-- SUBSCRIPTION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),

  -- Feature limits
  max_ad_accounts INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  has_crm_access BOOLEAN NOT NULL DEFAULT FALSE,

  -- Additional features stored as JSONB for flexibility
  features JSONB DEFAULT '[]'::JSONB,

  -- Display order and visibility
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE, -- Highlight as "Most Popular"

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_plans'
      AND policyname = 'Anyone can view active subscription plans'
  ) THEN
    CREATE POLICY "Anyone can view active subscription plans"
      ON public.subscription_plans FOR SELECT
      USING (is_active = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_plans'
      AND policyname = 'Service role can manage plans'
  ) THEN
    CREATE POLICY "Service role can manage plans"
      ON public.subscription_plans FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role')
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON public.subscription_plans(display_order);

-- =====================================================
-- ORGANIZATION SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trial')),

  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Billing details
  payment_method TEXT, -- e.g., 'credit_card', 'boleto', 'pix'
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount DECIMAL(10, 2),
  next_billing_date TIMESTAMP WITH TIME ZONE,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_subscriptions'
      AND policyname = 'Members can view organization subscription'
  ) THEN
    CREATE POLICY "Members can view organization subscription"
      ON public.organization_subscriptions FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.organization_memberships om
          WHERE om.organization_id = organization_subscriptions.organization_id
            AND om.profile_id = auth.uid()
            AND om.is_active = TRUE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_subscriptions'
      AND policyname = 'Owners can manage organization subscription'
  ) THEN
    CREATE POLICY "Owners can manage organization subscription"
      ON public.organization_subscriptions FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.organizations org
          WHERE org.id = organization_subscriptions.organization_id
            AND org.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.organizations org
          WHERE org.id = organization_subscriptions.organization_id
            AND org.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON public.organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON public.organization_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON public.organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_next_billing ON public.organization_subscriptions(next_billing_date);

-- =====================================================
-- SUBSCRIPTION USAGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Current usage counts
  ad_accounts_count INTEGER NOT NULL DEFAULT 0,
  active_users_count INTEGER NOT NULL DEFAULT 0,

  -- Usage history (for analytics)
  usage_history JSONB DEFAULT '[]'::JSONB,

  -- Timestamps
  last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_usage'
      AND policyname = 'Members can view organization usage'
  ) THEN
    CREATE POLICY "Members can view organization usage"
      ON public.subscription_usage FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.organization_memberships om
          WHERE om.organization_id = subscription_usage.organization_id
            AND om.profile_id = auth.uid()
            AND om.is_active = TRUE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_usage'
      AND policyname = 'System can update usage'
  ) THEN
    CREATE POLICY "System can update usage"
      ON public.subscription_usage FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_usage_org ON public.subscription_usage(organization_id);

-- =====================================================
-- MATERIALIZED VIEW: ORGANIZATION PLAN LIMITS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'organization_plan_limits'
  ) THEN
    EXECUTE $$
      CREATE MATERIALIZED VIEW public.organization_plan_limits AS
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
        COALESCE(su.ad_accounts_count, 0) AS current_ad_accounts,
        COALESCE(su.active_users_count, 0) AS current_users,
        os.status AS subscription_status,
        os.current_period_end,
        (sp.max_ad_accounts - COALESCE(su.ad_accounts_count, 0)) AS remaining_ad_accounts,
        (sp.max_users - COALESCE(su.active_users_count, 0)) AS remaining_users,
        (COALESCE(su.ad_accounts_count, 0) >= sp.max_ad_accounts) AS ad_accounts_limit_reached,
        (COALESCE(su.active_users_count, 0) >= sp.max_users) AS users_limit_reached
      FROM public.organizations o
      LEFT JOIN public.organization_subscriptions os ON os.organization_id = o.id
        AND os.status IN ('active', 'trial')
      LEFT JOIN public.subscription_plans sp ON sp.id = os.plan_id
      LEFT JOIN public.subscription_usage su ON su.organization_id = o.id;
    $$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'organization_plan_limits'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_org_plan_limits_org ON public.organization_plan_limits(organization_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'organization_plan_limits'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.organization_plan_limits TO authenticated, anon';
  END IF;
END $$;

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_organization_plan_limits()
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'organization_plan_limits'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.organization_plan_limits;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR USAGE TRACKING
-- =====================================================

-- Function to update subscription usage counts
CREATE OR REPLACE FUNCTION public.update_subscription_usage_counts()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Determine organization_id based on table
  IF TG_TABLE_NAME = 'organization_memberships' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'ad_accounts' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Upsert usage record with current counts
  INSERT INTO public.subscription_usage (organization_id, ad_accounts_count, active_users_count, updated_at)
  VALUES (
    org_id,
    (SELECT COUNT(*) FROM public.ad_accounts WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM public.organization_memberships WHERE organization_id = org_id AND is_active = TRUE),
    NOW()
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    ad_accounts_count = (SELECT COUNT(*) FROM public.ad_accounts WHERE organization_id = org_id),
    active_users_count = (SELECT COUNT(*) FROM public.organization_memberships WHERE organization_id = org_id AND is_active = TRUE),
    updated_at = NOW();

  -- Refresh materialized view (async via pg_notify for production)
  PERFORM public.refresh_organization_plan_limits();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on organization_memberships changes
DROP TRIGGER IF EXISTS trg_update_usage_on_membership_change ON public.organization_memberships;
CREATE TRIGGER trg_update_usage_on_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_usage_counts();

-- Trigger on ad_accounts changes (need to add organization_id to ad_accounts first)
-- This will be added after backfilling ad_accounts with organization_id

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if organization can add ad account
CREATE OR REPLACE FUNCTION public.can_add_ad_account(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  limits RECORD;
BEGIN
  SELECT * INTO limits
  FROM public.organization_plan_limits
  WHERE organization_id = org_id;

  IF limits IS NULL THEN
    -- No subscription = no limits (shouldn't happen)
    RETURN TRUE;
  END IF;

  RETURN NOT limits.ad_accounts_limit_reached;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if organization can add user
CREATE OR REPLACE FUNCTION public.can_add_user(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  limits RECORD;
BEGIN
  SELECT * INTO limits
  FROM public.organization_plan_limits
  WHERE organization_id = org_id;

  IF limits IS NULL THEN
    -- No subscription = no limits (shouldn't happen)
    RETURN TRUE;
  END IF;

  RETURN NOT limits.users_limit_reached;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get organization's current plan
CREATE OR REPLACE FUNCTION public.get_organization_plan(org_id UUID)
RETURNS TABLE (
  plan_id UUID,
  plan_name TEXT,
  plan_slug TEXT,
  max_ad_accounts INTEGER,
  max_users INTEGER,
  has_crm_access BOOLEAN,
  features JSONB,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.slug AS plan_slug,
    sp.max_ad_accounts,
    sp.max_users,
    sp.has_crm_access,
    sp.features,
    os.status AS subscription_status,
    os.current_period_end
  FROM public.organization_subscriptions os
  JOIN public.subscription_plans sp ON sp.id = os.plan_id
  WHERE os.organization_id = org_id
    AND os.status IN ('active', 'trial')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- SEED DATA: DEFAULT SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO public.subscription_plans (name, slug, description, price, max_ad_accounts, max_users, has_crm_access, features, display_order, is_popular)
VALUES
  (
    'Básico',
    'basico',
    'Ideal para começar com gestão de anúncios',
    97.00,
    2,
    1,
    FALSE,
    '["Dashboard Geral", "Métricas Meta Ads", "2 Contas de Anúncio"]'::JSONB,
    1,
    FALSE
  ),
  (
    'Intermediário',
    'intermediario',
    'Perfeito para equipes em crescimento',
    197.00,
    10,
    3,
    TRUE,
    '["Dashboard Geral", "Métricas Meta Ads", "CRM Completo", "Gestão de Leads", "Formulários", "10 Contas de Anúncio", "Equipe de 3 Usuários"]'::JSONB,
    2,
    TRUE -- Most popular
  ),
  (
    'Pro',
    'pro',
    'Solução completa para grandes equipes',
    497.00,
    20,
    10,
    TRUE,
    '["Dashboard Geral", "Métricas Meta Ads", "CRM Completo", "Gestão de Leads", "Formulários", "Metas Avançadas", "20 Contas de Anúncio", "Equipe de 10 Usuários", "Suporte Prioritário"]'::JSONB,
    3,
    FALSE
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- BACKFILL: CREATE DEFAULT SUBSCRIPTIONS FOR EXISTING ORGS
-- =====================================================

-- Give all existing organizations a "Pro" plan (trial) for 30 days
DO $$
DECLARE
  org_record RECORD;
  pro_plan_id UUID;
BEGIN
  -- Get Pro plan ID
  SELECT id INTO pro_plan_id
  FROM public.subscription_plans
  WHERE slug = 'pro'
  LIMIT 1;

  IF pro_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found. Run seed data first.';
  END IF;

  -- Create trial subscriptions for all existing organizations
  FOR org_record IN
    SELECT id FROM public.organizations
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_subscriptions
      WHERE organization_id = organizations.id
    )
  LOOP
    INSERT INTO public.organization_subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      trial_end,
      next_billing_date,
      metadata
    )
    VALUES (
      org_record.id,
      pro_plan_id,
      'trial', -- Trial status
      NOW(),
      NOW() + INTERVAL '30 days',
      NOW() + INTERVAL '30 days',
      NOW() + INTERVAL '30 days',
      json_build_object('backfilled', TRUE, 'trial_granted', TRUE)
    );
  END LOOP;
END;
$$;

-- =====================================================
-- BACKFILL: INITIALIZE USAGE TRACKING
-- =====================================================

-- Calculate initial usage for all organizations
INSERT INTO public.subscription_usage (organization_id, ad_accounts_count, active_users_count, updated_at)
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM public.ad_accounts aa WHERE aa.connected_by IN (
    SELECT profile_id FROM public.organization_memberships om2 WHERE om2.organization_id = o.id
  )) AS ad_accounts_count,
  (SELECT COUNT(*) FROM public.organization_memberships om WHERE om.organization_id = o.id AND om.is_active = TRUE) AS active_users_count,
  NOW() AS updated_at
FROM public.organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- Refresh materialized view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'organization_plan_limits'
  ) THEN
    PERFORM public.refresh_organization_plan_limits();
  END IF;
END $$;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Add updated_at trigger to subscription_plans
DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

-- Add updated_at trigger to organization_subscriptions
DROP TRIGGER IF EXISTS trg_organization_subscriptions_updated_at ON public.organization_subscriptions;
CREATE TRIGGER trg_organization_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

-- Add updated_at trigger to subscription_usage
DROP TRIGGER IF EXISTS trg_subscription_usage_updated_at ON public.subscription_usage;
CREATE TRIGGER trg_subscription_usage_updated_at
  BEFORE UPDATE ON public.subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp_updated_at();

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans with feature limits';
COMMENT ON TABLE public.organization_subscriptions IS 'Active subscriptions for organizations';
COMMENT ON TABLE public.subscription_usage IS 'Real-time tracking of resource usage per organization';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'organization_plan_limits'
  ) THEN
    EXECUTE $$COMMENT ON MATERIALIZED VIEW public.organization_plan_limits IS 'Combined view of plan limits and current usage for easy validation'$$;
  END IF;
END $$;
