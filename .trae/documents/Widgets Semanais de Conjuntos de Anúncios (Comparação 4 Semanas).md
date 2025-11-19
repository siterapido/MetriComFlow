## Objetivo
- Criar widgets focados em Conjuntos de Anúncios (Ad Sets) com comparação das últimas 4 semanas.
- Visualizar tendência semanal e variação WoW (week-over-week) de métricas chave.

## Dados e Hooks
- Fonte: `public.ad_set_daily_insights` (spend, impressions, clicks, leads_count, reach, frequency, link_clicks, post_engagement) — ver sincronização em `supabase/functions/sync-adset-insights/index.ts:214-245`.
- Novo hook: `useAdSetWeeklyMetrics(filters)`
  - Filtros: `accountId?`, `campaignId?`, `adSetIds?`, `dateRange?` (default: 4 semanas até hoje)
  - Query: select de `ad_set_daily_insights` com join em `ad_sets`/`ad_campaigns` para escopo da organização; agrupa client-side por semana (`YYYY-WW`) e por `ad_set_id`.
  - Retorno: por ad set e semana → `spend`, `impressions`, `clicks`, `leads_count`, `cpl`, `cpm`, `cpc`, `ctr`, `link_clicks`, `post_engagement`.
  - Extras: cálculo de variação WoW por métrica (Δ% vs semana anterior).

## Widgets
1. Cards Semanais (Resumo por Ad Set)
- Para o ad set selecionado (ou “todos” agregados):
  - `Investimento (semana atual)` + variação vs semana anterior
  - `Leads (semana atual)` + variação
  - `CPL` + variação (sinal invertido positivo quando cai)
  - `CTR` + variação
- Implementar com componentes de card existentes (`MetricsCardGroup`/`KPICard` padrão de estilo).

2. Gráfico de Tendência 4 Semanas
- Linha/coluna mostrando `spend`, `leads`, `ctr` por semana (4 pontos) para ad set selecionado.
- Biblioteca já usada: `recharts` (presente no projeto) para consistência.

3. Tabela Comparativa por Ad Set
- Lista todos os ad sets filtrados, mostrando métricas da semana atual e a `%` WoW.
- Ordenação por `spend` ou `leads`; destaque visual para maiores ganhos/perdas.

## Integração de Página
- `TrafficMetrics.tsx` ou `MetricsPage.tsx` (ambiente atual com filtros e abas):
  - Adicionar seção “Conjuntos (4 Semanas)” dentro da aba `adsets`.
  - Usar filtros existentes de conta/campanha/ad set (`selectedAccount`, `selectedCampaign`, `selectedAdSet`).
  - Reutilizar `DateRangePicker` opcionalmente; default: últimas 4 semanas.

## Performance e RLS
- Consultas limitadas ao período de 4 semanas; índices existentes (`idx_ad_set_insights_date`, `idx_ad_set_insights_campaign` — ver `supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql:160-162`).
- Filtragem por organização via join (já modelado como em hooks atuais `useAdSetsAndAds.ts:312-347`).

## Testes
- Vitest para `useAdSetWeeklyMetrics`:
  - Cenários: múltiplos ad sets, semanas com/sem dados, variação WoW.
  - Validação de derivados (`cpl`, `cpm`, `cpc`, `ctr`).

## Entregáveis
- Hook `useAdSetWeeklyMetrics` com tipos.
- Componentes: `AdSetWeeklyCards`, `AdSetWeeklyTrendChart`, `AdSetWeeklyComparisonTable`.
- Integração na aba de `adsets`.

## Critérios de Aceite
- Widgets mostram 4 pontos semanais com variação WoW correta.
- Respeitam filtros de conta/campanha/ad set.
- Renderizam em <1s com até milhares de linhas no período.

Confirma que posso implementar agora?