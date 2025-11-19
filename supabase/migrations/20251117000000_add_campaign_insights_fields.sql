-- Migration: Add link_clicks and website_ctr to campaign_daily_insights
-- Date: 2025-11-17

BEGIN;

ALTER TABLE public.campaign_daily_insights
  ADD COLUMN IF NOT EXISTS link_clicks BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_ctr NUMERIC DEFAULT 0;

-- Create or replace view with security_invoker for campaign overview
CREATE OR REPLACE VIEW public.v_campaign_overview
WITH (security_invoker = true)
AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  COALESCE(SUM(ci.spend), 0) AS spend,
  COALESCE(SUM(ci.impressions), 0) AS impressions,
  COALESCE(SUM(ci.clicks), 0) AS clicks,
  COALESCE(SUM(ci.link_clicks), 0) AS link_clicks,
  -- Average website_ctr across days (simple mean)
  COALESCE(AVG(ci.website_ctr), 0) AS website_ctr,
  CASE WHEN COALESCE(SUM(ci.clicks), 0) > 0 THEN COALESCE(SUM(ci.spend), 0) / COALESCE(SUM(ci.clicks), 0) ELSE 0 END AS cpc,
  CASE WHEN COALESCE(SUM(ci.impressions), 0) > 0 THEN (COALESCE(SUM(ci.spend), 0) / COALESCE(SUM(ci.impressions), 0)) * 1000 ELSE 0 END AS cpm,
  CASE WHEN COALESCE(SUM(ci.impressions), 0) > 0 THEN (COALESCE(SUM(ci.clicks), 0)::NUMERIC / COALESCE(SUM(ci.impressions), 0)) * 100 ELSE 0 END AS ctr
FROM public.ad_campaigns c
LEFT JOIN public.campaign_daily_insights ci ON ci.campaign_id = c.id
GROUP BY c.id, c.name;

COMMENT ON VIEW public.v_campaign_overview IS 'Aggregated campaign metrics with security_invoker=true';

COMMIT;