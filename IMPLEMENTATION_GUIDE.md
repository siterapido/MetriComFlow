# Guia de Implementação - Metricom Flow MVP

Este guia detalha toda a implementação realizada para criar um sistema completo de CRM com integração Meta Ads.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura Implementada](#estrutura-implementada)
3. [Passo a Passo de Instalação](#passo-a-passo-de-instalação)
4. [Funcionalidades Implementadas](#funcionalidades-implementadas)
5. [Arquitetura do Banco de Dados](#arquitetura-do-banco-de-dados)
6. [Como Usar](#como-usar)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema foi completamente implementado com as seguintes capacidades:

- ✅ **Dashboard Integrado**: KPIs de negócio + Meta Ads
- ✅ **CRM Funcional**: Kanban com 6 estágios do funil de vendas
- ✅ **Metas CRUD**: Gerenciamento completo de metas de clientes
- ✅ **Página de Métricas**: Análise detalhada de campanhas Meta Ads
- ✅ **Integração Meta Ads**: Rastreamento de leads por campanha
- ✅ **Views de Negócio**: KPIs automáticos calculados no banco

---

## 🏗️ Estrutura Implementada

### Novos Arquivos Criados

#### Migrations
- `supabase/migrations/006_mvp_enhancements.sql` - Migration completa com:
  - Novos status de leads
  - Campos para Meta Ads
  - Tabela `campaign_daily_insights`
  - Views `business_kpis` e `campaign_financials`
  - Triggers automáticos

#### Hooks
- `src/hooks/useMetaMetrics.ts` - Queries para Meta Ads
  - `useAdAccounts()` - Contas conectadas
  - `useAdCampaigns()` - Campanhas
  - `useCampaignInsights()` - Insights diários
  - `useBusinessKPIs()` - KPIs consolidados
  - `useCampaignFinancials()` - Financeiros por campanha

#### Componentes
- `src/components/metrics/MetricCard.tsx` - Card de KPI reutilizável
- `src/components/metrics/CampaignTable.tsx` - Tabela de campanhas
- `src/components/metrics/DateRangePicker.tsx` - Seletor de período
- `src/components/goals/NewGoalModal.tsx` - Modal de metas (CRUD)

#### Páginas
- `src/pages/MetricsPage.tsx` - Página de métricas Meta Ads completa

#### Utilitários
- `src/lib/formatters.ts` - Formatação de valores
- `src/lib/metrics.ts` - Cálculos de métricas (CPL, ROAS, etc)

#### Scripts
- `scripts/apply-migration.sh` - Aplicação automática da migration

### Arquivos Modificados

- ✅ `src/App.tsx` - Rota `/metrics` adicionada
- ✅ `src/components/layout/AppSidebar.tsx` - Item "Métricas Meta Ads"
- ✅ `src/pages/Dashboard.tsx` - KPIs de Meta Ads integrados
- ✅ `src/pages/Metas.tsx` - CRUD completo + modal
- ✅ `src/pages/Leads.tsx` - Filtro por origem + novos status
- ✅ `src/components/leads/NewLeadModal.tsx` - Campos source e campaign_id
- ✅ `src/hooks/useDashboard.ts` - Hook `useBusinessKPIs()`
- ✅ `src/hooks/useClientGoals.ts` - Método `useDeleteClientGoal()`
- ✅ `src/hooks/useLeads.ts` - Filtros por source e campaign_id

---

## 🚀 Passo a Passo de Instalação

### 1. Instalar Dependências (se necessário)

```bash
npm install date-fns
npm install react-day-picker
```

### 2. Aplicar Migration no Banco de Dados

**Opção A: Script Automático (Recomendado)**

```bash
./scripts/apply-migration.sh
```

**Opção B: Manual**

```bash
# Aplicar migration
npx supabase db push

# Atualizar tipos TypeScript
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### 3. Verificar Variáveis de Ambiente

Certifique-se de que o arquivo `.env` contém:

```env
# Supabase (Client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:8082

# Meta Ads
VITE_META_REDIRECT_URI=http://localhost:8082/meta-ads-config
```

### 4. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

O sistema estará disponível em: http://localhost:8082

---

## 🎨 Funcionalidades Implementadas

### 1. Dashboard Geral (`/dashboard`)

**KPIs Principais:**
- Faturamento Mensal
- Faturamento Anual
- Oportunidades Ativas

**KPIs Meta Ads:**
- Investimento Meta Ads (mês atual)
- Leads Gerados via Meta Ads
- CPL (Custo por Lead)
- ROAS (Return on Ad Spend)

**Gráficos:**
- Evolução de Faturamento (New Up, Clientes, Oportunidades)
- Distribuição por categoria

### 2. Página de Métricas (`/metrics`)

**KPIs:**
- Investimento Total
- Leads Gerados
- CPL
- ROAS
- Clientes Fechados
- Faturamento Realizado
- Taxa de Conversão

**Gráficos:**
- Tendências Diárias (Investimento vs Leads)
- Performance por Campanha
- Distribuição do Investimento

**Tabela Detalhada:**
- Todas as campanhas com métricas completas
- Filtro por período
- Ordenação por investimento

### 3. CRM - Leads (`/leads`)

**Funil Completo:**
1. Novo Lead
2. Qualificação
3. Proposta
4. Negociação
5. Fechado - Ganho
6. Fechado - Perdido

**Funcionalidades:**
- ✅ Drag & Drop entre estágios
- ✅ Filtro por origem (Manual / Meta Ads)
- ✅ Busca por título
- ✅ Badge identificando leads do Meta Ads
- ✅ Histórico de movimentações
- ✅ Criação de leads com origem e campanha

**Campos do Lead:**
- Título, Descrição
- Origem (Manual / Meta Ads)
- Campanha (se Meta Ads)
- Status, Responsável
- Valor, Data de Entrega
- Labels, Checklist, Comentários

### 4. Metas dos Clientes (`/metas`)

**CRUD Completo:**
- ✅ Criar nova meta
- ✅ Editar meta existente
- ✅ Excluir meta
- ✅ Listagem com status visual

**Campos:**
- Nome da Empresa
- Meta (R$)
- Valor Atingido (R$)
- Período (Início / Fim)
- Status (Excelente / Em dia / Atrasado / Crítico)

**Visualizações:**
- Cards com progresso visual
- Gráfico de evolução mensal
- Pizza de metas atingidas

### 5. Configuração Meta Ads (`/meta-ads-config`)

- Conexão com Meta Business
- Listagem de contas conectadas
- Sincronização de campanhas

---

## 🗄️ Arquitetura do Banco de Dados

### Tabelas Principais

#### `leads`
```sql
- id (UUID)
- title (TEXT)
- description (TEXT)
- status (TEXT) -- novo_lead, qualificacao, proposta, negociacao, fechado_ganho, fechado_perdido
- value (DECIMAL)
- source (TEXT) -- manual, meta_ads
- campaign_id (UUID) -- FK para ad_campaigns
- external_lead_id (TEXT) -- ID do Meta (deduplicação)
- ad_id, adset_id (TEXT)
- closed_won_at, closed_lost_at (TIMESTAMPTZ)
- lost_reason (TEXT)
```

#### `campaign_daily_insights`
```sql
- id (UUID)
- campaign_id (UUID) -- FK para ad_campaigns
- date (DATE)
- spend (DECIMAL)
- impressions (BIGINT)
- clicks (BIGINT)
- leads_count (BIGINT)
```

### Views Automáticas

#### `business_kpis`
Retorna KPIs consolidados do mês atual:
- `investimento_total` - Total gasto em Meta Ads
- `leads_gerados` - Leads via Meta Ads
- `clientes_fechados` - Vendas ganhas
- `faturamento_realizado` - Receita de vendas ganhas
- `faturamento_previsto` - Pipeline em negociação
- `leads_ativos` - Leads não fechados
- `cpl` - Custo por Lead
- `roas` - Return on Ad Spend
- `taxa_conversao` - % de conversão

#### `campaign_financials`
Métricas detalhadas por campanha:
- `campaign_id`, `campaign_name`
- `investimento`, `impressions`, `clicks`
- `leads_gerados`, `vendas_fechadas`
- `faturamento`, `pipeline_value`
- `cpl`, `roas`, `ctr`, `taxa_conversao`

### Triggers

**`update_lead_closed_dates`**
- Atualiza automaticamente `closed_won_at` quando status → `fechado_ganho`
- Atualiza automaticamente `closed_lost_at` quando status → `fechado_perdido`

---

## 💡 Como Usar

### Criando um Lead Manual

1. Acesse `/leads`
2. Clique em "Novo Lead"
3. Preencha os campos:
   - Título e Descrição
   - Origem: **Manual**
   - Status: Novo Lead
   - Valor, Responsável, etc
4. Salvar

### Criando um Lead de Meta Ads

1. Acesse `/leads`
2. Clique em "Novo Lead"
3. Preencha os campos:
   - Título e Descrição
   - Origem: **Meta Ads**
   - Campanha: Selecione a campanha
   - Status, Valor, etc
4. Salvar

O lead aparecerá com um badge azul "Meta Ads" 🔵

### Visualizando Métricas de Campanhas

1. Acesse `/metrics`
2. Use o DateRangePicker para selecionar período
3. Veja:
   - KPIs consolidados
   - Gráficos de tendências
   - Tabela detalhada de campanhas

### Gerenciando Metas

1. Acesse `/metas`
2. Clique em "Nova Meta"
3. Preencha:
   - Nome da Empresa
   - Meta (valor em R$)
   - Período (início e fim)
4. Acompanhe progresso em tempo real
5. Use os ícones ✏️ e 🗑️ para editar/excluir

---

## 🔧 Troubleshooting

### Erro: "relation 'business_kpis' does not exist"

**Solução:** A migration não foi aplicada.
```bash
./scripts/apply-migration.sh
```

### Erro: "Cannot read property 'source' of undefined"

**Solução:** Leads antigos não têm o campo `source`. Execute:
```sql
UPDATE leads SET source = 'manual' WHERE source IS NULL;
```

### Campanhas não aparecem no select

**Verificações:**
1. Meta Ads está conectado? (`/meta-ads-config`)
2. Há campanhas criadas no Meta?
3. A sincronização rodou? (Edge Function `sync-daily-insights`)

### KPIs zerados

**Verificações:**
1. Há `campaign_daily_insights` inseridos?
```sql
SELECT COUNT(*) FROM campaign_daily_insights;
```
2. Há leads com `source = 'meta_ads'`?
```sql
SELECT COUNT(*) FROM leads WHERE source = 'meta_ads';
```

### Views não atualizam

**Solução:** As views são calculadas em tempo real. Se não atualizam:
1. Verifique se a view existe:
```sql
SELECT * FROM pg_views WHERE viewname = 'business_kpis';
```
2. Recrie a view:
```bash
npx supabase db reset
npx supabase db push
```

---

## 📊 Métricas Calculadas

### CPL (Custo por Lead)
```
CPL = Investimento Total / Número de Leads Gerados
```
**Ideal:** < R$ 50

### ROAS (Return on Ad Spend)
```
ROAS = Faturamento Realizado / Investimento Total
```
**Ideal:** ≥ 3x (retorno de 3x o investimento)

### CTR (Click Through Rate)
```
CTR = (Clicks / Impressões) × 100
```
**Ideal:** ≥ 1%

### Taxa de Conversão
```
Taxa = (Vendas Fechadas / Leads Gerados) × 100
```
**Ideal:** ≥ 2%

---

## 🎉 Conclusão

Você agora tem um CRM completo com:
- ✅ Funil de vendas de 6 estágios
- ✅ Integração Meta Ads com rastreamento
- ✅ Página de métricas com análise detalhada
- ✅ Dashboard com KPIs de negócio
- ✅ Gerenciamento de metas
- ✅ Views automáticas para relatórios

**Próximos passos sugeridos:**
1. Conectar conta Meta Business em `/meta-ads-config`
2. Configurar webhook para receber leads automaticamente
3. Adicionar mais campanhas e testar o fluxo completo
4. Customizar os status do funil conforme seu negócio
5. Adicionar mais campos personalizados se necessário

---

📧 **Dúvidas?** Consulte a documentação completa em [CLAUDE.md](CLAUDE.md)
