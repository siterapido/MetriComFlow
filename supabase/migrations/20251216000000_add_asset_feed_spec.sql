-- Migration: Add asset_feed_spec to ads table
-- Description: Adds a JSONB column to store dynamic creative data (asset_feed_spec)

BEGIN;

ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS asset_feed_spec JSONB;

COMMENT ON COLUMN public.ads.asset_feed_spec IS 'Stores the asset_feed_spec for Dynamic Creatives (DCO)';

COMMIT;
