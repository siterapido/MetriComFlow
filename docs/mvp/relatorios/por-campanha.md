# Relatórios de Faturamento por Campanha

Objetivo: tabela/gráfico por campanha com:
- Campanha
- Investimento (R$)
- Leads Gerados
- Vendas Fechadas
- Faturamento (R$)
- ROAS

Fonte de Dados
- View `campaign_financials`.
 - Requer pipeline ativa de:
   - Coleta diária de Insights (`campaign_daily_insights`)
   - Ingestão de Leads via webhook/polling para vincular `leads.campaign_id`

Filtros
- Período (data inicial/final): criar RPC para filtrar `campaign_daily_insights` por `date` e `leads` por `created_at`/`closed_won_at`.
 - Consistência de período: alinhar timezone e granularidade (dia) entre `date` dos Insights e timestamps dos Leads.

Frontend
- Página `MetricsPage.tsx` já lista campanhas (`CampaignTable`) com filtros de conta/campanha/período.
- Pendências: adicionar export CSV, ordenação configurável (ROAS/Faturamento) e badge de data do último sync.
- Gráfico de barras e pizza implementados (`MetaAdsChart`, `CampaignTable` + `ResponsiveContainer`).

Considerações
- Divisão por zero (ROAS): exibir "—" quando investimento = 0.
- Leads sem campanha: agrupar em "Sem Campanha" (opcional).
 - Quando não houver webhook ativo, `Leads Gerados` pode ser estimado por `SUM(campaign_daily_insights.leads_count)`.
