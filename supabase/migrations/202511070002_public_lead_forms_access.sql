-- Migration: Public access for Native Lead Forms (read-only)
-- Description: Allows anonymous access to read active lead forms and their fields/variants for public rendering
-- Created: 2025-11-07

BEGIN;
-- Lead forms: allow anon to read active forms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_forms'
      AND policyname = 'Anon can read active lead forms'
  ) THEN
    CREATE POLICY "Anon can read active lead forms"
      ON public.lead_forms FOR SELECT
      TO anon
      USING (is_active = TRUE);
  END IF;
END $$;
-- Lead form fields: allow anon to read fields when parent form is active
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_form_fields'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'lead_form_fields'
        AND policyname = 'Anon can read fields of active forms'
    ) THEN
      CREATE POLICY "Anon can read fields of active forms"
        ON public.lead_form_fields FOR SELECT
        TO anon
        USING (
          EXISTS (
            SELECT 1 FROM public.lead_forms lf
            WHERE lf.id = lead_form_fields.form_id
              AND lf.is_active = TRUE
          )
        );
    END IF;
  END IF;
END $$;
-- Lead form variants: allow anon to read variants when parent form is active
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_form_variants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'lead_form_variants'
        AND policyname = 'Anon can read variants of active forms'
    ) THEN
      CREATE POLICY "Anon can read variants of active forms"
        ON public.lead_form_variants FOR SELECT
        TO anon
        USING (
          EXISTS (
            SELECT 1 FROM public.lead_forms lf
            WHERE lf.id = lead_form_variants.form_id
              AND lf.is_active = TRUE
          )
        );
    END IF;
  END IF;
END $$;
COMMIT;
