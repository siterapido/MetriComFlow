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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_forms'
      AND policyname = 'Users with CRM access can view lead forms'
  ) THEN
    CREATE POLICY "Users with CRM access can view lead forms"
      ON public.lead_forms FOR SELECT
      USING (has_crm_access(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_forms'
      AND policyname = 'Users with CRM access can create lead forms'
  ) THEN
    CREATE POLICY "Users with CRM access can create lead forms"
      ON public.lead_forms FOR INSERT
      WITH CHECK (has_crm_access(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_forms'
      AND policyname = 'Users with CRM access can update lead forms'
  ) THEN
    CREATE POLICY "Users with CRM access can update lead forms"
      ON public.lead_forms FOR UPDATE
      USING (has_crm_access(auth.uid()))
      WITH CHECK (has_crm_access(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lead_forms'
      AND policyname = 'Users with CRM access can delete lead forms'
  ) THEN
    CREATE POLICY "Users with CRM access can delete lead forms"
      ON public.lead_forms FOR DELETE
      USING (has_crm_access(auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_lead_forms_updated_at'
  ) THEN
    CREATE TRIGGER update_lead_forms_updated_at
      BEFORE UPDATE ON public.lead_forms
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.lead_forms IS 'Public capture form definitions used to generate shareable URLs and webhooks';
