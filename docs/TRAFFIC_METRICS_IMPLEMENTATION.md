# 📊 Implementação de Métricas Detalhadas para Gestor de Tráfego

## Visão Geral

Implementação completa de análise granular de campanhas Meta Ads por **Campanha → Conjunto de Anúncios → Criativo**, focada nas necessidades de gestores de tráfego.

## 🎯 Funcionalidades Implementadas

### 1. **Estrutura de Banco de Dados**

#### Novas Tabelas Criadas:

**`ad_sets` (Conjuntos de Anúncios)**
- ID interno + external_id do Meta
- Configurações: optimization_goal, bid_strategy, billing_event
- Segmentação (targeting) completo em JSONB
- Budgets (diário e lifetime)
- Status e datas de início/fim

**`ads` (Criativos/Anúncios)**
- ID interno + external_id do Meta
- Tipo de criativo: IMAGE, VIDEO, CAROUSEL, COLLECTION
- Conteúdo extraído: título, body, CTA, links
- URLs de mídia: image_url, video_url, thumbnail_url
- creative_data completo em JSONB
- Status e timestamps

**`ad_set_daily_insights` (Métricas por Conjunto)**
- Métricas diárias agregadas por conjunto
- spend, impressions, clicks, leads_count
- Custos: CPL, CPM, CPC
- Alcance e frequência
- Actions completos em JSONB

**`ad_daily_insights` (Métricas por Criativo)**
- Métricas diárias por anúncio individual
- Todas as métricas básicas (spend, impressions, etc.)
- **Meta Quality Rankings**: quality_ranking, engagement_ranking, conversion_ranking
- Métricas de vídeo: video_views, avg_time_watched
- Link clicks e post engagement

#### Migration:
📁 `supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql`

---

### 2. **Edge Functions**

#### `sync-ad-sets`
📁 `supabase/functions/sync-ad-sets/index.ts`

**Funcionalidade:**
- Busca conjuntos de anúncios da Meta Graph API v21.0
- Sincroniza configurações de targeting e budgets
- Upsert inteligente por external_id (evita duplicatas)
- Suporta filtros por campaign_ids ou ad_account_ids

**Campos Capturados:**
- optimization_goal, bid_strategy, billing_event
- targeting (JSON completo)
- daily_budget, lifetime_budget
- start_time, end_time, status

**Uso:**
```typescript
POST /functions/v1/sync-ad-sets
{
  "campaign_ids": ["uuid1", "uuid2"], // opcional
  "ad_account_ids": ["uuid3"],        // opcional
  "since": "2025-01-01"                // opcional
}
```

#### `sync-ads`
📁 `supabase/functions/sync-ads/index.ts`

**Funcionalidade:**
- Busca anúncios/criativos individuais da Meta API
- Extrai dados do creative automaticamente
- Parseia object_story_spec para imagem/vídeo
- Identifica tipo de criativo (IMAGE, VIDEO, etc.)

**Campos Capturados:**
- creative_id, creative_type
- title, body, call_to_action
- link_url, image_url, video_url, thumbnail_url
- creative_data (JSON completo do Meta)
- created_time, updated_time, status

**Uso:**
```typescript
POST /functions/v1/sync-ads
{
  "ad_set_ids": ["uuid1", "uuid2"],      // opcional
  "campaign_ids": ["uuid3"],              // opcional
  "ad_account_ids": ["uuid4"],            // opcional
  "since": "2025-01-01"                   // opcional
}
```

---

### 3. **Hooks React**

#### `useAdSetsAndAds.ts`
📁 `src/hooks/useAdSetsAndAds.ts`

**Hooks Disponíveis:**

```typescript
// Ad Sets
useAdSets(campaignId?, options?)
  → Busca conjuntos de uma campanha

useSyncAdSets()
  → Mutation para sincronizar ad sets do Meta

useAdSetMetrics(adSetId?, dateRange?, options?)
  → Métricas agregadas por conjunto (CPL, CTR, etc.)

// Ads (Criativos)
useAds(filters?, options?)
  → Busca criativos (filtros: ad_set_id, campaign_id)

useSyncAds()
  → Mutation para sincronizar criativos do Meta

useAdMetrics(filters?, options?)
  → Métricas agregadas por criativo
  → Inclui quality_ranking, engagement_ranking

useCreativePerformance(dateRange?, options?)
  → Ranking de criativos:
    • topByLeads (top 10 por leads)
    • topByCTR (top 10 por taxa de clique)
    • topByROI (top 10 por menor CPL)
    • lowPerformers (criativos com gasto > R$50 e zero leads)
```

**Tipos TypeScript:**
- `AdSet` - Estrutura de conjunto de anúncios
- `Ad` - Estrutura de criativo
- `AdSetMetrics` - Métricas consolidadas por conjunto
- `AdMetrics` - Métricas consolidadas por criativo

---

### 4. **Componentes de UI**

#### `CreativeCard.tsx`
📁 `src/components/metrics/CreativeCard.tsx`

**Componentes:**

**`<CreativeCard />`**
- Card visual de criativo individual
- Preview de imagem/vídeo
- Badge de tipo de criativo (IMAGE, VIDEO, etc.)
- Badge de Meta Quality Ranking (ABOVE_AVERAGE, etc.)
- Métricas principais: Leads, CPL
- Métricas secundárias (opcional): Gasto, CTR, CPC, CPM, Impressões
- Rankings de engagement e conversion

**`<CreativeGrid />`**
- Grid responsivo de criativos (1-4 colunas)
- Suporta onClick para seleção
- Empty state quando sem dados

**Props:**
```typescript
interface CreativeCardProps {
  ad: AdMetrics;
  showFullMetrics?: boolean;  // Mostra métricas completas
  onClick?: () => void;        // Callback de clique
}
```

---

### 5. **Página de Métricas**

#### `TrafficMetrics.tsx`
📁 `src/pages/TrafficMetrics.tsx`

**Nova página focada em gestor de tráfego com:**

#### **Filtros Avançados:**
- Date Range Picker (com presets)
- Seletor de Conta de Anúncios
- Seletor de Campanha
- Seletor de Conjunto (contextual)
- Botão "Sincronizar" para buscar dados do Meta

#### **KPIs Principais (Topo):**
- Mensagem (Leads)
- Custo Lead (CPL) - com destaque
- Cliques
- Unique CTR
- CPC
- Custo Mil Imp. (CPM)

#### **Tabs de Análise:**

**1. Overview** (Tab padrão)
- **Top 5 Criativos por Leads**: Ranking visual com métricas
- **Top 5 Criativos por CTR**: Melhores taxas de clique
- **Alerta de Low Performers**: Criativos com gasto > R$50 e zero leads

**2. Campanhas**
- Placeholder para tabela de campanhas (já existe em MetaAdsConfig)

**3. Conjuntos de Anúncios**
- Grid de cards com métricas por conjunto
- Filtro adicional por conjunto específico
- Métricas: Leads, CPL, Gasto, CTR, CPC
- Empty state com botão de sincronização

**4. Criativos**
- Grid visual de criativos usando `<CreativeGrid />`
- Preview de imagens/vídeos
- Métricas completas por criativo
- Quality Rankings do Meta
- Empty state com botão de sincronização

#### **Roteamento:**
- **`/metricas`** → `TrafficMetrics` (nova página focada em tráfego)
- **`/meta-ads-config`** → `MetaAdsConfig` (configurações e visão geral)
- **`/metrics`** → Redirect para `/metricas`

---

## 🚀 Como Usar

### 1. **Aplicar Migration no Banco**

⚠️ **IMPORTANTE**: Rode manualmente no Supabase SQL Editor

```bash
# Copie o conteúdo do arquivo:
cat supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql

# Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
# Cole e execute o SQL
```

### 2. **Deploy das Edge Functions**

```bash
# Deploy sync-ad-sets
npx supabase functions deploy sync-ad-sets

# Deploy sync-ads
npx supabase functions deploy sync-ads
```

### 3. **Sincronizar Dados do Meta**

Na página **`/metricas`**:

1. Clique no botão **"Sincronizar"** no topo
2. Aguarde a sincronização de conjuntos e criativos
3. Navegue pelas tabs para visualizar métricas

Ou via API diretamente:

```bash
# Sincronizar ad sets
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-ad-sets" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ad_account_ids": ["uuid"]}'

# Sincronizar ads/criativos
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-ads" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ad_account_ids": ["uuid"]}'
```

---

## 📈 Métricas Capturadas

### Por Conjunto de Anúncios:
- ✅ Gasto (spend)
- ✅ Impressões
- ✅ Cliques
- ✅ Leads
- ✅ CPL (Custo por Lead)
- ✅ CPM (Custo por Mil Impressões)
- ✅ CPC (Custo por Clique)
- ✅ CTR (Taxa de Clique)
- ✅ Alcance (reach)
- ✅ Frequência (frequency)

### Por Criativo:
- ✅ Todas as métricas acima
- ✅ **Quality Ranking** (Meta)
- ✅ **Engagement Ranking** (Meta)
- ✅ **Conversion Ranking** (Meta)
- ✅ Video Views
- ✅ Video Avg Time Watched
- ✅ Link Clicks
- ✅ Post Engagement

---

## 🔐 Segurança (RLS)

Todas as tabelas possuem **Row Level Security (RLS)** habilitado:

- ✅ Filtro automático por `organization_id`
- ✅ Usuários só veem dados de suas organizações
- ✅ Service role pode gerenciar todos os dados
- ✅ Políticas para SELECT, INSERT, UPDATE

---

## 📊 Arquitetura de Dados

```
ad_accounts (Contas)
    ↓
ad_campaigns (Campanhas)
    ↓
ad_sets (Conjuntos)
    ↓  ↓
ads (Criativos) + ad_set_daily_insights (Métricas)
    ↓
ad_daily_insights (Métricas por Criativo)
```

---

## 🎨 Design System

A página segue o **Design System** do projeto:

- ✅ Gradientes: `from-primary to-secondary`
- ✅ Cards elevados: `from-card to-accent/20`
- ✅ Hover effects: `hover-lift`
- ✅ Badges de status com cores oficiais
- ✅ Typography standards (text-3xl, font-bold, etc.)
- ✅ Spacing standards (gap-6, space-y-6, p-6)
- ✅ Ícones com gradientes de fundo
- ✅ Responsive grid (1-4 colunas)

---

## 📝 Próximas Melhorias (Sugestões)

1. **Sincronização Automática de Métricas**
   - Criar Edge Function `sync-adset-insights` para buscar métricas da API
   - Criar Edge Function `sync-ad-insights` para métricas de criativos
   - Agendar cron job diário

2. **Análise Comparativa**
   - Comparar criativos head-to-head
   - A/B testing automático
   - Recomendações de otimização

3. **Alertas Inteligentes**
   - Notificar quando CPL ultrapassa meta
   - Alertar sobre criativos com baixo quality_ranking
   - Sugerir pausar criativos sem performance

4. **Exportação**
   - Exportar relatórios em PDF/Excel
   - Agendamento de relatórios recorrentes

---

## 🐛 Troubleshooting

### Criativos não aparecem?
1. Verifique se a migration foi aplicada
2. Rode a sincronização manualmente (`/metricas` → Sincronizar)
3. Verifique logs das Edge Functions:
   ```bash
   npx supabase functions logs sync-ad-sets
   npx supabase functions logs sync-ads
   ```

### Métricas zeradas?
- As métricas vêm de tabelas separadas (`ad_set_daily_insights`, `ad_daily_insights`)
- Será necessário implementar sincronização de métricas (próxima etapa)

### Erro de permissão?
- Verifique RLS policies
- Confirme que usuário pertence a uma organização ativa
- Verifique `organization_id` nas contas de anúncios

---

## 📚 Referências

- [Meta Marketing API - Ad Sets](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign)
- [Meta Marketing API - Ads](https://developers.facebook.com/docs/marketing-api/reference/adgroup)
- [Meta Marketing API - Insights](https://developers.facebook.com/docs/marketing-api/insights)
- [Design System](./DESIGN_SYSTEM.md)
- [Meta Ads Setup](./META_ADS_SETUP.md)

---

**Data de Implementação**: 03/12/2025
**Versão**: 1.0.0
**Autor**: Claude Code + Marcos Alexandre
