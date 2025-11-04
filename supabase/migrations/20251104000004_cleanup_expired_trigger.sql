-- Migration: Clean up any remaining trigger and function
-- Description: Remove the expire_old_team_invitations function that may exist from previous migrations
-- Date: 2025-11-04
-- Issue: Function may still exist in database even if removed from migration

-- Ensure trigger is dropped first (if it still exists)
DROP TRIGGER IF EXISTS trg_expire_team_invitation ON public.team_invitations;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.expire_old_team_invitations();

-- Verify team_invitations table has no problematic triggers
-- (This is just a safety check, no action taken)
