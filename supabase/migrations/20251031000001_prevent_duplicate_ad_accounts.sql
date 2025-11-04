-- Migration: Prevent duplicate Meta Ad Accounts across different users/organizations
-- Created: 2025-10-31
-- Purpose: Add unique constraint to prevent the same Meta ad account (external_id)
--          from being connected by multiple organizations

-- 1. First, clean up any existing duplicates (if any)
-- This will keep only the most recently connected account for each external_id
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN (
    SELECT external_id, array_agg(id ORDER BY created_at DESC) as ids
    FROM ad_accounts
    GROUP BY external_id
    HAVING COUNT(*) > 1
  )
  LOOP
    -- Keep the first (most recent), delete the rest
    DELETE FROM ad_accounts
    WHERE id = ANY(duplicate_record.ids[2:]);

    RAISE NOTICE 'Removed % duplicate(s) for external_id: %',
      array_length(duplicate_record.ids, 1) - 1,
      duplicate_record.external_id;
  END LOOP;
END $$;
-- 2. Add unique constraint on external_id
-- This prevents the same Meta ad account from being connected twice
ALTER TABLE ad_accounts
DROP CONSTRAINT IF EXISTS ad_accounts_external_id_key;
ALTER TABLE ad_accounts
ADD CONSTRAINT ad_accounts_external_id_key
UNIQUE (external_id);
-- 3. Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_ad_accounts_external_id
ON ad_accounts(external_id);
-- 4. Add comment for documentation
COMMENT ON CONSTRAINT ad_accounts_external_id_key ON ad_accounts IS
'Ensures each Meta ad account (identified by external_id) can only be connected once across all organizations. This prevents duplicate connections and data conflicts.';
-- 5. Create a function to check if an ad account is already connected
CREATE OR REPLACE FUNCTION is_ad_account_connected(p_external_id TEXT)
RETURNS TABLE (
  is_connected BOOLEAN,
  connected_by_user_id UUID,
  connected_by_user_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_connected,
    p.id as connected_by_user_id,
    p.full_name as connected_by_user_name,
    aa.organization_id,
    o.name as organization_name,
    aa.business_name
  FROM ad_accounts aa
  LEFT JOIN organizations o ON o.id = aa.organization_id
  LEFT JOIN profiles p ON p.id = aa.connected_by
  WHERE aa.external_id = p_external_id
    AND aa.is_active = TRUE
  LIMIT 1;
END;
$$;
COMMENT ON FUNCTION is_ad_account_connected IS
'Check if a Meta ad account (by external_id) is already connected. Returns connection details if found.';
-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION is_ad_account_connected TO authenticated;
