-- Migration: Allow All Organization Members to Delete Leads (Simplified Version)
-- Description: Expands DELETE policy to allow all active members (not just owner/admin) to delete leads
-- Created: 2025-12-19

-- =====================================================
-- STEP 1: UPDATE DELETE POLICY FOR LEADS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete leads in their organization" ON public.leads;

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

-- Comments
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_lead_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Attachments
ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_lead_id_fkey;
ALTER TABLE public.attachments ADD CONSTRAINT attachments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Checklist items
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_lead_id_fkey;
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_items_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Lead activity
ALTER TABLE public.lead_activity DROP CONSTRAINT IF EXISTS lead_activity_lead_id_fkey;
ALTER TABLE public.lead_activity ADD CONSTRAINT lead_activity_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Lead labels
ALTER TABLE public.lead_labels DROP CONSTRAINT IF EXISTS lead_labels_lead_id_fkey;
ALTER TABLE public.lead_labels ADD CONSTRAINT lead_labels_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Stopped sales
ALTER TABLE public.stopped_sales DROP CONSTRAINT IF EXISTS stopped_sales_lead_id_fkey;
ALTER TABLE public.stopped_sales ADD CONSTRAINT stopped_sales_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Revenue records (SET NULL para preservar histórico)
ALTER TABLE public.revenue_records DROP CONSTRAINT IF EXISTS revenue_records_related_lead_id_fkey;
ALTER TABLE public.revenue_records ADD CONSTRAINT revenue_records_related_lead_id_fkey FOREIGN KEY (related_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 3: ADD DELETE POLICIES FOR RELATED TABLES
-- =====================================================

DROP POLICY IF EXISTS "Members can delete checklist items in their organization" ON public.checklist_items;
CREATE POLICY "Members can delete checklist items in their organization" ON public.checklist_items FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE));

DROP POLICY IF EXISTS "Members can delete activity in their organization" ON public.lead_activity;
CREATE POLICY "Members can delete activity in their organization" ON public.lead_activity FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE));

DROP POLICY IF EXISTS "Members can delete stopped sales in their organization" ON public.stopped_sales;
CREATE POLICY "Members can delete stopped sales in their organization" ON public.stopped_sales FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE profile_id = auth.uid() AND is_active = TRUE));
