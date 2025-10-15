# Cálculos e Métricas de Negócio

Métricas essenciais do MVP e como calculá-las.

- Investimento Total (R$)
  - Fonte: SUM(spend) em `campaign_daily_insights` no período.

- Leads Gerados
  - Fonte principal: COUNT(leads) com `source='meta_ads'` no período (via webhook/polling)
  - Alternativa: `SUM(campaign_daily_insights.leads_count)` quando apenas Insights estiverem disponíveis
    - `leads_count` é derivado de `actions` filtrando `action_type='lead'` na API de Insights

- CPL (Custo por Lead)
  - Fórmula: Investimento / Leads Gerados
  - Proteção: se `Leads Gerados = 0`, CPL = null/"—".

- Clientes Fechados
  - Fonte: COUNT(leads) com `status='venda_ganha'` no período.

- Faturamento Realizado (R$)
  - Fonte: SUM(`leads.value`) com `status='venda_ganha'` no período.

- Faturamento Previsto (R$)
  - Fonte: SUM(`leads.value`) com `status IN ('em_negociacao','proposta_enviada')` no período.

- ROAS
  - Fórmula: Faturamento Realizado / Investimento
  - Proteção: se Investimento = 0, ROAS = null/"—".

## SQL de referência
- Ver `docs/mvp/base-de-dados/migracoes-propostas.sql` para views `business_kpis` e `campaign_financials` com CPL/ROAS.
 - Se optar por usar apenas Insights para `Leads Gerados`, adapte a agregação para somar `campaign_daily_insights.leads_count` no período.

## Consumo no Frontend
- Criar hooks:
  - `useBusinessKPIs`: SELECT em `business_kpis`.
  - `useCampaignFinancials({ from, to })`: SELECT em `campaign_financials` com filtro de data (pode-se criar RPC para períodos).
- Formatação:
  - Valores monetários: R$ com locale pt-BR.
  - ROAS/CPL: números com 2 casas decimais; tratar null como "—".
 - Observação: manter consistência de períodos entre Insights (campo `date`) e eventos de Lead (`created_at`).