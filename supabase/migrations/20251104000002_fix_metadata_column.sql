-- Migration: Fix metadata column and refresh schema cache
-- Description: Ensure metadata column exists in team_invitations
-- Date: 2025-11-04

-- Add metadata column if it doesn't exist
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Refresh the schema cache by touching the table
NOTIFY pgrst, 'reload schema';
