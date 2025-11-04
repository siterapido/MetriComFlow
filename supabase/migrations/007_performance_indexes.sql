-- 007_performance_indexes.sql
-- Purpose: Improve performance of date-range queries over 3+ months for campaign insights and leads
-- Notes:
-- - Adds indexes to support filtering by date ranges and account/campaign constraints
-- - Complements existing idx_campaign_insights_date (campaign_id, date DESC)
-- - Safe to run multiple times due to IF NOT EXISTS

BEGIN;
-- 1) Daily insights: support date-only range queries (across many campaigns)
CREATE INDEX IF NOT EXISTS idx_campaign_daily_insights_date_only
  ON public.campaign_daily_insights (date DESC);
-- 2) Ad campaigns: support filtering by ad account
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_account
  ON public.ad_campaigns (ad_account_id);
-- 3) Leads: support per-campaign date filtering for different lifecycle events
-- 3a) Leads created (general generation window)
CREATE INDEX IF NOT EXISTS idx_leads_campaign_created_at
  ON public.leads (campaign_id, created_at DESC);
-- 3b) Closed won (vendas_fechadas / faturamento)
CREATE INDEX IF NOT EXISTS idx_leads_campaign_closed_won_at
  ON public.leads (campaign_id, closed_won_at DESC);
-- 3c) Closed lost (vendas_perdidas)
CREATE INDEX IF NOT EXISTS idx_leads_campaign_closed_lost_at
  ON public.leads (campaign_id, closed_lost_at DESC);
-- 3d) Updated (pipeline / negociação)
CREATE INDEX IF NOT EXISTS idx_leads_campaign_updated_at
  ON public.leads (campaign_id, updated_at DESC);
COMMIT;
