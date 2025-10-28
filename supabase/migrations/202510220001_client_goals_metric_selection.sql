-- ===================================================================
-- Client Goals: Metric Selection Support
-- ===================================================================
-- Adds metric metadata fields so each client goal can be linked
-- to a CRM or Meta Ads KPI chosen by the user.
-- ===================================================================

ALTER TABLE public.client_goals
  ADD COLUMN IF NOT EXISTS metric_key TEXT,
  ADD COLUMN IF NOT EXISTS metric_category TEXT CHECK (metric_category IN ('crm', 'meta', 'revenue', 'custom')),
  ADD COLUMN IF NOT EXISTS metric_label TEXT;

CREATE INDEX IF NOT EXISTS idx_client_goals_metric_key
  ON public.client_goals(metric_key);

COMMENT ON COLUMN public.client_goals.metric_key IS 'Identifier of the KPI associated to the client goal (e.g. crm_leads_generated)';
COMMENT ON COLUMN public.client_goals.metric_category IS 'KPI category (crm, meta, revenue, custom)';
COMMENT ON COLUMN public.client_goals.metric_label IS 'Cached display label for the KPI selected in the client goal';
