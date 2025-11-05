
CREATE OR REPLACE FUNCTION get_creative_performance(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  impressions BIGINT,
  clicks BIGINT,
  spend DECIMAL,
  unique_ctr DECIMAL,
  image_url TEXT,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    SUM(adi.impressions)::BIGINT AS impressions,
    SUM(adi.clicks)::BIGINT AS clicks,
    SUM(adi.spend) AS spend,
    (CASE
      WHEN SUM(adi.impressions) > 0 THEN (SUM(adi.clicks) * 100.0) / SUM(adi.impressions)
      ELSE 0
    END)::DECIMAL AS unique_ctr,
    a.image_url,
    a.thumbnail_url
  FROM
    public.ads AS a
  JOIN
    public.ad_daily_insights AS adi ON a.id = adi.ad_id
  JOIN
    public.ad_sets AS aset ON a.ad_set_id = aset.id
  JOIN
    public.ad_campaigns AS ac ON aset.campaign_id = ac.id
  JOIN
    public.ad_accounts AS aa ON ac.ad_account_id = aa.id
  WHERE
    aa.organization_id = p_organization_id
    AND adi.date >= p_start_date
    AND adi.date <= p_end_date
  GROUP BY
    a.id, a.name, a.image_url, a.thumbnail_url
  ORDER BY
    impressions DESC;
END;
$$ LANGUAGE plpgsql;
