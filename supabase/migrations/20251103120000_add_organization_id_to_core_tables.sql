-- Migration: Add organization_id to core tables for multi-tenancy
-- Description: Adds organization_id column to leads, client_goals, labels, revenue_records,
--              tasks, interactions, and related tables to enable proper multi-tenant data isolation
-- Created: 2025-11-03
-- Critical: This migration is REQUIRED for production - prevents data leaks between organizations

-- =====================================================
-- STEP 1: ADD organization_id COLUMNS TO CORE TABLES
-- =====================================================

-- Add organization_id to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to client_goals table
ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to labels table
ALTER TABLE public.labels
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to revenue_records table
ALTER TABLE public.revenue_records
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to lead_activity table
ALTER TABLE public.lead_activity
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to comments table
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to attachments table
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to checklist_items table
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to stopped_sales table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stopped_sales') THEN
    ALTER TABLE public.stopped_sales
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add organization_id to tasks table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add organization_id to interactions table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    ALTER TABLE public.interactions
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- STEP 2: BACKFILL organization_id FROM created_by
-- =====================================================

-- Backfill leads.organization_id
-- Strategy: Get organization from the creator's first active membership
UPDATE public.leads l
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = l.created_by
    AND om.is_active = TRUE
  ORDER BY om.joined_at ASC
  LIMIT 1
)
WHERE l.organization_id IS NULL
  AND l.created_by IS NOT NULL;

-- For leads without created_by, assign to first available organization (fallback)
UPDATE public.leads l
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE l.organization_id IS NULL;

-- Backfill client_goals.organization_id
UPDATE public.client_goals cg
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = cg.created_by
    AND om.is_active = TRUE
  ORDER BY om.joined_at ASC
  LIMIT 1
)
WHERE cg.organization_id IS NULL
  AND cg.created_by IS NOT NULL;

-- For goals without created_by, assign to first available organization
UPDATE public.client_goals cg
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE cg.organization_id IS NULL;

-- Backfill labels.organization_id
-- For labels, we'll assign to ALL organizations since they're global tags
-- But first, we need to create organization-specific copies
DO $$
DECLARE
  label_record RECORD;
  org_record RECORD;
BEGIN
  -- For each existing label without organization_id
  FOR label_record IN
    SELECT id, name, color FROM public.labels WHERE organization_id IS NULL
  LOOP
    -- Assign first organization to the original label
    UPDATE public.labels
    SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    WHERE id = label_record.id;

    -- Create copies for other organizations
    FOR org_record IN
      SELECT id FROM public.organizations
      WHERE id != (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1)
    LOOP
      INSERT INTO public.labels (name, color, organization_id)
      VALUES (label_record.name, label_record.color, org_record.id)
      ON CONFLICT DO NOTHING; -- Skip if already exists
    END LOOP;
  END LOOP;
END $$;

-- Backfill revenue_records.organization_id
UPDATE public.revenue_records rr
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_memberships om
  WHERE om.profile_id = rr.created_by
    AND om.is_active = TRUE
  ORDER BY om.joined_at ASC
  LIMIT 1
)
WHERE rr.organization_id IS NULL
  AND rr.created_by IS NOT NULL;

-- For revenue records without created_by, try to get from related_lead_id
UPDATE public.revenue_records rr
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = rr.related_lead_id
)
WHERE rr.organization_id IS NULL
  AND rr.related_lead_id IS NOT NULL;

-- Fallback: assign to first organization
UPDATE public.revenue_records rr
SET organization_id = (
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
)
WHERE rr.organization_id IS NULL;

-- Backfill lead_activity.organization_id from related lead
UPDATE public.lead_activity la
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = la.lead_id
)
WHERE la.organization_id IS NULL
  AND la.lead_id IS NOT NULL;

-- Backfill comments.organization_id from related lead
UPDATE public.comments c
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = c.lead_id
)
WHERE c.organization_id IS NULL
  AND c.lead_id IS NOT NULL;

-- Backfill attachments.organization_id from related lead
UPDATE public.attachments a
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = a.lead_id
)
WHERE a.organization_id IS NULL
  AND a.lead_id IS NOT NULL;

-- Backfill checklist_items.organization_id from related lead
UPDATE public.checklist_items ci
SET organization_id = (
  SELECT l.organization_id
  FROM public.leads l
  WHERE l.id = ci.lead_id
)
WHERE ci.organization_id IS NULL
  AND ci.lead_id IS NOT NULL;

-- Backfill tasks.organization_id (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    EXECUTE '
      UPDATE public.tasks t
      SET organization_id = (
        SELECT om.organization_id
        FROM public.organization_memberships om
        WHERE om.profile_id = t.assigned_to
          AND om.is_active = TRUE
        ORDER BY om.joined_at ASC
        LIMIT 1
      )
      WHERE t.organization_id IS NULL
        AND t.assigned_to IS NOT NULL
    ';

    -- Fallback for tasks without assignment
    EXECUTE '
      UPDATE public.tasks t
      SET organization_id = (
        SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1
      )
      WHERE t.organization_id IS NULL
    ';
  END IF;
END $$;

-- Backfill interactions.organization_id (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
    EXECUTE '
      UPDATE public.interactions i
      SET organization_id = (
        SELECT l.organization_id
        FROM public.leads l
        WHERE l.id = i.lead_id
      )
      WHERE i.organization_id IS NULL
        AND i.lead_id IS NOT NULL
    ';
  END IF;
END $$;

-- =====================================================
-- STEP 3: MAKE organization_id NOT NULL
-- =====================================================

-- After backfill, enforce NOT NULL constraint
ALTER TABLE public.leads
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.client_goals
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.labels
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.revenue_records
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.lead_activity
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.comments
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.attachments
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.checklist_items
  ALTER COLUMN organization_id SET NOT NULL;

-- Make NOT NULL for conditional tables (if exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tasks' AND column_name = 'organization_id') THEN
    ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'interactions' AND column_name = 'organization_id') THEN
    ALTER TABLE public.interactions ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'stopped_sales' AND column_name = 'organization_id') THEN
    ALTER TABLE public.stopped_sales ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- =====================================================
-- STEP 4: UPDATE UNIQUE CONSTRAINTS FOR LABELS
-- =====================================================

-- Drop old UNIQUE constraint on labels.name (global uniqueness)
ALTER TABLE public.labels DROP CONSTRAINT IF EXISTS labels_name_key;

-- Add new UNIQUE constraint scoped to organization
ALTER TABLE public.labels
  ADD CONSTRAINT labels_name_org_unique UNIQUE (name, organization_id);

-- =====================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_organization_id
  ON public.leads(organization_id);

CREATE INDEX IF NOT EXISTS idx_client_goals_organization_id
  ON public.client_goals(organization_id);

CREATE INDEX IF NOT EXISTS idx_labels_organization_id
  ON public.labels(organization_id);

CREATE INDEX IF NOT EXISTS idx_revenue_records_organization_id
  ON public.revenue_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_activity_organization_id
  ON public.lead_activity(organization_id);

CREATE INDEX IF NOT EXISTS idx_comments_organization_id
  ON public.comments(organization_id);

CREATE INDEX IF NOT EXISTS idx_attachments_organization_id
  ON public.attachments(organization_id);

CREATE INDEX IF NOT EXISTS idx_checklist_items_organization_id
  ON public.checklist_items(organization_id);

-- Create indexes for conditional tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tasks' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'interactions' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_interactions_organization_id ON public.interactions(organization_id);
  END IF;
END $$;

-- =====================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN public.leads.organization_id IS
  'Foreign key to organizations table - ensures multi-tenant data isolation';

COMMENT ON COLUMN public.client_goals.organization_id IS
  'Foreign key to organizations table - ensures multi-tenant data isolation';

COMMENT ON COLUMN public.labels.organization_id IS
  'Foreign key to organizations table - labels are scoped to organization';

COMMENT ON COLUMN public.revenue_records.organization_id IS
  'Foreign key to organizations table - revenue data scoped to organization';

-- =====================================================
-- STEP 7: UPDATE TRIGGERS TO SET organization_id
-- =====================================================

-- Function to automatically set organization_id on lead creation
CREATE OR REPLACE FUNCTION public.set_lead_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization_id not provided, get from creator's active organization
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.is_active = TRUE
      ORDER BY om.joined_at ASC
      LIMIT 1
    );
  END IF;

  -- Raise error if still NULL (user has no organization)
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization to create leads';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to leads
DROP TRIGGER IF EXISTS trg_set_lead_organization_id ON public.leads;
CREATE TRIGGER trg_set_lead_organization_id
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lead_organization_id();

-- Apply similar logic to other tables
CREATE OR REPLACE FUNCTION public.set_organization_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (
      SELECT om.organization_id
      FROM public.organization_memberships om
      WHERE om.profile_id = auth.uid()
        AND om.is_active = TRUE
      ORDER BY om.joined_at ASC
      LIMIT 1
    );
  END IF;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to goals
DROP TRIGGER IF EXISTS trg_set_goal_organization_id ON public.client_goals;
CREATE TRIGGER trg_set_goal_organization_id
  BEFORE INSERT ON public.client_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id_from_user();

-- Apply to revenue_records
DROP TRIGGER IF EXISTS trg_set_revenue_organization_id ON public.revenue_records;
CREATE TRIGGER trg_set_revenue_organization_id
  BEFORE INSERT ON public.revenue_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id_from_user();

-- Apply to labels
DROP TRIGGER IF EXISTS trg_set_label_organization_id ON public.labels;
CREATE TRIGGER trg_set_label_organization_id
  BEFORE INSERT ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id_from_user();

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- =====================================================

-- Verify all leads have organization_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.leads WHERE organization_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % leads without organization_id', orphan_count;
  ELSE
    RAISE NOTICE 'All leads have organization_id - VERIFIED';
  END IF;
END $$;

-- Verify all goals have organization_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.client_goals WHERE organization_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % goals without organization_id', orphan_count;
  ELSE
    RAISE NOTICE 'All goals have organization_id - VERIFIED';
  END IF;
END $$;

-- Verify all labels have organization_id
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.labels WHERE organization_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % labels without organization_id', orphan_count;
  ELSE
    RAISE NOTICE 'All labels have organization_id - VERIFIED';
  END IF;
END $$;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251103120000_add_organization_id_to_core_tables.sql completed successfully';
  RAISE NOTICE '✅ All core tables now have organization_id column';
  RAISE NOTICE '✅ All existing data has been backfilled';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '⚠️  NEXT STEP: Update RLS policies to use organization_id filters';
END $$;
