-- Lead Forms management table for public capture forms

CREATE TABLE IF NOT EXISTS public.lead_forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  success_message TEXT,
  webhook_url TEXT,
  redirect_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with CRM access can view lead forms"
  ON public.lead_forms FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create lead forms"
  ON public.lead_forms FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can update lead forms"
  ON public.lead_forms FOR UPDATE
  USING (has_crm_access(auth.uid()))
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can delete lead forms"
  ON public.lead_forms FOR DELETE
  USING (has_crm_access(auth.uid()));

CREATE TRIGGER update_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.lead_forms IS 'Public capture form definitions used to generate shareable URLs and webhooks';
