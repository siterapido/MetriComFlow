-- Migration: Create get_ad_metrics function for ad-level metrics
-- Date: 2025-12-13
-- Reason: Function get_ad_metrics is called from useAdMetrics hook but doesn't exist

BEGIN;

CREATE OR REPLACE FUNCTION get_ad_metrics(
  p_account_id TEXT DEFAULT NULL,
  p_campaign_id TEXT DEFAULT NULL,
  p_ad_set_id TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  ad_id TEXT,
  ad_name TEXT,
  spend NUMERIC,
  impressions BIGINT,
  clicks BIGINT,
  leads_count BIGINT,
  cpl NUMERIC,
  cpm NUMERIC,
  cpc NUMERIC,
  ctr NUMERIC,
  reach BIGINT,
  frequency NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH insights_filtered AS (
    SELECT
      i.ad_id,
      i.spend,
      i.impressions,
      i.clicks,
      i.leads_count,
      i.reach,
      i.frequency,
      i.date
    FROM
      ad_daily_insights i
    JOIN
      ads a ON i.ad_id = a.id
    JOIN
      ad_sets s ON a.ad_set_id = s.id
    JOIN
      ad_campaigns c ON s.campaign_id = c.id
    WHERE
      (p_account_id IS NULL OR c.ad_account_id = p_account_id) AND
      (p_campaign_id IS NULL OR s.campaign_id = p_campaign_id) AND
      (p_ad_set_id IS NULL OR a.ad_set_id = p_ad_set_id) AND
      (p_start_date IS NULL OR i.date >= p_start_date) AND
      (p_end_date IS NULL OR i.date <= p_end_date)
  )
  SELECT
    a.id AS ad_id,
    a.name AS ad_name,
    COALESCE(SUM(i.spend), 0) AS spend,
    COALESCE(SUM(i.impressions), 0) AS impressions,
    COALESCE(SUM(i.clicks), 0) AS clicks,
    COALESCE(SUM(i.leads_count), 0) AS leads_count,
    CASE
      WHEN COALESCE(SUM(i.leads_count), 0) > 0 THEN COALESCE(SUM(i.spend), 0) / COALESCE(SUM(i.leads_count), 0)
      ELSE 0
    END AS cpl,
    CASE
      WHEN COALESCE(SUM(i.impressions), 0) > 0 THEN (COALESCE(SUM(i.spend), 0) / COALESCE(SUM(i.impressions), 0)) * 1000
      ELSE 0
    END AS cpm,
    CASE
      WHEN COALESCE(SUM(i.clicks), 0) > 0 THEN COALESCE(SUM(i.spend), 0) / COALESCE(SUM(i.clicks), 0)
      ELSE 0
    END AS cpc,
    CASE
      WHEN COALESCE(SUM(i.impressions), 0) > 0 THEN (COALESCE(SUM(i.clicks), 0)::NUMERIC / COALESCE(SUM(i.impressions), 0)) * 100
      ELSE 0
    END AS ctr,
    COALESCE(SUM(i.reach), 0) AS reach,
    COALESCE(AVG(i.frequency), 0) AS frequency
  FROM
    insights_filtered i
  JOIN
    ads a ON i.ad_id = a.id
  GROUP BY
    a.id, a.name
  ORDER BY
    spend DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ad_metrics IS 'Returns aggregated metrics for individual ads (creatives) filtered by account, campaign, ad set, and date range';

COMMIT;