-- Disable non-essential Meta Ads cron jobs for ad sets, ads and their insights
-- This migration unschedules the following jobs, if present:
--  - sync-ad-sets-every-6h
--  - sync-ads-every-6h
--  - sync-adset-insights-every-6h
--  - sync-ad-insights-every-6h

DO $$ BEGIN
  PERFORM cron.unschedule('sync-ad-sets-every-6h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('sync-ads-every-6h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('sync-adset-insights-every-6h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('sync-ad-insights-every-6h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Optionally, you can drop the functions if not needed anymore.
-- Uncomment the lines below if you want to remove them:
-- DO $$ BEGIN EXECUTE 'DROP FUNCTION IF EXISTS public.sync_ad_sets_cron()'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- DO $$ BEGIN EXECUTE 'DROP FUNCTION IF EXISTS public.sync_ads_cron()'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- DO $$ BEGIN EXECUTE 'DROP FUNCTION IF EXISTS public.sync_adset_insights_cron()'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- DO $$ BEGIN EXECUTE 'DROP FUNCTION IF EXISTS public.sync_ad_insights_cron()'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
