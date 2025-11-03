-- Migration: Update RLS Policies for Organization-Scoped Access
-- Description: Replaces permissive "Anyone can view" policies with proper organization-based
--              access control to prevent data leaks between organizations
-- Created: 2025-11-03
-- Critical: This migration is REQUIRED for production security
-- Depends on: 20251103120000_add_organization_id_to_core_tables.sql

-- =====================================================
-- HELPER FUNCTION: Check Organization Membership
-- =====================================================

-- Function to check if current user is a member of given organization
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.organization_id = org_id
      AND om.profile_id = auth.uid()
      AND om.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_is_org_member IS
  'Returns true if the current user (auth.uid()) is an active member of the specified organization';

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = auth.uid()
    AND om.is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_organization_ids IS
  'Returns all organization IDs that the current user is an active member of';

-- =====================================================
-- UPDATE RLS POLICIES FOR LEADS TABLE
-- =====================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- Create organization-scoped policies for leads
CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can create leads in their organization"
  ON public.leads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can update leads in their organization"
  ON public.leads FOR UPDATE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Organization members can delete leads"
  ON public.leads FOR DELETE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR CLIENT_GOALS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view client goals" ON public.client_goals;
DROP POLICY IF EXISTS "Authenticated users can create goals" ON public.client_goals;
DROP POLICY IF EXISTS "Authenticated users can update goals" ON public.client_goals;

-- Create organization-scoped policies for goals
CREATE POLICY "Users can view goals in their organization"
  ON public.client_goals FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can create goals in their organization"
  ON public.client_goals FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can update goals in their organization"
  ON public.client_goals FOR UPDATE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete goals in their organization"
  ON public.client_goals FOR DELETE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR LABELS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view labels" ON public.labels;
DROP POLICY IF EXISTS "Authenticated users can manage labels" ON public.labels;

-- Create organization-scoped policies for labels
CREATE POLICY "Users can view labels in their organization"
  ON public.labels FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can create labels in their organization"
  ON public.labels FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can update labels in their organization"
  ON public.labels FOR UPDATE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete labels in their organization"
  ON public.labels FOR DELETE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR REVENUE_RECORDS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view revenue records" ON public.revenue_records;
DROP POLICY IF EXISTS "Authenticated users can manage revenue" ON public.revenue_records;

-- Create organization-scoped policies for revenue records
CREATE POLICY "Users can view revenue in their organization"
  ON public.revenue_records FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can create revenue in their organization"
  ON public.revenue_records FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can update revenue in their organization"
  ON public.revenue_records FOR UPDATE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete revenue in their organization"
  ON public.revenue_records FOR DELETE
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR LEAD_ACTIVITY TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view lead activity" ON public.lead_activity;
DROP POLICY IF EXISTS "System can insert activity" ON public.lead_activity;

-- Create organization-scoped policies for lead activity
CREATE POLICY "Users can view activity in their organization"
  ON public.lead_activity FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "System can create activity in user's organization"
  ON public.lead_activity FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR COMMENTS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Create organization-scoped policies for comments
CREATE POLICY "Users can view comments in their organization"
  ON public.comments FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can create comments in their organization"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can update own comments in their organization"
  ON public.comments FOR UPDATE
  USING (
    auth.uid() = user_id
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete own comments in their organization"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id
    AND organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR ATTACHMENTS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.attachments;

-- Create organization-scoped policies for attachments
CREATE POLICY "Users can view attachments in their organization"
  ON public.attachments FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can upload attachments in their organization"
  ON public.attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can delete own attachments in their organization"
  ON public.attachments FOR DELETE
  USING (
    auth.uid() = uploaded_by
    AND organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR CHECKLIST_ITEMS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can manage checklist items" ON public.checklist_items;

-- Create organization-scoped policies for checklist items
CREATE POLICY "Users can view checklist items in their organization"
  ON public.checklist_items FOR SELECT
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "Users can manage checklist items in their organization"
  ON public.checklist_items FOR ALL
  USING (
    organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT public.user_organization_ids())
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR LEAD_LABELS TABLE
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can view lead labels" ON public.lead_labels;
DROP POLICY IF EXISTS "Users can manage lead labels" ON public.lead_labels;

-- Create organization-scoped policies for lead_labels junction table
-- (checks organization through lead's organization_id)
CREATE POLICY "Users can view lead labels in their organization"
  ON public.lead_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_labels.lead_id
        AND l.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY "Users can manage lead labels in their organization"
  ON public.lead_labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_labels.lead_id
        AND l.organization_id IN (SELECT public.user_organization_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_labels.lead_id
        AND l.organization_id IN (SELECT public.user_organization_ids())
    )
  );

-- =====================================================
-- UPDATE RLS POLICIES FOR STOPPED_SALES TABLE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stopped_sales') THEN
    -- Drop old policy
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view stopped sales" ON public.stopped_sales';

    -- Create organization-scoped policy
    EXECUTE '
      CREATE POLICY "Users can view stopped sales in their organization"
        ON public.stopped_sales FOR SELECT
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';

    EXECUTE '
      CREATE POLICY "Users can manage stopped sales in their organization"
        ON public.stopped_sales FOR ALL
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
        WITH CHECK (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES FOR TASKS TABLE (IF EXISTS)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks';

    -- Create organization-scoped policies
    EXECUTE '
      CREATE POLICY "Users can view tasks in their organization"
        ON public.tasks FOR SELECT
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';

    EXECUTE '
      CREATE POLICY "Users can manage tasks in their organization"
        ON public.tasks FOR ALL
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
        WITH CHECK (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES FOR INTERACTIONS TABLE (IF EXISTS)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view interactions" ON public.interactions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage interactions" ON public.interactions';

    -- Create organization-scoped policies
    EXECUTE '
      CREATE POLICY "Users can view interactions in their organization"
        ON public.interactions FOR SELECT
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';

    EXECUTE '
      CREATE POLICY "Users can manage interactions in their organization"
        ON public.interactions FOR ALL
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
        WITH CHECK (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';
  END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES FOR TEAM_MEMBERS TABLE
-- =====================================================

-- Note: team_members should probably be deprecated in favor of organization_memberships
-- For now, we'll make it organization-scoped if it has organization_id column

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'organization_id'
  ) THEN
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members';

    -- Create organization-scoped policies
    EXECUTE '
      CREATE POLICY "Users can view team members in their organization"
        ON public.team_members FOR SELECT
        USING (
          organization_id IN (SELECT public.user_organization_ids())
        )
    ';

    EXECUTE '
      CREATE POLICY "Admins can manage team members in their organization"
        ON public.team_members FOR ALL
        USING (
          organization_id IN (SELECT public.user_organization_ids())
          AND EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.profile_id = auth.uid()
              AND om.organization_id = team_members.organization_id
              AND om.role IN (''owner'', ''admin'')
              AND om.is_active = TRUE
          )
        )
    ';
  END IF;
END $$;

-- =====================================================
-- UPDATE DASHBOARD VIEWS TO USE organization_id
-- =====================================================

-- Drop old dashboard_kpis view (it queries without organization filter)
DROP VIEW IF EXISTS public.dashboard_kpis CASCADE;

-- Create organization-scoped dashboard KPIs function instead
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(org_id UUID)
RETURNS TABLE (
  faturamento_mensal NUMERIC,
  faturamento_anual NUMERIC,
  oportunidades_ativas BIGINT,
  pipeline_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(amount), 0)
     FROM public.revenue_records
     WHERE category = 'new_up'
       AND date >= DATE_TRUNC('month', CURRENT_DATE)
       AND organization_id = org_id
    ) as faturamento_mensal,

    (SELECT COALESCE(SUM(amount), 0)
     FROM public.revenue_records
     WHERE category = 'new_up'
       AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND organization_id = org_id
    ) as faturamento_anual,

    (SELECT COUNT(*)
     FROM public.leads
     WHERE status != 'done'
       AND organization_id = org_id
    ) as oportunidades_ativas,

    (SELECT COALESCE(SUM(value), 0)
     FROM public.leads
     WHERE status != 'done'
       AND organization_id = org_id
    ) as pipeline_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_dashboard_kpis IS
  'Returns dashboard KPIs scoped to a specific organization';

-- Drop old monthly_revenue view
DROP VIEW IF EXISTS public.monthly_revenue CASCADE;

-- Create organization-scoped monthly revenue function
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(org_id UUID)
RETURNS TABLE (
  month TEXT,
  year INTEGER,
  category TEXT,
  total_amount NUMERIC,
  record_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.month,
    rr.year,
    rr.category,
    SUM(rr.amount) as total_amount,
    COUNT(*) as record_count
  FROM public.revenue_records rr
  WHERE rr.organization_id = org_id
  GROUP BY rr.month, rr.year, rr.category
  ORDER BY rr.year DESC,
    CASE rr.month
      WHEN 'Jan' THEN 1
      WHEN 'Fev' THEN 2
      WHEN 'Mar' THEN 3
      WHEN 'Abr' THEN 4
      WHEN 'Mai' THEN 5
      WHEN 'Jun' THEN 6
      WHEN 'Jul' THEN 7
      WHEN 'Ago' THEN 8
      WHEN 'Set' THEN 9
      WHEN 'Out' THEN 10
      WHEN 'Nov' THEN 11
      WHEN 'Dez' THEN 12
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_monthly_revenue IS
  'Returns monthly revenue breakdown scoped to a specific organization';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count new organization-scoped policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE '%organization%';

  RAISE NOTICE '✅ Created % organization-scoped RLS policies', policy_count;

  -- Verify critical policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads'
      AND policyname = 'Users can view leads in their organization'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: Leads view policy not created!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'client_goals'
      AND policyname = 'Users can view goals in their organization'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: Goals view policy not created!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'labels'
      AND policyname = 'Users can view labels in their organization'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: Labels view policy not created!';
  END IF;

  RAISE NOTICE '✅ All critical policies verified';
END $$;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251103120001_update_rls_policies_for_organizations.sql completed successfully';
  RAISE NOTICE '✅ All permissive "Anyone can view" policies replaced with organization-scoped policies';
  RAISE NOTICE '✅ Helper functions created: user_is_org_member(), user_organization_ids()';
  RAISE NOTICE '✅ Dashboard views converted to organization-scoped functions';
  RAISE NOTICE '⚠️  NEXT STEP: Update frontend hooks to use organization filters';
  RAISE NOTICE '⚠️  IMPORTANT: Test with multiple organizations to verify isolation';
END $$;
