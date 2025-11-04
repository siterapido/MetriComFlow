# 📊 Guia Completo: Página de Métricas de Tráfego

## 📍 Localização e Acesso

### URL
```
http://localhost:8082/metricas
```

### Navegação
A página "Métricas" está disponível no **sidebar** sob "Navegação":

```
MetriCom Flow
├─ Dashboard Geral
├─ Leads
├─ Formulários
├─ Métricas ← Clique aqui para acessar
├─ Gestão de Equipe
├─ Planos e Assinatura
└─ Meu Perfil
```

---

## 🎯 O Que É a Página de Métricas?

A página **Métricas de Tráfego** (`/metricas`) oferece análise granular de campanhas, conjuntos de anúncios e criativos do Meta Ads.

### Estrutura da Página

```
┌─────────────────────────────────────────────────┐
│ Métricas de Tráfego                             │
│ Análise granular por campanha, conjunto e criativo
└─────────────────────────────────────────────────┘
       ↓
┌─ Filtros ───────────────────────────────────────┐
│ [Data Range] [Conta] [Campanha] [Sincronizar] │
└─────────────────────────────────────────────────┘
       ↓
┌─ KPIs Principais ────────────────────────────────┐
│ 💰 Investimento | 📊 Impressões | 🎯 Leads   │
│ 💵 CPL          | 📈 ROAS       | 📉 CTR      │
└─────────────────────────────────────────────────┘
       ↓
┌─ 4 Tabs de Análise ──────────────────────────────┐
│ [Overview] [Campanhas] [Conjuntos] [Criativos] │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Como Usar

### 1️⃣ Conectar Conta Meta Ads

Antes de acessar métricas, você precisa conectar uma conta Meta:

```
1. Acesse: /meta-ads-config
2. Clique: "Conectar Meta Business"
3. Autorize o acesso ao seu Business Manager
4. Selecione a conta publicitária
5. Adicione uma conta ad para sincronizar campanhas
```

### 2️⃣ Sincronizar Dados (Manual)

Existem **3 formas** de sincronizar dados:

#### **Opção A: Via Interface (Recomendado)**

```
1. Acesse: /metricas
2. Clique: "Sincronizar" (botão azul no canto superior direito)
3. Aguarde as 4 sincronizações:
   ✅ Campanhas
   ✅ Conjuntos de Anúncios
   ✅ Criativos
   ✅ Métricas
```

#### **Opção B: Via Script (Terminal)**

```bash
# Sincronizar últimos 7 dias
./scripts/sync-meta-ads-metrics.sh

# Syncronizar período específico
./scripts/sync-meta-ads-metrics.sh --since 2025-01-01 --until 2025-01-31

# Simulação (não sincroniza, apenas valida)
./scripts/sync-meta-ads-metrics.sh --dry-run
```

#### **Opção C: Via Curl (Manual)**

```bash
# Sincronizar Ad Sets
curl -X POST "https://seu-projeto.supabase.co/functions/v1/sync-ad-sets" \
  -H "Authorization: Bearer sua-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{}'

# Sincronizar Ads (Criativos)
curl -X POST "https://seu-projeto.supabase.co/functions/v1/sync-ads" \
  -H "Authorization: Bearer sua-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{}'

# Sincronizar Métricas de Conjuntos
curl -X POST "https://seu-projeto.supabase.co/functions/v1/sync-adset-insights" \
  -H "Authorization: Bearer sua-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"since":"2025-01-01","until":"2025-12-31","maxDaysPerChunk":30}'

# Sincronizar Métricas de Criativos
curl -X POST "https://seu-projeto.supabase.co/functions/v1/sync-ad-insights" \
  -H "Authorization: Bearer sua-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"since":"2025-01-01","until":"2025-12-31","maxDaysPerChunk":30}'
```

### 3️⃣ Visualizar Métricas

Após sincronizar, acesse `/metricas` para ver:

#### **Tab: Overview**
- ⭐ Top 5 criativos por leads
- 📈 Top 5 criativos por CTR
- ⚠️ Alertas de baixa performance

#### **Tab: Campanhas**
- 📊 Tabela detalhada de todas as campanhas
- 💰 Investimento, leads, CPL, ROAS
- 📉 Métricas derivadas (CTR, CPC, taxa de conversão)

#### **Tab: Conjuntos**
- 📦 Grid de conjuntos de anúncios
- 🎯 Métricas por conjunto (leads, CPL, gasto)
- 🔄 Filtro por conjunto específico

#### **Tab: Criativos**
- 🎨 Grid visual de criativos com previews
- 📸 Tipo de criativo (imagem/vídeo)
- ⭐ Quality Ranking (Acima da Média, Média, Abaixo da Média)
- 📊 Métricas detalhadas por criativo

---

## 🔧 Sincronização Automática (Futuro)

**Status Atual:** Sincronização manual via interface ou script

### Como Implementar Automação (Roadmap)

Para adicionar **cron jobs automáticos** que sincronizam a cada X horas, será necessário:

1. **Configurar pg_cron no Supabase** (pode variar por plano)
2. **Criar funções PL/pgSQL** para invocar Edge Functions
3. **Agendar execução** via `cron.schedule()`

**Exemplo de cron job (a implementar futuramente):**
```sql
-- Sincronizar Ad Sets a cada 6 horas
SELECT cron.schedule(
  'sync-ad-sets-every-6h',
  '0 */6 * * *',
  'SELECT public.sync_ad_sets_cron();'
);

-- Sincronizar Ads a cada 6 horas
SELECT cron.schedule(
  'sync-ads-every-6h',
  '3 */6 * * *',
  'SELECT public.sync_ads_cron();'
);

-- Sincronizar Insights a cada 3 horas
SELECT cron.schedule(
  'sync-adset-insights-every-3h',
  '1 1-22/3 * * *',
  'SELECT public.sync_ad_set_insights_cron();'
);

SELECT cron.schedule(
  'sync-ad-insights-every-3h',
  '2 2-23/3 * * *',
  'SELECT public.sync_ad_insights_cron();'
);
```

---

## 📋 Filtros Disponíveis

### Data Range
```
[Data Inicial] [Data Final]

Exemplos:
- Últimos 7 dias: auto-preenchido
- Mês atual: 2025-11-01 a 2025-11-30
- Trimestre: 2025-01-01 a 2025-03-31
- Ano inteiro: 2025-01-01 a 2025-12-31
```

### Conta Publicitária
```
[Todas as contas] ← Padrão
ou
[Selecione conta específica]
```

### Campanha
```
[Todas as campanhas] ← Padrão
ou
[Selecione campanha específica]
```

*Nota: Filtro de campanha ativo quando conta está selecionada*

---

## 📊 Métricas Disponíveis

### Métricas de Entrada (Meta API)
| Métrica | Descrição |
|---------|-----------|
| **spend** | Gasto total em R$ |
| **impressions** | Número de impressões |
| **clicks** | Número de cliques |
| **leads_count** | Leads gerados (extraído de actions) |
| **quality_ranking** | Ranking de qualidade (ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE) |

### Métricas Derivadas (Calculadas)
| Métrica | Fórmula | Unidade |
|---------|---------|--------|
| **CTR** | (clicks / impressions) × 100 | % |
| **CPC** | spend / clicks | R$ |
| **CPL** | spend / leads_count | R$ |
| **CPM** | (spend / impressions) × 1000 | R$ |
| **Taxa de Conversão** | (conversões / leads) × 100 | % |
| **ROAS** | revenue / spend | × (múltiplo) |

---

## 🎨 Componentes Principais

### Página
```typescript
// src/pages/TrafficMetrics.tsx
- TrafficMetrics: Componente principal
  - 4 tabs: overview, campaigns, adsets, creatives
  - Filtros: date, account, campaign
  - Botão de sincronização
  - KPI cards
```

### Hooks
```typescript
// src/hooks/useAdSetsAndAds.ts
- useAdSets()           // Fetch ad sets para campanha
- useAds()              // Fetch ads/criativos
- useAdSetMetrics()     // Métricas agregadas por ad set
- useAdMetrics()        // Métricas agregadas por ad
- useSyncAdSets()       // Sincronizar ad sets
- useSyncAds()          // Sincronizar ads
- useSyncAdSetInsights()   // Sincronizar insights de ad sets
- useSyncAdInsights()   // Sincronizar insights de ads
- useCreativePerformance() // Ranking de criativos
```

### Componentes
```typescript
// src/components/metrics/
- CreativeCard.tsx       // Card individual de criativo
- CreativeGrid.tsx       // Grid de criativos
- CampaignPerformanceTable.tsx // Tabela de campanhas
```

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas Utilizadas

#### Core Ads
```sql
ad_accounts                    -- Contas publicitárias
├─ id, external_id
├─ business_name
├─ is_active
└─ organization_id

ad_campaigns                   -- Campanhas
├─ id, external_id
├─ name, status, objective
├─ ad_account_id
└─ organization_id

ad_sets                        -- Conjuntos de anúncios
├─ id, external_id
├─ name, status
├─ campaign_id
├─ optimization_goal, billing_event
├─ daily_budget, lifetime_budget
├─ targeting (JSONB)
└─ organization_id

ads                            -- Criativos/Anúncios
├─ id, external_id
├─ name, status
├─ ad_set_id, campaign_id
├─ creative_type
├─ title, body, call_to_action
├─ link_url, image_url, video_url
└─ organization_id
```

#### Insights (Métricas Diárias)
```sql
campaign_daily_insights        -- Métricas por campanha/dia
├─ campaign_id, date
├─ spend, impressions, clicks, leads_count
└─ Unique: (campaign_id, date)

ad_set_daily_insights          -- Métricas por ad set/dia
├─ ad_set_id, date
├─ spend, impressions, clicks, leads_count
├─ reach, frequency
└─ Unique: (ad_set_id, date)

ad_daily_insights              -- Métricas por criativo/dia
├─ ad_id, date
├─ spend, impressions, clicks, leads_count
├─ quality_ranking
├─ engagement_ranking, conversion_ranking
└─ Unique: (ad_id, date)
```

---

## 🔐 Permissões e RLS

### Quem Pode Acessar?

- ✅ Donos da organização
- ✅ Administradores
- ✅ Gerentes
- ❌ Membros (sem permissão padrão)

Todos os dados são **filtrados por organization_id** automaticamente via RLS.

### Como Adicionar Permissão Para Membro

```typescript
// Editar useUserPermissions() ou chamar RPC para dar acesso
UPDATE organization_memberships
SET permissions = jsonb_set(permissions, '{hasMetricsAccess}', 'true')
WHERE profile_id = 'user_uuid'
  AND organization_id = 'org_uuid';
```

---

## 🐛 Troubleshooting

### "Nenhum conjunto encontrado"
**Causa:** Ad Sets não foram sincronizados ainda
**Solução:**
```bash
# 1. Clique "Sincronizar" na interface
# ou
# 2. Execute script
./scripts/sync-meta-ads-metrics.sh
```

### "Nenhum criativo encontrado"
**Causa:** Ads não foram sincronizados
**Solução:** Mesma que acima

### "Sem dados de métrica"
**Causa:** Insights não foram sincronizados para período selecionado
**Solução:**
```bash
# Sincronizar com período maior
./scripts/sync-meta-ads-metrics.sh --since 2025-01-01 --until 2025-12-31
```

### "Erro ao sincronizar"
**Debug:**
1. Verifique conectividade Meta Business
2. Verifique token Meta (em `/meta-ads-config`)
3. Verifique logs: `npx supabase functions logs sync-ad-sets`

---

## 📱 Responsividade

Página totalmente responsiva:
- ✅ Desktop (1920px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

---

## 🎓 Exemplos de Uso

### Caso 1: Analisar Performance de Criativo Específico

```
1. Acesse: /metricas
2. Tab: Criativos
3. Encontre criativo na grid (por nome ou ordenação)
4. Veja: CPL, leads, impressões, CTR, qualidade
5. Identifique: Se quality_ranking = BELOW_AVERAGE, pode pausar
```

### Caso 2: Comparar 2 Campanhas em Período

```
1. Acesse: /metricas
2. Selecione: Data range (ex: novembro 2025)
3. Tab: Campanhas
4. Visualize tabela comparativa
5. Identifique: Campanha com melhor ROAS
```

### Caso 3: Encontrar Criativos com Zero Leads

```
1. Acesse: /metricas
2. Tab: Overview
3. Verifique: Seção "Low Performers"
4. Alerta: Criativos com >R$50 gasto e 0 leads
5. Ação: Pausar ou otimizar criativo
```

---

## 🔄 Fluxo de Sincronização

```
Usuário conecta conta
        ↓
  campaignsync
   (automático)
        ↓
Usuário clica "Sincronizar"
        ↓
┌─────────────────────────────┐
│ sync-ad-sets (1-2 min)      │ → Busca todos os ad sets das campanhas
├─────────────────────────────┤
│ sync-ads (2-3 min)          │ → Busca todos os ads/criativos dos ad sets
├─────────────────────────────┤
│ sync-adset-insights (5-10min)│ → Busca métricas diárias por ad set
├─────────────────────────────┤
│ sync-ad-insights (5-10min)  │ → Busca métricas diárias por criativo
└─────────────────────────────┘
        ↓
   Dados disponíveis em /metricas
```

---

## 📚 Documentação Relacionada

- [META_ADS_SETUP.md](META_ADS_SETUP.md) - Configuração inicial Meta Ads
- [DATABASE.md](../DATABASE.md) - Schema completo do banco
- [CLAUDE.md](../CLAUDE.md) - Visão geral do projeto

---

## 💬 Suporte

Para problemas:
1. Verifique logs: `npx supabase functions logs sync-*`
2. Teste via script: `./scripts/sync-meta-ads-metrics.sh --dry-run`
3. Verifique pertenças no `/meta-ads-config`
