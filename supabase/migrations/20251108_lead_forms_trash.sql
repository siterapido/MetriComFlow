-- Migration: Lead Forms Trash (soft delete)
-- Adds deleted_at column for soft delete and an index for filtering

BEGIN;

ALTER TABLE public.lead_forms
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lead_forms_deleted_at
  ON public.lead_forms(deleted_at);

COMMIT;

