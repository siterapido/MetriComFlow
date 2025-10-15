# Modelo de Dados Proposto (MVP)

Objetivo: suportar cálculo de Investimento, Leads Gerados, CPL, Clientes Fechados, Faturamento Realizado/Previsto e ROAS, com rastreio por campanha de Meta Ads.

## Alterações em tabelas existentes

### `leads`
- Atualizar enum de `status` para refletir funil comercial:
  - `novo_lead` | `em_negociacao` | `proposta_enviada` | `venda_ganha` | `venda_perdida`
- Campos novos:
  - `source` TEXT CHECK (source IN ('meta_ads','manual')) DEFAULT 'manual'
  - `campaign_id` UUID NULL REFERENCES `ad_campaigns`(id) ON DELETE SET NULL
  - `closed_won_at` TIMESTAMP WITH TIME ZONE NULL
  - `closed_lost_at` TIMESTAMP WITH TIME ZONE NULL
  - `lost_reason` TEXT NULL
  - `external_lead_id` TEXT NULL (ID do lead no Meta – para deduplicação)
  - `ad_id` TEXT NULL (ID do anúncio no Meta)
  - `adset_id` TEXT NULL (ID do conjunto de anúncios no Meta)
  - Observação: o campo existente `value` passa a ser formalmente "Valor do Contrato (R$)".

### `revenue_records`
- Opcional: alocar categoria `clientes` para faturamento realizado e `oportunidades` para previsto, porém o MVP deve calcular faturamento direto de `leads.value` por status.

## Novas tabelas

### `ad_accounts`
- `id` UUID PK
- `provider` TEXT CHECK (provider IN ('meta')) DEFAULT 'meta'
- `external_id` TEXT NOT NULL (ex: act_123456789)
- `business_name` TEXT
- `connected_by` UUID REFERENCES `profiles`(id)
- `created_at`, `updated_at`
- RLS: Admin/Manager leitura; criação somente por usuários autenticados via fluxo de conexão.

### `ad_campaigns`
- `id` UUID PK
- `ad_account_id` UUID REFERENCES `ad_accounts`(id)
- `external_id` TEXT NOT NULL (ex: 1234567890)
- `name` TEXT NOT NULL
- `objective` TEXT NULL
- `status` TEXT NULL
- `start_time` TIMESTAMP WITH TIME ZONE NULL
- `stop_time` TIMESTAMP WITH TIME ZONE NULL
- `created_at`, `updated_at`

### `campaign_daily_insights`
- `id` UUID PK
- `campaign_id` UUID REFERENCES `ad_campaigns`(id)
- `date` DATE NOT NULL
- `spend` DECIMAL(15,2) DEFAULT 0
- `impressions` BIGINT DEFAULT 0
- `clicks` BIGINT DEFAULT 0
 - `leads_count` BIGINT DEFAULT 0 (derivado de `actions` com `action_type='lead'` na API de Insights)
- `created_at`
- Índices: (`campaign_id`,`date`)

## Views e materializações

### `business_kpis`
- KPIs por período (mês atual):
  - `investimento_total`: SUM(spend) de `campaign_daily_insights` (mês atual)
  - `leads_gerados`: COUNT(*) de `leads` com `source='meta_ads'` (mês atual)
  - `cpl`: investimento_total / leads_gerados (proteger divisão por zero)
  - `clientes_fechados`: COUNT(*) de `leads` com `status='venda_ganha'` (mês atual)
  - `faturamento_realizado`: SUM(value) onde `status='venda_ganha'` (mês atual)
  - `faturamento_previsto`: SUM(value) onde `status IN ('em_negociacao','proposta_enviada')` (mês atual)
  - `roas`: faturamento_realizado / investimento_total

### `campaign_financials`
- Agregação por campanha:
  - `campaign_id`, `campaign_name`
  - `investimento` (SUM(spend))
  - `leads_gerados` (COUNT `leads.campaign_id`) – quando houver `leads` registrados via webhook/polling
    - Alternativa: usar `SUM(campaign_daily_insights.leads_count)` quando apenas Insights estiverem disponíveis
  - `vendas_fechadas` (COUNT `leads.status='venda_ganha'`)
  - `faturamento` (SUM `leads.value` com `status='venda_ganha'`)
  - `roas` (faturamento / investimento)

## Considerações de RLS
- `leads`: leitura para Admin/Manager de todos; para `user` apenas dos próprios (created_by) ou atribuídos (assignee_id vinculado ao seu `team_members.profile_id`).
- Views financeiras (`business_kpis`, `campaign_financials`): acesso restrito a `admin` por padrão. Versões limitadas podem ser expostas a `manager`.
 - Deduplicação de leads Meta: manter índice único opcional em `external_lead_id` (permitir NULLs) e lógica de upsert na ingestão.