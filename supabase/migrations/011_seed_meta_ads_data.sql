-- Migration: Seed data for Meta Ads testing
-- Description: Popula tabelas com dados de exemplo se estiverem vazias

-- Inserir conta de anúncios de teste (apenas se não existir)
INSERT INTO ad_accounts (id, external_id, business_name, provider, is_active, connected_by)
SELECT
  gen_random_uuid(),
  'act_123456789',
  'Conta de Teste - MetriCom',
  'meta',
  true,
  (SELECT id FROM profiles LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM ad_accounts LIMIT 1);
-- Inserir campanhas de teste (apenas se não existirem)
WITH test_account AS (
  SELECT id FROM ad_accounts LIMIT 1
)
INSERT INTO ad_campaigns (id, external_id, name, objective, status, ad_account_id, start_time)
SELECT
  gen_random_uuid(),
  'camp_' || generate_series,
  'Campanha ' || generate_series || ' - Leads',
  'LEAD_GENERATION',
  CASE WHEN generate_series % 3 = 0 THEN 'PAUSED' ELSE 'ACTIVE' END,
  (SELECT id FROM test_account),
  CURRENT_DATE - INTERVAL '90 days'
FROM generate_series(1, 3)
WHERE NOT EXISTS (SELECT 1 FROM ad_campaigns LIMIT 1);
-- Inserir dados diários de insights (últimos 90 dias)
WITH
  test_campaigns AS (
    SELECT id FROM ad_campaigns LIMIT 3
  ),
  date_series AS (
    SELECT
      generate_series(
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE - INTERVAL '1 day',
        '1 day'::interval
      )::date AS date
  )
INSERT INTO campaign_daily_insights (
  id,
  campaign_id,
  date,
  spend,
  impressions,
  clicks,
  leads_count
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM test_campaigns ORDER BY random() LIMIT 1),
  ds.date,
  -- Gasto diário entre R$ 50 e R$ 500
  (50 + random() * 450)::numeric(10,2),
  -- Impressões entre 1000 e 10000
  (1000 + random() * 9000)::integer,
  -- Cliques entre 20 e 200
  (20 + random() * 180)::integer,
  -- Leads entre 0 e 20
  (random() * 20)::integer
FROM date_series ds
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_daily_insights
  WHERE campaign_daily_insights.date = ds.date
);
-- Comentário informativo
COMMENT ON TABLE campaign_daily_insights IS 'Dados de teste gerados automaticamente para desenvolvimento. Em produção, estes dados virão da API do Meta.';
