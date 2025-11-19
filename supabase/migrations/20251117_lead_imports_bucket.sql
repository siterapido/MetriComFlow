-- Migration: Lead Imports Bucket & Policies
-- Created: 2025-11-17

BEGIN;

-- Create private bucket for import source files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'lead-imports'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('lead-imports', 'lead-imports', false);
  END IF;
END $$;

-- Policies: allow authenticated upload/read of own org files via prefix convention
-- Convention: lead-imports/{organization_id}/{yyyy}/{mm}/{dd}/{uuid}-{filename}

CREATE POLICY IF NOT EXISTS "Import files read (signed)" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'lead-imports'
  );

CREATE POLICY IF NOT EXISTS "Import files upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'lead-imports'
  );

CREATE POLICY IF NOT EXISTS "Import files update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'lead-imports'
  );

COMMIT;