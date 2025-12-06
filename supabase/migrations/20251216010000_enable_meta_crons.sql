-- Migration: Re-enable Meta Ads Sync Crons
-- Description: Schedules cron jobs for syncing ad sets and ads every 6 hours

BEGIN;

-- Schedule sync-ad-sets-every-6h
SELECT cron.schedule(
  'sync-ad-sets-every-6h',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://project-ref.supabase.co/functions/v1/sync-ad-sets',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Schedule sync-ads-every-6h
SELECT cron.schedule(
  'sync-ads-every-6h',
  '30 */6 * * *', -- Run 30 mins after ad sets to ensure parents exist
  $$
  SELECT
    net.http_post(
      url:='https://project-ref.supabase.co/functions/v1/sync-ads',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

COMMIT;
