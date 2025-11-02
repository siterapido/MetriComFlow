-- Migration: Lead Forms slug per owner and profile slugs
-- Ensures each user can reuse form names/slug within their own namespace

BEGIN;

-- Add slug and owner_profile_id to lead_forms
ALTER TABLE public.lead_forms
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Unique slug per owner (nullable-safe)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lead_forms_owner_slug
  ON public.lead_forms(owner_profile_id, slug)
  WHERE slug IS NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_lead_forms_slug ON public.lead_forms(slug);
CREATE INDEX IF NOT EXISTS idx_lead_forms_owner ON public.lead_forms(owner_profile_id);

-- Add slug to profiles for vanity URLs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

-- Optional: allow anon to read profiles (already broadly allowed in base schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Anon can read public profiles'
  ) THEN
    CREATE POLICY "Anon can read public profiles" ON public.profiles FOR SELECT TO anon USING (true);
  END IF;
END $$;

COMMIT;

