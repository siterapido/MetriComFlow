# Análise Completa da Estrutura Meta Ads no InsightFy

## 1. TABELAS DO BANCO DE DADOS

### 1.1 Tabelas de Conexão e Contas

**`meta_business_connections`** (Migração 004)
- Armazena tokens OAuth do Meta Business Manager
- Campos: id, user_id, meta_user_id, meta_user_name, meta_user_email, access_token, token_expires_at, is_active, created_at, updated_at
- Propósito: Autenticação com Meta Business Manager
- RLS: Por user_id (cada usuário vê apenas suas próprias conexões)

**`ad_accounts`** (Migração 004, atualizada com org_id em migrações posteriores)
- Armazena contas publicitárias do Meta (ou Google)
- Campos: id, external_id (ID do Meta), business_name, provider, is_active, connected_by (user_id), organization_id, created_at, updated_at
- Propósito: Vincular contas de publicidade à organização
- RLS: Por organization_id (multi-tenant safe)
- Status: Pode ser ativo ou inativo (soft delete via is_active=false)

### 1.2 Tabelas de Campanhas

**`ad_campaigns`** (Tipo gerado automaticamente no database.types.ts)
- Armazena campanhas do Meta
- Campos: id, external_id (ID do Meta), ad_account_id, name, objective, status, start_time, stop_time, created_at, updated_at
- Propósito: Rastrear campanhas de publicidade
- Relacionamento: ad_account_id → ad_accounts.id
- RLS: Através do ad_account (inheritance via ad_accounts.organization_id)
- Nota: Criada via migrations (provavelmente 005_unify_ad_accounts.sql ou 006_mvp_enhancements.sql)

**`campaign_daily_insights`** (Migração 006)
- Armazena métricas diárias por campanha
- Campos: id, campaign_id, date, spend, impressions, clicks, leads_count, created_at
- Propósito: Métricas históricas de performance
- RLS: Por organization (através de campaign_id)
- Unique: (campaign_id, date) - uma métrica por campanha por dia

### 1.3 Tabelas de Ad Sets e Ads/Criativos (NOVO)

**`ad_sets`** (Migração 20251203120000)
- Armazena conjuntos de anúncios (intermediário entre campanha e anúncio)
- Campos: id, external_id (ID do Meta), campaign_id, name, status, optimization_goal, billing_event, bid_strategy, targeting (JSONB), daily_budget, lifetime_budget, start_time, end_time, created_at, updated_at
- Propósito: Análise granular por conjunto de anúncios
- RLS: Por organization (através de campaign_id → ad_campaigns → ad_accounts)

**`ads`** (Migração 20251203120000)
- Armazena anúncios/criativos individuais
- Campos: id, external_id (ID do Meta), ad_set_id, campaign_id (desnormalizado), name, status, creative_id, creative_type (IMAGE, VIDEO, CAROUSEL, etc), title, body, call_to_action, link_url, image_url, video_url, thumbnail_url, creative_data (JSONB), created_time, updated_time, created_at, updated_at
- Propósito: Análise por criativo individual
- RLS: Por organization (através de ad_set_id)

**`ad_set_daily_insights`** (Migração 20251203120000)
- Métricas diárias por conjunto de anúncios
- Campos: id, ad_set_id, campaign_id (desnormalizado), date, spend, impressions, clicks, leads_count, reach, frequency, actions (JSONB), cpc, cpm, cpl, link_clicks, post_engagement, created_at
- Unique: (ad_set_id, date)

**`ad_daily_insights`** (Migração 20251203120000)
- Métricas diárias por anúncio/criativo
- Campos: id, ad_id, ad_set_id (desnormalizado), campaign_id (desnormalizado), date, spend, impressions, clicks, leads_count, reach, frequency, actions (JSONB), cpc, cpm, cpl, link_clicks, post_engagement, video_views, video_avg_time_watched, quality_ranking (ABOVE_AVERAGE/AVERAGE/BELOW_AVERAGE), engagement_ranking, conversion_ranking, created_at
- Unique: (ad_id, date)
- Nota: Inclui Meta Quality Ranking (MQR)

### 1.4 Integrações com Leads

**Campos adicionados em `leads`** (Migração 006)
- source: TEXT ('meta_ads' ou 'manual')
- external_lead_id: TEXT (ID do Meta Lead - para deduplicação)
- ad_id, adset_id: TEXT (referências externas do Meta)
- campaign_id: UUID FOREIGN KEY → ad_campaigns.id
- closed_won_at, closed_lost_at: TIMESTAMPTZ (datas de fechamento)
- lost_reason: TEXT (por que a venda foi perdida)
- status: ENUM ('novo_lead', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido')

---

## 2. HOOKS PARA FETCH DE DADOS

### 2.1 `useMetaAuth()` (src/hooks/useMetaAuth.ts)

**Responsabilidades:**
- Fluxo OAuth com Meta Business Manager
- Gerenciamento de contas publicitárias
- Sincronização de campanhas
- Sincronização de insights diários

**Principais funções:**
```typescript
// OAuth Flow
getAuthUrl() → retorna URL de OAuth do Meta
exchangeCode(code) → troca code por access token
connectMetaBusiness() → inicia fluxo OAuth
disconnectMetaBusiness(connectionId) → desativa conexão

// Gerenciamento de Contas
addAdAccount({external_id, business_name}) → adiciona conta manual
activateAdAccount(accountId)
deactivateAdAccount(accountId)
renameAdAccount(accountId, newName)
deleteAdAccount(accountId) → deleta permanentemente
mergeAdAccounts(sourceId, targetId) → unifica contas duplicadas

// Verificações
findDuplicateAccount(externalId)
checkAccountConnected(externalId) → verifica se já conectada globalmente
listAvailableAccounts() → lista contas disponíveis no Meta

// Sincronização
syncCampaigns(accountId) → chama connect-ad-account Edge Function
syncDailyInsights(params) → chama sync-daily-insights Edge Function
```

**State Management:**
- connections: MetaConnection[] - conexões OAuth ativas
- adAccounts: AdAccount[] - contas publicitárias
- availableAccounts: AvailableAdAccount[] - contas disponíveis no Meta
- loading, connecting, loadingAvailableAccounts: estados
- oauthError: string | null

### 2.2 `useMetaMetrics()` (src/hooks/useMetaMetrics.ts) - PARCIAL

**Responsabilidades:**
- Fetch de contas publicitárias
- Fetch de campanhas
- KPIs consolidados
- Financeiros por campanha

**Principais funções:**
```typescript
useAdAccounts(options?) → retorna contas ativas da organização
useAdCampaigns(accountId?, options?) → retorna campanhas (filtráveis por conta)
```

**Interfaces principais:**
```typescript
BusinessKPIs {
  investimento_total: number
  leads_gerados: number
  clientes_fechados: number
  faturamento_realizado: number
  faturamento_previsto: number
  leads_ativos: number
  cpl: number | null
  roas: number | null
  taxa_conversao: number
}

CampaignFinancials {
  campaign_id, campaign_name, campaign_status, campaign_objective
  account_name
  investimento, impressions, clicks, leads_gerados
  vendas_fechadas, vendas_perdidas, em_negociacao
  faturamento, pipeline_value
  cpl, roas, ctr, taxa_conversao
}
```

### 2.3 `useAdSetsAndAds()` (src/hooks/useAdSetsAndAds.ts) - NOVO

**Responsabilidades:**
- Fetch de ad sets por campanha
- Fetch de ads/criativos por ad set
- Métricas por ad set e por ad
- Performance de criativos

**Interfaces:**
```typescript
AdSet {
  id, external_id, campaign_id, name, status
  optimization_goal, billing_event, bid_strategy
  targeting (JSONB), daily_budget, lifetime_budget
  start_time, end_time
}

Ad {
  id, external_id, ad_set_id, campaign_id
  name, status, creative_id, creative_type
  title, body, call_to_action, link_url
  image_url, video_url, thumbnail_url, creative_data (JSONB)
  created_time, updated_time
}

AdSetMetrics {
  ad_set_id, ad_set_name
  spend, impressions, clicks, leads_count
  cpl, cpm, cpc, ctr, reach, frequency
}

AdMetrics {
  ad_id, ad_name, creative_type
  image_url, video_url
  spend, impressions, clicks, leads_count
  cpl, cpm, cpc, ctr
  quality_ranking, engagement_ranking, conversion_ranking
}
```

---

## 3. EDGE FUNCTIONS (Sincronização de Dados)

### 3.1 `meta-auth` (supabase/functions/meta-auth/index.ts)

**Ações:**
- `get_auth_url` → retorna URL de OAuth do Meta
- `exchange_code` → troca authorization code por access token
- `list_available_accounts` → lista contas disponíveis no Meta

**Flow:**
1. Frontend chama com `action: 'get_auth_url'`
2. Edge Function retorna OAuth URL
3. Usuário autoriza no Meta
4. Meta redireciona para `/metricas?code=XXX&state=USER_ID`
5. Frontend chama `exchange_code` com o code
6. Token armazenado em `meta_business_connections`

### 3.2 `connect-ad-account` (supabase/functions/connect-ad-account/index.ts)

**Ações:**
- Recebe: ad_account_id, access_token
- Chama Meta Graph API v24.0 para buscar dados da conta
- Busca TODAS as campanhas da conta
- Armazena campanhas em `ad_campaigns`

**Meta API Endpoints:**
```
GET /v24.0/act_{AD_ACCOUNT_ID}
  ?fields=id,name,business_name,campaigns{id,name,objective,status,start_time,stop_time}
  &access_token=TOKEN
```

**Output:**
- Campaigns sync status
- Number of campaigns synced

**Nota:** Este é o ponto crítico onde campanhas entram no sistema!

### 3.3 `sync-daily-insights` (supabase/functions/sync-daily-insights/index.ts)

**Responsabilidades:**
- Busca métricas diárias do Meta API
- Suporta full-year ranges com chunking (max 30-90 dias por chunk)
- Valida date ranges e filtros
- Suporta dry-run (validação sem write)
- Implementa rate limit detection

**Parâmetros:**
```typescript
{
  since?: string        // ISO date, default: today-1
  until?: string        // ISO date, default: today-1
  ad_account_ids?: string[]      // Filter by internal ad_accounts.id
  campaign_external_ids?: string[] // Filter by external Meta IDs
  dryRun?: boolean      // Validate only, don't write
  maxDaysPerChunk?: number  // 1-90, default 30
  logResponseSample?: boolean
}
```

**Meta API Call:**
```
GET /v24.0/{CAMPAIGN_ID}/insights
  ?fields=campaign_id,date_start,spend,impressions,clicks,actions
  &time_range={since,until}
  &time_granularity=daily
  &access_token=TOKEN
```

**Métricas Extraídas:**
- spend: sum of `spend` field
- impressions: sum of `impressions` field
- clicks: sum of `clicks` field
- leads_count: count of actions where action_type in [lead, leads, leadgen.other, onsite_conversion.lead_form.submit]

**Token Resolution (prioridade):**
1. User's access token from `meta_business_connections` (se não expirado)
2. Global `META_ACCESS_TOKEN` env var (fallback)
3. Se nenhum disponível → skip com warning

**Output:**
- Insere em `campaign_daily_insights`
- Detecção de rate limits (HTTP 429, error codes 4/17/613)

### 3.4 `sync-ad-sets` (supabase/functions/sync-ad-sets/index.ts) - NOVO

**Responsabilidades:**
- Busca ad sets de uma campanha no Meta
- Sincroniza informações de targeting e budget
- Armazena em `ad_sets`

### 3.5 `sync-ads` (supabase/functions/sync-ads/index.ts) - NOVO

**Responsabilidades:**
- Busca anúncios/criativos de um ad set
- Extrai informações criativas (tipo, URL, thumbnail)
- Armazena em `ads`

### 3.6 `sync-adset-insights` (supabase/functions/sync-adset-insights/index.ts) - NOVO

**Responsabilidades:**
- Busca métricas diárias de ad sets
- Calcula CPL, CPM, CPC
- Armazena em `ad_set_daily_insights`

### 3.7 `sync-ad-insights` (supabase/functions/sync-ad-insights/index.ts) - NOVO

**Responsabilidades:**
- Busca métricas diárias de ads/criativos
- Inclui Meta Quality Ranking (MQR)
- Armazena em `ad_daily_insights`

---

## 4. VIEWS (Agregações e KPIs)

### 4.1 `business_kpis` (Migração 006)

**Objetivo:** KPIs consolidados do negócio no mês atual

**Cálculos:**
- investimento_total: SUM(campaign_daily_insights.spend)
- leads_gerados: COUNT leads where source='meta_ads'
- clientes_fechados: COUNT leads where status='fechado_ganho'
- faturamento_realizado: SUM(leads.value) where status='fechado_ganho'
- faturamento_previsto: SUM(leads.value) where status IN ('negociacao', 'proposta')
- leads_ativos: COUNT leads where status NOT IN ('fechado_ganho', 'fechado_perdido')
- cpl: investimento_total / leads_gerados
- roas: faturamento_realizado / investimento_total
- taxa_conversao: (clientes_fechados / leads_gerados) * 100

### 4.2 `campaign_financials` (Migração 006)

**Objetivo:** Financeiros por campanha (para dashboard de métricas)

**Campos:**
- campaign_id, campaign_name, campaign_status, campaign_objective, account_name
- investimento (SUM spend), impressions, clicks
- leads_gerados, vendas_fechadas, vendas_perdidas, em_negociacao
- faturamento, pipeline_value
- cpl, roas, ctr, taxa_conversao

---

## 5. QUAIS DADOS ESTÃO SENDO SINCRONIZADOS

### IMPLEMENTADOS ✅
1. **Meta Business Connections** → `meta_business_connections`
   - OAuth tokens, user info, expiration dates
   
2. **Ad Accounts** → `ad_accounts`
   - Account ID, name, provider, status
   
3. **Campaigns** → `ad_campaigns`
   - Campaign ID, name, objective, status, dates
   - Sincronizado via `connect-ad-account` Edge Function
   
4. **Campaign Daily Insights** → `campaign_daily_insights`
   - Date, spend, impressions, clicks, leads_count
   - Sincronizado via `sync-daily-insights` Edge Function
   - Suporta full-year ranges com chunking

5. **Lead Integration** → `leads.source='meta_ads'`
   - external_lead_id para deduplicação
   - Vinculação com campaign_id

### RECENTEMENTE ADICIONADOS (Sprint 2 - Oct 2024) 🆕
6. **Ad Sets** → `ad_sets`
   - Ad Set ID, name, status, targeting, budget
   - Sincronizado via `sync-ad-sets` Edge Function
   
7. **Ads/Criativos** → `ads`
   - Ad ID, name, creative type, content (title, body, CTA, URLs)
   - Sincronizado via `sync-ads` Edge Function
   
8. **Ad Set Metrics** → `ad_set_daily_insights`
   - Date, spend, impressions, clicks, leads, reach, frequency, CPC, CPM, CPL
   - Sincronizado via `sync-adset-insights` Edge Function
   
9. **Ad Metrics** → `ad_daily_insights`
   - Date, spend, impressions, clicks, leads
   - Meta Quality Ranking (ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE)
   - Engagement and Conversion Rankings
   - Sincronizado via `sync-ad-insights` Edge Function

---

## 6. QUAIS DADOS ESTÃO FALTANDO

### NÃO IMPLEMENTADOS ❌

1. **Ad Set Creatives** → Falta tabela
   - Qual criativo está ativo em qual ad set
   - Versioning de criativos
   - Status da criação do criativo

2. **Meta Conversion API** → Parcialmente
   - Existe `meta_conversions_api` migration (20251202180000)
   - Mas sem hooks ou integration visible
   - Falta de webhook handling para conversões

3. **Lead Ads Details** → Parcial
   - Básico: external_lead_id, ad_id, adset_id
   - Falta: Lead form details, custom fields, lead details from Meta

4. **Audience/Targeting Details** → JSONB apenas
   - Stored em `ad_sets.targeting` mas não parsed/queryable
   - Falta: Views para filtrar por audience demographics

5. **Budget Spend Pacing** → Falta
   - Falta: Previsão de spend até fim do período
   - Falta: Alert se budget será excedido

6. **A/B Testing Results** → Falta
   - Falta: Teste A vs B comparison
   - Falta: Statistical significance testing

7. **Creative Performance Ranking** → Parcial
   - Tem: quality_ranking, engagement_ranking, conversion_ranking
   - Falta: Top performers report
   - Falta: Creative fatigue detection

8. **Cross-Campaign Analysis** → Falta
   - Falta: Campaign comparison/benchmarking
   - Falta: Multi-account consolidated metrics

9. **Attribution Modeling** → Não existe
   - Falta: Multi-touch attribution
   - Falta: First/last click attribution
   - Apenas: Direct campaign_id linkage on leads

10. **Lookalike Audience Performance** → Falta
    - Falta: Track which audiences are performing best
    - Falta: Audience insights

11. **Dynamic Ads/Catalog Integration** → Falta
    - Falta: Product performance
    - Falta: Catalog sync

12. **Lead Form Field Mapping** → Parcial
    - Existe webhook (webhook-lead-ads)
    - Falta: Full schema of lead form fields

---

## 7. FLUXO DE SINCRONIZAÇÃO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CONNECTS META (OAuth Flow)                          │
└─────────────────────────────────────────────────────────────┘
         ↓
    useMetaAuth.connectMetaBusiness()
         ↓
    meta-auth Edge Function
         ↓
    meta_business_connections table

┌─────────────────────────────────────────────────────────────┐
│ 2. USER ADDS AD ACCOUNT (Manual)                            │
└─────────────────────────────────────────────────────────────┘
         ↓
    useMetaAuth.addAdAccount({external_id, business_name})
         ↓
    ad_accounts table (created)

┌─────────────────────────────────────────────────────────────┐
│ 3. SYNC CAMPAIGNS (Auto when account added)                 │
└─────────────────────────────────────────────────────────────┘
         ↓
    useMetaAuth.syncCampaigns(accountId)
         ↓
    connect-ad-account Edge Function
         ↓
    Meta API: /v24.0/act_{ID}/campaigns
         ↓
    ad_campaigns table (created/updated)

┌─────────────────────────────────────────────────────────────┐
│ 4. SYNC DAILY INSIGHTS (Manual or Cron)                     │
└─────────────────────────────────────────────────────────────┘
         ↓
    useMetaAuth.syncDailyInsights({since, until})
         ↓
    sync-daily-insights Edge Function
         ↓
    Meta API: /v24.0/{CAMPAIGN_ID}/insights
         ↓
    campaign_daily_insights table (created/updated)

┌─────────────────────────────────────────────────────────────┐
│ 5. SYNC AD SETS & ADS (New - Sprint 2)                      │
└─────────────────────────────────────────────────────────────┘
         ↓
    sync-ad-sets Edge Function
         ↓
    Meta API: /v24.0/{CAMPAIGN_ID}/adsets
         ↓
    ad_sets table (created/updated)
         ↓
    sync-ads Edge Function
         ↓
    Meta API: /v24.0/{ADSET_ID}/ads
         ↓
    ads table (created/updated)

┌─────────────────────────────────────────────────────────────┐
│ 6. SYNC DETAILED INSIGHTS (New - Sprint 2)                  │
└─────────────────────────────────────────────────────────────┘
         ↓
    sync-adset-insights Edge Function
         ↓
    Meta API: /v24.0/{ADSET_ID}/insights
         ↓
    ad_set_daily_insights table (created/updated)
         ↓
    sync-ad-insights Edge Function
         ↓
    Meta API: /v24.0/{AD_ID}/insights (with quality_ranking)
         ↓
    ad_daily_insights table (created/updated)
```

---

## 8. ARQUITETURA MULTI-TENANCY

Todas as tabelas de Meta Ads estão configuradas para multi-tenancy:

1. **ad_accounts** → `organization_id` (FK → organizations.id)
2. **ad_campaigns** → organization via ad_accounts (FK chain)
3. **campaign_daily_insights** → organization via campaign_id
4. **ad_sets** → organization via campaign_id
5. **ads** → organization via ad_set_id
6. **ad_set_daily_insights** → organization via ad_set_id
7. **ad_daily_insights** → organization via ad_id

**RLS Policies:** Todas as políticas verificam `organization_memberships` para validar acesso do usuário.

---

## 9. API ENDPOINTS DO META USADOS

- `Graph API v24.0`
- `/v24.0/act_{AD_ACCOUNT_ID}` - Account info
- `/v24.0/act_{AD_ACCOUNT_ID}/campaigns` - List campaigns
- `/v24.0/{CAMPAIGN_ID}/insights` - Campaign metrics
- `/v24.0/{ADSET_ID}/insights` - Ad set metrics
- `/v24.0/{AD_ID}/insights` - Ad metrics (com quality_ranking)
- `/v24.0/{ADSET_ID}/adsets` - List ad sets
- `/v24.0/{ADSET_ID}/ads` - List ads/creatives

**Campos solicitados:** id, name, objective, status, start_time, stop_time, spend, impressions, clicks, actions, quality_ranking, engagement_ranking, conversion_ranking

---

## 10. STATUS DA IMPLEMENTAÇÃO (Resumo)

### Totalmente Implementado ✅
- OAuth Authentication
- Ad Account Management
- Campaign Sync (level 1)
- Campaign Daily Insights (level 1)
- Lead Integration (basic)

### Implementado Recentemente 🆕
- Ad Sets Sync (level 2)
- Ads/Creatives Sync (level 2)
- Ad Set Metrics (level 2)
- Ad Metrics com MQR (level 2)

### Em Progresso 🔄
- Meta Conversion API (table criada, sem hooks)
- Lead Form Webhooks (existe, sem integração full)

### Não Implementado ❌
- Audience Performance
- Budget Pacing
- A/B Test Results
- Attribution Modeling
- Cross-Campaign Comparison
- Creative Fatigue Detection
- Lookalike Audiences
- Dynamic Ads/Catalog

