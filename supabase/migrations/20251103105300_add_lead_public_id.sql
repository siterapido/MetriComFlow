-- Migration: Add human-friendly unique public_id to leads
-- Ensures each lead has a readable unique identifier (e.g., L-20251103-AB12CD)

BEGIN;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS public_id TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_leads_public_id'
  ) THEN
    CREATE UNIQUE INDEX ux_leads_public_id ON public.leads(public_id) WHERE public_id IS NOT NULL;
  END IF;
END $$;
-- Helper: generate a short random token using hex from gen_random_bytes
CREATE OR REPLACE FUNCTION public._short_token(n_bytes integer DEFAULT 3)
RETURNS text AS $$
DECLARE
  token text;
BEGIN
  SELECT UPPER(encode(gen_random_bytes(n_bytes), 'hex')) INTO token;
  RETURN token;
END;
$$ LANGUAGE plpgsql VOLATILE;
-- Generator: L-YYYYMMDD-XXXXXX pattern
CREATE OR REPLACE FUNCTION public.generate_lead_public_id()
RETURNS text AS $$
DECLARE
  candidate text;
  today text := to_char(now(), 'YYYYMMDD');
BEGIN
  LOOP
    candidate := 'L-' || today || '-' || public._short_token(3);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.leads WHERE public_id = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;
-- Trigger: set public_id automatically on insert when missing
CREATE OR REPLACE FUNCTION public.trg_set_lead_public_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := public.generate_lead_public_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_lead_public_id_before_insert'
  ) THEN
    CREATE TRIGGER set_lead_public_id_before_insert
      BEFORE INSERT ON public.leads
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_set_lead_public_id();
  END IF;
END $$;
COMMIT;
