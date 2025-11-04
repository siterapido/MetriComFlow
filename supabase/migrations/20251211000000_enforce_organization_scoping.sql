-- Migration: Enforce Organization Scoping Across All Tables
-- Description: Add organization_id to critical tables, fix RLS policies, and secure data isolation
-- Created: 2025-12-11
-- CRITICAL: This migration fixes multi-tenancy security issues

-- =====================================================
-- STEP 1: ADD ORGANIZATION_ID TO LEADS TABLE
-- =====================================================

-- Add organization_id column to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add FK constraint
ALTER TABLE public.leads
ADD CONSTRAINT fk_leads_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from created_by user's organization
UPDATE public.leads l
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = l.created_by
  LIMIT 1
)
WHERE organization_id IS NULL AND created_by IS NOT NULL;

-- Backfill remaining leads to first organization (this is a fallback, should not happen)
UPDATE public.leads l
SET organization_id = (
  SELECT id FROM public.organizations
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE public.leads
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for org_id queries
CREATE INDEX IF NOT EXISTS idx_leads_organization ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_status ON public.leads(organization_id, status);

-- =====================================================
-- STEP 2: ADD ORGANIZATION_ID TO CLIENT_GOALS TABLE
-- =====================================================

ALTER TABLE public.client_goals
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.client_goals
ADD CONSTRAINT fk_client_goals_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.client_goals g
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = g.created_by
  LIMIT 1
)
WHERE organization_id IS NULL AND created_by IS NOT NULL;

UPDATE public.client_goals g
SET organization_id = (
  SELECT id FROM public.organizations
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE public.client_goals
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_goals_organization ON public.client_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_org_company ON public.client_goals(organization_id, company_name);

-- =====================================================
-- STEP 3: ADD ORGANIZATION_ID TO REVENUE_RECORDS TABLE
-- =====================================================

ALTER TABLE public.revenue_records
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.revenue_records
ADD CONSTRAINT fk_revenue_records_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.revenue_records r
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = r.created_by
  LIMIT 1
)
WHERE organization_id IS NULL AND created_by IS NOT NULL;

UPDATE public.revenue_records r
SET organization_id = (
  SELECT id FROM public.organizations
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE public.revenue_records
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_records_organization ON public.revenue_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_org_date ON public.revenue_records(organization_id, date DESC);

-- =====================================================
-- STEP 4: ADD ORGANIZATION_ID TO RELATED TABLES
-- =====================================================

-- Comments need organization_id (via lead_id relationship)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.comments
ADD CONSTRAINT fk_comments_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.comments c
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = c.lead_id
)
WHERE organization_id IS NULL;

-- For comments without leads (orphaned), assign to creator's org
UPDATE public.comments c
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = c.user_id
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE public.comments
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_organization ON public.comments(organization_id);

-- Attachments need organization_id (via lead_id)
ALTER TABLE public.attachments
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.attachments
ADD CONSTRAINT fk_attachments_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.attachments a
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = a.lead_id
)
WHERE organization_id IS NULL;

UPDATE public.attachments a
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = a.uploaded_by
  LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE public.attachments
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_organization ON public.attachments(organization_id);

-- Checklist items need organization_id (via lead_id)
ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.checklist_items
ADD CONSTRAINT fk_checklist_items_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.checklist_items ci
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = ci.lead_id
)
WHERE organization_id IS NULL;

ALTER TABLE public.checklist_items
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_items_organization ON public.checklist_items(organization_id);

-- Lead activity needs organization_id
ALTER TABLE public.lead_activity
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.lead_activity
ADD CONSTRAINT fk_lead_activity_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.lead_activity la
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = la.lead_id
)
WHERE organization_id IS NULL;

ALTER TABLE public.lead_activity
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activity_organization ON public.lead_activity(organization_id);

-- Lead labels junction table needs organization_id
ALTER TABLE public.lead_labels
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.lead_labels
ADD CONSTRAINT fk_lead_labels_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.lead_labels ll
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = ll.lead_id
)
WHERE organization_id IS NULL;

ALTER TABLE public.lead_labels
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_labels_organization ON public.lead_labels(organization_id);

-- Stopped sales needs organization_id
ALTER TABLE public.stopped_sales
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.stopped_sales
ADD CONSTRAINT fk_stopped_sales_organization
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.stopped_sales ss
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = ss.lead_id
)
WHERE organization_id IS NULL;

ALTER TABLE public.stopped_sales
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stopped_sales_organization ON public.stopped_sales(organization_id);

-- =====================================================
-- STEP 5: FIX RLS POLICIES FOR LEADS
-- =====================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- Create secure organization-scoped policies
CREATE POLICY "Users can view leads in their organization"
  ON public.leads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can create leads in their organization"
  ON public.leads FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can update leads in their organization"
  ON public.leads FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete leads in their organization"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.organization_id = leads.organization_id
        AND om.profile_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = TRUE
    )
  );

-- =====================================================
-- STEP 6: FIX RLS POLICIES FOR CLIENT_GOALS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view client goals" ON public.client_goals;
DROP POLICY IF EXISTS "Authenticated users can create goals" ON public.client_goals;
DROP POLICY IF EXISTS "Authenticated users can update goals" ON public.client_goals;

CREATE POLICY "Users can view goals in their organization"
  ON public.client_goals FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can create goals in their organization"
  ON public.client_goals FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can update goals in their organization"
  ON public.client_goals FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- STEP 7: FIX RLS POLICIES FOR REVENUE_RECORDS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view revenue records" ON public.revenue_records;
DROP POLICY IF EXISTS "Authenticated users can manage revenue" ON public.revenue_records;

CREATE POLICY "Users can view revenue in their organization"
  ON public.revenue_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can manage revenue in their organization"
  ON public.revenue_records FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can update revenue in their organization"
  ON public.revenue_records FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- STEP 8: FIX RLS POLICIES FOR RELATED TABLES
-- =====================================================

-- Comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

CREATE POLICY "Users can view comments in their organization"
  ON public.comments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can create comments in their organization"
  ON public.comments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Members can update own comments in their organization"
  ON public.comments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Members can delete own comments in their organization"
  ON public.comments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND user_id = auth.uid()
  );

-- Attachments
DROP POLICY IF EXISTS "Anyone can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.attachments;

CREATE POLICY "Users can view attachments in their organization"
  ON public.attachments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can upload attachments in their organization"
  ON public.attachments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Members can delete own attachments in their organization"
  ON public.attachments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
    AND uploaded_by = auth.uid()
  );

-- Checklist items
DROP POLICY IF EXISTS "Anyone can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can manage checklist items" ON public.checklist_items;

CREATE POLICY "Users can view checklist items in their organization"
  ON public.checklist_items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can manage checklist items in their organization"
  ON public.checklist_items FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can update checklist items in their organization"
  ON public.checklist_items FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Lead activity
DROP POLICY IF EXISTS "Anyone can view lead activity" ON public.lead_activity;
DROP POLICY IF EXISTS "System can insert activity" ON public.lead_activity;

CREATE POLICY "Users can view lead activity in their organization"
  ON public.lead_activity FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "System can insert activity in user's organization"
  ON public.lead_activity FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = COALESCE(auth.uid(), user_id) AND is_active = TRUE
    )
  );

-- Lead labels
DROP POLICY IF EXISTS "Anyone can view lead labels" ON public.lead_labels;
DROP POLICY IF EXISTS "Users can manage lead labels" ON public.lead_labels;

CREATE POLICY "Users can view lead labels in their organization"
  ON public.lead_labels FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can manage lead labels in their organization"
  ON public.lead_labels FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Members can delete lead labels in their organization"
  ON public.lead_labels FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Stopped sales
DROP POLICY IF EXISTS "Anyone can view stopped sales" ON public.stopped_sales;

CREATE POLICY "Users can view stopped sales in their organization"
  ON public.stopped_sales FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- STEP 9: RECREATE SECURE VIEWS (ORGANIZATION-SCOPED)
-- =====================================================

-- Drop old insecure views
DROP VIEW IF EXISTS public.dashboard_kpis;
DROP VIEW IF EXISTS public.monthly_revenue;

-- Create organization-scoped dashboard KPIs view
-- NOTE: This view is now organization-scoped via RLS on underlying tables
CREATE OR REPLACE VIEW public.dashboard_kpis AS
SELECT
  auth.uid()::UUID as user_id,
  COALESCE(SUM(CASE WHEN r.category = 'new_up' AND r.date >= DATE_TRUNC('month', CURRENT_DATE) THEN r.amount ELSE 0 END), 0) as faturamento_mensal,
  COALESCE(SUM(CASE WHEN r.category = 'new_up' AND EXTRACT(YEAR FROM r.date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN r.amount ELSE 0 END), 0) as faturamento_anual,
  (SELECT COUNT(*) FROM public.leads l WHERE l.status != 'done' AND l.organization_id IN (
    SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE
  )) as oportunidades_ativas,
  COALESCE((SELECT SUM(value) FROM public.leads l WHERE l.status != 'done' AND l.organization_id IN (
    SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE
  )), 0) as pipeline_value
FROM public.revenue_records r
WHERE r.organization_id IN (
  SELECT organization_id FROM public.organization_memberships
  WHERE profile_id = auth.uid() AND is_active = TRUE
);

-- Create organization-scoped monthly revenue view
CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  r.month,
  r.year,
  r.category,
  r.organization_id,
  SUM(r.amount) as total_amount,
  COUNT(*) as record_count
FROM public.revenue_records r
WHERE r.organization_id IN (
  SELECT organization_id FROM public.organization_memberships
  WHERE profile_id = auth.uid() AND is_active = TRUE
)
GROUP BY r.month, r.year, r.category, r.organization_id
ORDER BY r.year DESC,
  CASE r.month
    WHEN 'Jan' THEN 1 WHEN 'Fev' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Abr' THEN 4
    WHEN 'Mai' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Ago' THEN 8
    WHEN 'Set' THEN 9 WHEN 'Out' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dez' THEN 12
  END;

-- =====================================================
-- STEP 10: ADD VALIDATION TRIGGERS
-- =====================================================

-- Trigger to ensure lead_labels always has matching organization_id
CREATE OR REPLACE FUNCTION public.validate_lead_label_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure lead_labels.organization_id matches leads.organization_id
  NEW.organization_id = (SELECT organization_id FROM public.leads WHERE id = NEW.lead_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_lead_label_organization ON public.lead_labels;
CREATE TRIGGER trg_validate_lead_label_organization
  BEFORE INSERT OR UPDATE ON public.lead_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lead_label_organization();

-- Similar trigger for comments
CREATE OR REPLACE FUNCTION public.validate_comment_organization()
RETURNS TRIGGER AS $$
BEGIN
  NEW.organization_id = (SELECT organization_id FROM public.leads WHERE id = NEW.lead_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_comment_organization ON public.comments;
CREATE TRIGGER trg_validate_comment_organization
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_organization();

-- Trigger for attachments
CREATE OR REPLACE FUNCTION public.validate_attachment_organization()
RETURNS TRIGGER AS $$
BEGIN
  NEW.organization_id = (SELECT organization_id FROM public.leads WHERE id = NEW.lead_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_attachment_organization ON public.attachments;
CREATE TRIGGER trg_validate_attachment_organization
  BEFORE INSERT OR UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_attachment_organization();

-- =====================================================
-- STEP 11: SUMMARY & VALIDATION
-- =====================================================

-- Add comment documenting the migration
COMMENT ON COLUMN public.leads.organization_id IS 'Organization this lead belongs to - CRITICAL for multi-tenancy';
COMMENT ON COLUMN public.client_goals.organization_id IS 'Organization this goal belongs to - CRITICAL for multi-tenancy';
COMMENT ON COLUMN public.revenue_records.organization_id IS 'Organization this revenue record belongs to - CRITICAL for multi-tenancy';
COMMENT ON COLUMN public.comments.organization_id IS 'Organization this comment belongs to - inherited from lead';
COMMENT ON COLUMN public.attachments.organization_id IS 'Organization this attachment belongs to - inherited from lead';
COMMENT ON COLUMN public.checklist_items.organization_id IS 'Organization this checklist item belongs to - inherited from lead';
COMMENT ON COLUMN public.lead_activity.organization_id IS 'Organization this activity belongs to - inherited from lead';
COMMENT ON COLUMN public.lead_labels.organization_id IS 'Organization this label assignment belongs to - inherited from lead';
COMMENT ON COLUMN public.stopped_sales.organization_id IS 'Organization this stopped sale belongs to - inherited from lead';
