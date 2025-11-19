-- Migration: Allow All Organization Members to Delete Leads
-- Description: Expands DELETE policy to allow all active members (not just owner/admin) to delete leads
-- Created: 2025-12-19
-- IMPORTANT: This migration improves usability by allowing all organization members to delete leads

-- =====================================================
-- STEP 1: UPDATE DELETE POLICY FOR LEADS
-- =====================================================

-- Drop the restrictive policy that only allows owner/admin
DROP POLICY IF EXISTS "Admins can delete leads in their organization" ON public.leads;

-- Create new policy allowing ALL active members to delete leads
CREATE POLICY "Members can delete leads in their organization"
  ON public.leads FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- STEP 2: ENSURE CASCADE DELETE FOR RELATED TABLES
-- =====================================================

-- Comments should cascade delete when lead is deleted
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_lead_id_fkey;

ALTER TABLE public.comments
ADD CONSTRAINT comments_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Attachments should cascade delete when lead is deleted
ALTER TABLE public.attachments
DROP CONSTRAINT IF EXISTS attachments_lead_id_fkey;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Checklist items should cascade delete when lead is deleted
ALTER TABLE public.checklist_items
DROP CONSTRAINT IF EXISTS checklist_items_lead_id_fkey;

ALTER TABLE public.checklist_items
ADD CONSTRAINT checklist_items_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Lead activity should cascade delete when lead is deleted
ALTER TABLE public.lead_activity
DROP CONSTRAINT IF EXISTS lead_activity_lead_id_fkey;

ALTER TABLE public.lead_activity
ADD CONSTRAINT lead_activity_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Lead labels junction table should cascade delete when lead is deleted
ALTER TABLE public.lead_labels
DROP CONSTRAINT IF EXISTS lead_labels_lead_id_fkey;

ALTER TABLE public.lead_labels
ADD CONSTRAINT lead_labels_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Stopped sales should cascade delete when lead is deleted
ALTER TABLE public.stopped_sales
DROP CONSTRAINT IF EXISTS stopped_sales_lead_id_fkey;

ALTER TABLE public.stopped_sales
ADD CONSTRAINT stopped_sales_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Interactions should cascade delete when lead is deleted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'interactions'
  ) THEN
    ALTER TABLE public.interactions
    DROP CONSTRAINT IF EXISTS interactions_lead_id_fkey;

    ALTER TABLE public.interactions
    ADD CONSTRAINT interactions_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tasks should cascade delete when lead is deleted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS tasks_lead_id_fkey;

    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- STEP 3: HANDLE REVENUE RECORDS (SET NULL INSTEAD OF CASCADE)
-- =====================================================

-- Revenue records should NOT be deleted when lead is deleted
-- Instead, set related_lead_id to NULL (historical data preservation)
ALTER TABLE public.revenue_records
DROP CONSTRAINT IF EXISTS revenue_records_related_lead_id_fkey;

ALTER TABLE public.revenue_records
ADD CONSTRAINT revenue_records_related_lead_id_fkey
FOREIGN KEY (related_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 4: HANDLE DEALS (SET NULL INSTEAD OF CASCADE)
-- =====================================================

-- Deals should NOT be deleted when lead is deleted
-- Instead, set lead_id to NULL (deals can exist independently)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deals'
  ) THEN
    ALTER TABLE public.deals
    DROP CONSTRAINT IF EXISTS deals_lead_id_fkey;

    ALTER TABLE public.deals
    ADD CONSTRAINT deals_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- STEP 5: ADD DELETE POLICIES FOR RELATED TABLES
-- =====================================================

-- Ensure checklist_items has DELETE policy
DROP POLICY IF EXISTS "Members can delete checklist items in their organization" ON public.checklist_items;

CREATE POLICY "Members can delete checklist items in their organization"
  ON public.checklist_items FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Ensure lead_activity has DELETE policy (for cleanup)
DROP POLICY IF EXISTS "Members can delete activity in their organization" ON public.lead_activity;

CREATE POLICY "Members can delete activity in their organization"
  ON public.lead_activity FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Ensure stopped_sales has DELETE policy
DROP POLICY IF EXISTS "Members can delete stopped sales in their organization" ON public.stopped_sales;

CREATE POLICY "Members can delete stopped sales in their organization"
  ON public.stopped_sales FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid() AND is_active = TRUE
    )
  );

-- Ensure interactions has DELETE policy (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'interactions'
  ) THEN
    DROP POLICY IF EXISTS "Members can delete interactions in their organization" ON public.interactions;

    CREATE POLICY "Members can delete interactions in their organization"
      ON public.interactions FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id FROM public.organization_memberships
          WHERE profile_id = auth.uid() AND is_active = TRUE
        )
      );
  END IF;
END $$;

-- Ensure tasks has DELETE policy (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  ) THEN
    DROP POLICY IF EXISTS "Members can delete tasks in their organization" ON public.tasks;

    CREATE POLICY "Members can delete tasks in their organization"
      ON public.tasks FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id FROM public.organization_memberships
          WHERE profile_id = auth.uid() AND is_active = TRUE
        )
      );
  END IF;
END $$;

-- =====================================================
-- STEP 6: ADD COMMENTS TO DOCUMENT CHANGES
-- =====================================================

COMMENT ON POLICY "Members can delete leads in their organization" ON public.leads IS
  'Allows all active organization members to delete leads (changed from owner/admin only on 2025-12-19)';

COMMENT ON CONSTRAINT comments_lead_id_fkey ON public.comments IS
  'Cascade delete comments when parent lead is deleted';

COMMENT ON CONSTRAINT attachments_lead_id_fkey ON public.attachments IS
  'Cascade delete attachments when parent lead is deleted';

COMMENT ON CONSTRAINT checklist_items_lead_id_fkey ON public.checklist_items IS
  'Cascade delete checklist items when parent lead is deleted';

COMMENT ON CONSTRAINT lead_activity_lead_id_fkey ON public.lead_activity IS
  'Cascade delete activity history when parent lead is deleted';

COMMENT ON CONSTRAINT lead_labels_lead_id_fkey ON public.lead_labels IS
  'Cascade delete label associations when parent lead is deleted';

COMMENT ON CONSTRAINT revenue_records_related_lead_id_fkey ON public.revenue_records IS
  'Set to NULL when related lead is deleted (preserves historical revenue data)';
