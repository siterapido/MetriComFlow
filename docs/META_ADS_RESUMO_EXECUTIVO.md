# 📊 Resumo Executivo: Estrutura de Meta Ads no InsightFy

## Visão Geral

O projeto **InsightFy** possui uma integração completa com **Meta Ads** (Facebook/Instagram), implementada em 3 níveis de granularidade:

### Nível 1: Campanhas (Implementado ✅)
- Tabelas: `ad_campaigns`, `campaign_daily_insights`
- Dados: Nome, objetivo, status, data de início/fim
- Métricas: Spend, impressões, cliques, leads
- Edge Functions: `connect-ad-account`, `sync-daily-insights`

### Nível 2: Ad Sets & Criativos (Novo - Sprint 2 🆕)
- Tabelas: `ad_sets`, `ads`, `ad_set_daily_insights`, `ad_daily_insights`
- Dados: Targeting, budget, tipo criativo, conteúdo
- Métricas: CPM, CPC, CPL, reach, frequency + Meta Quality Ranking
- Edge Functions: `sync-ad-sets`, `sync-ads`, `sync-adset-insights`, `sync-ad-insights`

### Nível 3: Infraestrutura (Implementado ✅)
- Tabelas: `meta_business_connections`, `ad_accounts`
- Fluxo: OAuth → Tokens → Contas → Campanhas/Insights
- Multi-tenancy: Cada organização vê apenas seus dados

---

## 📋 Checklist: O que tem e o que falta

### ✅ IMPLEMENTADO (Pronto para Usar)

| # | Recurso | Tabela | Hook | Edge Function |
|---|---------|--------|------|---------------|
| 1 | OAuth com Meta | `meta_business_connections` | `useMetaAuth` | `meta-auth` |
| 2 | Gerenciar contas | `ad_accounts` | `useMetaAuth` | - |
| 3 | Campanhas | `ad_campaigns` | `useMetaMetrics` | `connect-ad-account` |
| 4 | Métricas diárias (campanha) | `campaign_daily_insights` | `useMetaMetrics` | `sync-daily-insights` |
| 5 | Conjuntos de anúncios | `ad_sets` | `useAdSetsAndAds` | `sync-ad-sets` |
| 6 | Anúncios/Criativos | `ads` | `useAdSetsAndAds` | `sync-ads` |
| 7 | Métricas (ad set) | `ad_set_daily_insights` | `useAdSetsAndAds` | `sync-adset-insights` |
| 8 | Métricas (ad) + MQR | `ad_daily_insights` | `useAdSetsAndAds` | `sync-ad-insights` |
| 9 | KPI consolidado | `business_kpis` (view) | - | - |
| 10 | Financeiros por campanha | `campaign_financials` (view) | - | - |

### ❌ NÃO IMPLEMENTADO (Futuro)

| # | Recurso | Por quê falta | Impacto |
|---|---------|---------------|--------|
| 1 | Audience Performance | Não há tabela | Difícil otimizar por público |
| 2 | Budget Pacing | Não há lógica | Sem alertas de overspend |
| 3 | A/B Testing Results | Não sincroniza com Meta | Sem comparação estatística |
| 4 | Attribution Modeling | Requer lógica custom | Crédito multicanal não mapeado |
| 5 | Creative Fatigue Detection | Não há alert | Sem recomendação de trocar criativo |
| 6 | Lead Form Details | Webhook existe, sem hooks | Campos do formulário não armazenados |
| 7 | Meta Conversion API | Tabela criada, sem hookss | Conversões offline não rastreadas |
| 8 | Cross-Campaign Benchmarking | Sem view agregada | Difícil comparar campanha A vs B |

---

## 🏗️ Arquitetura de Dados

### Hierarquia de Tabelas

```
meta_business_connections (tokens OAuth)
    ↓ (1 user: N tokens)
ad_accounts (contas publicitárias)
    ↓ (1 account: N campaigns)
ad_campaigns (campanhas)
    ├─→ campaign_daily_insights (métricas diárias)
    └─→ ad_sets (conjuntos de anúncios)
           ├─→ ad_set_daily_insights (métricas de ad set)
           └─→ ads (anúncios/criativos)
                  └─→ ad_daily_insights (métricas de ad)

leads (integração)
    ├─ source = 'meta_ads'
    ├─ external_lead_id (deduplicação com Meta)
    └─ campaign_id (link com campanha)
```

### Multi-Tenancy

Todas as tabelas têm `organization_id` ou herdam via FK:
- `ad_accounts.organization_id` → organizations
- `leads.organization_id` → organizations
- RLS: Usuários veem só dados da sua organização

---

## 🔄 Fluxo de Sincronização

```
1️⃣ AUTENTICAÇÃO
   User clica "Conectar Meta" 
   → meta-auth function (get_auth_url)
   → User autoriza no Meta
   → Meta redireciona com code
   → meta-auth function (exchange_code)
   → Token salvo em meta_business_connections

2️⃣ CONTA PUBLICITÁRIA
   User adiciona conta manualmente
   → addAdAccount({external_id, business_name})
   → Inserido em ad_accounts

3️⃣ CAMPANHAS
   User clica "Sincronizar Campanhas"
   → syncCampaigns(accountId)
   → connect-ad-account function
   → Meta API: GET /v24.0/act_{ID}/campaigns
   → Campanhas salvas em ad_campaigns

4️⃣ MÉTRICAS DE CAMPANHA
   User clica "Sincronizar Insights"
   → syncDailyInsights({since, until})
   → sync-daily-insights function
   → Meta API: GET /v24.0/{CAMPAIGN_ID}/insights
   → Métricas salvas em campaign_daily_insights

5️⃣ AD SETS (NOVO)
   Automático ou manual
   → sync-ad-sets function
   → Meta API: GET /v24.0/{CAMPAIGN_ID}/adsets
   → Ad sets salvos em ad_sets

6️⃣ ANÚNCIOS/CRIATIVOS (NOVO)
   Automático ou manual
   → sync-ads function
   → Meta API: GET /v24.0/{ADSET_ID}/ads
   → Anúncios salvos em ads

7️⃣ MÉTRICAS GRANULARES (NOVO)
   Automático ou manual
   → sync-adset-insights + sync-ad-insights
   → Meta API: GET /v24.0/{ADSET_ID}/insights, /v24.0/{AD_ID}/insights
   → Métricas salvas em ad_set_daily_insights e ad_daily_insights
```

---

## 📊 Métricas Disponíveis

### Nível Campanha
- **Gasto:** Sum(campaign_daily_insights.spend)
- **Impressões:** Sum(impressions)
- **Cliques:** Sum(clicks)
- **Leads Gerados:** Count(leads where source='meta_ads')
- **CPL:** Gasto / Leads Gerados
- **ROAS:** Faturamento / Gasto
- **Taxa de Conversão:** Vendas Fechadas / Leads Gerados

### Nível Ad Set
- Todas as acima +
- **Reach:** Alcance único
- **Frequency:** Frequência média
- **CPM:** Custo por mil impressões
- **CPC:** Custo por clique

### Nível Ad/Criativo
- Todas as acima +
- **Quality Ranking:** ABOVE_AVERAGE / AVERAGE / BELOW_AVERAGE (Meta)
- **Engagement Ranking:** Meta engagement ranking
- **Conversion Ranking:** Meta conversion ranking
- **Video Views:** (se vídeo)
- **Video Avg Time Watched:** (se vídeo)

---

## 🪝 Como Usar os Hooks

### 1. Conectar com Meta
```typescript
const { connectMetaBusiness } = useMetaAuth()
await connectMetaBusiness() // Abre OAuth no Meta
```

### 2. Adicionar Conta Publicitária
```typescript
const { addAdAccount } = useMetaAuth()
await addAdAccount({
  external_id: '1234567890',  // Meta Account ID
  business_name: 'Minha Conta'
})
```

### 3. Sincronizar Campanhas
```typescript
const { syncCampaigns } = useMetaAuth()
await syncCampaigns(accountId)
```

### 4. Sincronizar Insights
```typescript
const { syncDailyInsights } = useMetaAuth()
await syncDailyInsights({
  since: '2025-10-01',
  until: '2025-10-31'
})
```

### 5. Buscar Campanhas
```typescript
const { data: campaigns } = useAdCampaigns(accountId)
// Retorna lista com financeiros por campanha
```

### 6. Buscar Ad Sets
```typescript
const { data: adSets } = useAdSets(campaignId)
// Retorna conjuntos de anúncios com targeting
```

### 7. Buscar Anúncios
```typescript
const { data: ads } = useAds(adSetId)
// Retorna anúncios/criativos com tipo e conteúdo
```

### 8. Buscar Métricas de Criativo
```typescript
const { data: metrics } = useAdMetrics(adId, {
  start: '2025-10-01',
  end: '2025-10-31'
})
// Retorna metrics + quality_ranking, engagement_ranking, conversion_ranking
```

---

## 📈 Endpoints do Meta API Usados

| Endpoint | Dados | Frequência |
|----------|-------|-----------|
| `GET /v24.0/act_{ID}` | Info da conta | Na conexão |
| `GET /v24.0/act_{ID}/campaigns` | Campanhas | Manual via syncCampaigns |
| `GET /v24.0/{CAMPAIGN_ID}/insights` | Métricas campanha | Manual via syncDailyInsights |
| `GET /v24.0/{CAMPAIGN_ID}/adsets` | Ad sets | Manual (novo) |
| `GET /v24.0/{ADSET_ID}/ads` | Anúncios | Manual (novo) |
| `GET /v24.0/{ADSET_ID}/insights` | Métricas ad set | Manual (novo) |
| `GET /v24.0/{AD_ID}/insights` | Métricas ad + MQR | Manual (novo) |

**API Version:** Meta Graph API v24.0
**Rate Limiting:** 429 detection + backoff implementado

---

## 🔐 Segurança & Multi-Tenancy

### Row Level Security (RLS)
- Cada tabela tem RLS habilitada
- Usuários veem só dados de sua organização
- Edge Functions usam `service_role` para inserir/atualizar

### Tokens OAuth
- Armazenados criptografados em `meta_business_connections`
- Expiração verificada em `sync-daily-insights`
- Fallback para variável de ambiente `META_ACCESS_TOKEN`

### Deduplicação de Leads
- `external_lead_id` (ID do Meta) é UNIQUE
- Leads duplicados no Meta não duplicam no CRM

---

## 📂 Estrutura de Arquivos

```
Documentação (esta análise):
├── /docs/META_ADS_ARCHITECTURE.md (completo)
└── /docs/META_ADS_QUICK_REFERENCE.md (rápido)

Código Principal:
src/
├── hooks/
│   ├── useMetaAuth.ts (917 linhas) ← Principal
│   ├── useMetaMetrics.ts ← Parcial
│   └── useAdSetsAndAds.ts ← Novo
├── pages/
│   └── MetaAdsConfig.tsx ← UI

Backend:
supabase/functions/
├── meta-auth/index.ts
├── connect-ad-account/index.ts
├── sync-daily-insights/index.ts
├── sync-ad-sets/index.ts ← Novo
├── sync-ads/index.ts ← Novo
├── sync-adset-insights/index.ts ← Novo
└── sync-ad-insights/index.ts ← Novo

Banco de Dados:
supabase/migrations/
├── 004_meta_ads_tables.sql (conexões + contas)
├── 006_mvp_enhancements.sql (campanhas + insights)
└── 20251203120000_meta_ad_sets_and_ads.sql ← Novo (ad sets + ads)
```

---

## ⚠️ Limitações Conhecidas

1. **Sem Sincronização Automática:** Tudo é manual (pode ser agendado via cron)
2. **Sem Atualização em Tempo Real:** Máximo daily insights
3. **Sem Attribution Modeling:** Apenas campaign_id no lead
4. **Sem Audience Insights:** Targeting armazenado mas não analisado
5. **Sem A/B Test Results:** Não sincroniza com Meta
6. **Sem Budget Forecasting:** Sem previsão de overspend

---

## ✨ Destaques Sprint 2 (Novo)

1. **Ad Sets Table:** Conjunto de anúncios com targeting completo
2. **Ads Table:** Anúncios individuais com tipo criativo e conteúdo
3. **Ad Set Metrics:** Métricas por conjunto de anúncios
4. **Ad Metrics:** Métricas por anúncio com Meta Quality Ranking
5. **Sync Functions:** 4 novas edge functions para sincronizar dados granulares
6. **Hooks:** useAdSetsAndAds para fetch de dados granulares

---

## 🚀 Próximos Passos Recomendados

1. **Implementar Sincronização Automática:** Cron jobs para sync diário
2. **Creative Performance Dashboard:** Mostrar top performers por criativo
3. **Budget Monitoring:** Alertas quando gastado > 80% do budget
4. **Attribution Model:** First-touch vs last-touch attribution
5. **A/B Testing:** Sincronizar resultados de testes do Meta
6. **Audience Performance:** Views para analisar por targeting demográfico

