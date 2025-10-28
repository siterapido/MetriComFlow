-- Landing page: public site requests (demo/trial)
CREATE TABLE IF NOT EXISTS public.site_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL CHECK (position('@' in email) > 1),
  company TEXT,
  role TEXT,
  team_size TEXT,
  objective TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and restrict read access by default
ALTER TABLE public.site_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_requests'
      AND policyname = 'Allow anonymous insert on site_requests'
  ) THEN
    CREATE POLICY "Allow anonymous insert on site_requests"
      ON public.site_requests FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Optional: only admins/managers can select
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_requests'
      AND policyname = 'Only admins/managers can select site_requests'
  ) THEN
    CREATE POLICY "Only admins/managers can select site_requests"
      ON public.site_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('admin','manager')
        )
      );
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_site_requests_created_at ON public.site_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_requests_email ON public.site_requests(email);
