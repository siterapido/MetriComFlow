# Meta Ads - Quick Reference Guide

## 📊 Tabelas de Dados (9 tabelas relacionadas)

```
meta_business_connections
├─ user_id → profiles
├─ access_token (OAuth)
└─ token_expires_at

ad_accounts
├─ external_id (Meta Account ID)
├─ organization_id → organizations
├─ provider (meta/google)
└─ is_active (soft delete)

ad_campaigns
├─ external_id (Meta Campaign ID)
├─ ad_account_id → ad_accounts
├─ name, objective, status
└─ start_time, stop_time

campaign_daily_insights
├─ campaign_id → ad_campaigns
├─ date (UNIQUE per campaign)
├─ spend, impressions, clicks
└─ leads_count

ad_sets ⭐ NEW (Sprint 2)
├─ external_id (Meta AdSet ID)
├─ campaign_id → ad_campaigns
├─ optimization_goal, billing_event
├─ targeting (JSONB)
└─ daily_budget, lifetime_budget

ads ⭐ NEW (Sprint 2)
├─ external_id (Meta Ad ID)
├─ ad_set_id → ad_sets
├─ creative_type (IMAGE, VIDEO, CAROUSEL...)
├─ title, body, call_to_action
└─ image_url, video_url, thumbnail_url, creative_data (JSONB)

ad_set_daily_insights ⭐ NEW (Sprint 2)
├─ ad_set_id → ad_sets
├─ date (UNIQUE per ad_set)
├─ spend, impressions, clicks, leads
└─ cpc, cpm, cpl, reach, frequency

ad_daily_insights ⭐ NEW (Sprint 2)
├─ ad_id → ads
├─ date (UNIQUE per ad)
├─ spend, impressions, clicks, leads
├─ quality_ranking (Meta Quality Ranking)
└─ engagement_ranking, conversion_ranking

leads (extended)
├─ source ('meta_ads' | 'manual')
├─ external_lead_id (Meta ID, for dedup)
├─ campaign_id → ad_campaigns
├─ status (novo_lead → qualificacao → proposta → negociacao → fechado_ganho|fechado_perdido)
└─ closed_won_at, closed_lost_at
```

## 🔄 Sync Flow Diagram

```
[User OAuth via Meta] → meta-auth function
                        ↓
                   meta_business_connections (token stored)
                        ↓
[Add Ad Account] → addAdAccount() 
                  ↓
            ad_accounts (created)
                  ↓
[Sync Campaigns] → syncCampaigns() → connect-ad-account function
                                      ↓ Meta API: /campaigns
                                 ad_campaigns (synced)
                                      ↓
[Sync Daily Insights] → syncDailyInsights() → sync-daily-insights function
                                               ↓ Meta API: /insights
                                          campaign_daily_insights (synced)
                                               ↓
[Sync Ad Sets] ⭐ → sync-ad-sets function
                    ↓ Meta API: /adsets
               ad_sets (synced)
                    ↓
[Sync Ads/Creatives] ⭐ → sync-ads function
                          ↓ Meta API: /{adset}/ads
                     ads (synced)
                          ↓
[Sync Ad Metrics] ⭐ → sync-adset-insights + sync-ad-insights
                       ↓ Meta API: /{adset}/insights, /{ad}/insights
                  ad_set_daily_insights + ad_daily_insights (synced)
```

## 📡 Edge Functions (7 functions)

| Function | Action | Input | Output |
|----------|--------|-------|--------|
| `meta-auth` | OAuth flow | action, code, redirect_uri | auth_url, access_token, success |
| `connect-ad-account` | Campaign sync | ad_account_id, access_token | campaigns_synced, campaign_list |
| `sync-daily-insights` | Insights sync | since, until, ad_account_ids | recordsProcessed, message |
| `sync-ad-sets` | ⭐ Ad sets | campaign_id, access_token | ad_sets_synced |
| `sync-ads` | ⭐ Creatives | ad_set_id, access_token | ads_synced |
| `sync-adset-insights` | ⭐ Ad set metrics | ad_set_id, since, until | insights_synced |
| `sync-ad-insights` | ⭐ Ad metrics | ad_id, since, until | insights_synced (with MQR) |

## 🪝 Frontend Hooks (3 hooks)

### `useMetaAuth()`
```typescript
// OAuth & Account Management
connectMetaBusiness() → initiates OAuth
exchangeCode(code) → stores token
addAdAccount({external_id, business_name})
syncCampaigns(accountId)
syncDailyInsights({since?, until?, accountIds?})

// Returns
{
  connections: MetaConnection[]
  adAccounts: AdAccount[]
  loading, connecting
  hasActiveConnection: boolean
}
```

### `useMetaMetrics()`
```typescript
// Fetch aggregated data
useAdAccounts() → returns active ad accounts
useAdCampaigns(accountId?) → returns campaigns with metrics

// Returns KPIs
BusinessKPIs {
  investimento_total, leads_gerados, clientes_fechados
  faturamento_realizado, faturamento_previsto
  cpl, roas, taxa_conversao
}

CampaignFinancials {
  campaign metrics + CPL + ROAS + CTR + conversion rate
}
```

### `useAdSetsAndAds()` ⭐
```typescript
// Fetch granular data
useAdSets(campaignId) → returns ad sets
useAds(adSetId) → returns ads/creatives
useAdSetMetrics(adSetId, dateRange) → metrics
useAdMetrics(adId, dateRange) → metrics (with MQR)

// Returns
AdSet { id, name, targeting, budget, optimization_goal }
Ad { id, creative_type, title, body, image_url, video_url }
AdSetMetrics { spend, impressions, clicks, leads, cpl, cpm, cpc }
AdMetrics { spend, impressions, clicks, leads, quality_ranking, engagement_ranking, conversion_ranking }
```

## 🗄️ Views (2 views)

| View | Purpose | Key Metrics |
|------|---------|-------------|
| `business_kpis` | Monthly KPIs | investimento_total, leads_gerados, clientes_fechados, cpl, roas, taxa_conversao |
| `campaign_financials` | Campaign performance | campaign_id, investimento, leads_gerados, vendas_fechadas, faturamento, cpl, roas, ctr |

## 🔐 Multi-Tenancy & RLS

All tables are organization-scoped:
- `ad_accounts` → `organization_id`
- `ad_campaigns` → via ad_accounts
- `ad_sets` → via campaigns
- `ads` → via ad_sets
- All insights tables → organization-filtered

## 📊 Data Synchronized From Meta API

### ✅ Implemented
- OAuth tokens
- Ad accounts info
- Campaigns (id, name, objective, status, dates)
- Campaign daily metrics (spend, impressions, clicks, leads_count)

### ⭐ Recently Added (Sprint 2)
- Ad sets (with targeting & budget)
- Ads/Creatives (with creative type & content)
- Ad set daily metrics
- Ad daily metrics + Meta Quality Ranking

### ❌ Not Implemented
- Audience performance details
- Budget pacing/projections
- A/B test results
- Attribution modeling
- Ad set creative assignment history
- Meta Conversion API (table exists, no hooks)
- Lead form field mapping (webhook exists, no full integration)

## 📈 Meta API Endpoints Used

```
Graph API v24.0

GET /v24.0/act_{ACCOUNT_ID}
  → Account info

GET /v24.0/act_{ACCOUNT_ID}/campaigns
  → List all campaigns with basic info

GET /v24.0/{CAMPAIGN_ID}/insights
  → Daily metrics (spend, impressions, clicks, actions)

GET /v24.0/{CAMPAIGN_ID}/adsets
  → ⭐ List ad sets

GET /v24.0/{ADSET_ID}/ads
  → ⭐ List ads with creative info

GET /v24.0/{ADSET_ID}/insights
  → ⭐ Ad set daily metrics

GET /v24.0/{AD_ID}/insights
  → ⭐ Ad daily metrics (with quality_ranking, engagement_ranking, conversion_ranking)
```

## 🔧 Key Configuration

- **API Version:** Meta Graph API v24.0
- **OAuth Redirect:** `VITE_META_REDIRECT_URI` environment variable (defaults to `/metricas`)
- **Token Storage:** `meta_business_connections` table
- **Rate Limiting:** Implemented in `sync-daily-insights` (detects HTTP 429)
- **Date Range Chunking:** max 30-90 days per API request
- **Lead Deduplication:** via `external_lead_id` (unique index)

## 🚀 Common Tasks

### Add a Meta Ad Account
```typescript
const { addAdAccount, syncCampaigns } = useMetaAuth()

await addAdAccount({
  external_id: '1234567890',  // Meta Account ID
  business_name: 'My Ad Account'
})
// syncCampaigns will be called automatically by user
```

### Sync Daily Insights for Past 30 Days
```typescript
const { syncDailyInsights } = useMetaAuth()

await syncDailyInsights({
  since: '2025-10-01',
  until: '2025-10-31'
})
```

### Query Campaign Financials
```typescript
const { data: financials } = await supabase
  .from('campaign_financials')
  .select('*')
  .eq('organization_id', orgId)
  .order('investimento', { ascending: false })
```

### View Ad Creative Performance
```typescript
const { data: adMetrics } = await supabase
  .from('ad_daily_insights')
  .select(`
    ad_id,
    ads(name, creative_type, image_url),
    spend,
    impressions,
    clicks,
    leads_count,
    quality_ranking
  `)
  .eq('campaign_id', campaignId)
  .gte('date', '2025-10-01')
  .lte('date', '2025-10-31')
```

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Campaigns not showing | Not synced | Call `syncCampaigns()` |
| Metrics empty | Insights not synced | Call `syncDailyInsights({since, until})` |
| Token expired | Token > 60 days old | Disconnect and reconnect Meta |
| Rate limit error | Too many API calls | Implement backoff, use `maxDaysPerChunk` |
| Duplicate accounts | Same account added multiple times | Use `mergeAdAccounts()` |

## 📚 Files Reference

```
src/
├── hooks/
│   ├── useMetaAuth.ts (917 lines) - OAuth + sync
│   ├── useMetaMetrics.ts (partial) - campaign financials
│   └── useAdSetsAndAds.ts (partial) - ad sets & ads
│
├── pages/
│   └── MetaAdsConfig.tsx - Main UI page

supabase/
├── functions/
│   ├── meta-auth/index.ts - OAuth flow
│   ├── connect-ad-account/index.ts - Campaign sync
│   ├── sync-daily-insights/index.ts - Metrics sync
│   ├── sync-ad-sets/index.ts ⭐
│   ├── sync-ads/index.ts ⭐
│   ├── sync-adset-insights/index.ts ⭐
│   └── sync-ad-insights/index.ts ⭐
│
└── migrations/
    ├── 004_meta_ads_tables.sql - Initial setup
    ├── 006_mvp_enhancements.sql - Campaign + insights
    └── 20251203120000_meta_ad_sets_and_ads.sql ⭐ - Ad sets & ads
```

