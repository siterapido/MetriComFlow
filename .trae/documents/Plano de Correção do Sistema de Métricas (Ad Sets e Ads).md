## Objetivos
- Garantir ingestão confiável e idempotente de dados de conjuntos de anúncios (ad sets) e anúncios (ads).
- Corrigir agregações e métricas derivadas (CPL, CPM, CPC, CTR, alcance, frequência, link_clicks, post_engagement).
- Assegurar filtragem por conta/campanha/ad set/ad e escopo de organização com RLS.
- Validar UI e hooks para leitura consistente via RPC com fallback robusto.

## Diagnóstico Atual (Arquitetura)
- Ingestão via Edge Functions com upsert:
  - Ad sets: `supabase/functions/sync-ad-sets/index.ts:206-214`.
  - Ads: `supabase/functions/sync-ads/index.ts:267-275`.
  - Insights por ad set: `supabase/functions/sync-adset-insights/index.ts:240-244`.
  - Insights por ad: `supabase/functions/sync-ad-insights/index.ts:270-274`.
- Agregação RPC:
  - Ad set: `supabase/migrations/20240729220000_create_get_ad_set_metrics_function.sql:2-82`.
  - Ad: `supabase/migrations/20251215020010_update_get_ad_metrics_function.sql:6-98`.
- API unificada: `supabase/functions/get-metrics/index.ts:106-158` (adSet) e `supabase/functions/get-metrics/index.ts:209-275` (ad).
- Hooks/UI:
  - Métricas ad set: `src/hooks/useAdSetsAndAds.ts:268-303`.
  - Métricas ad com fallback: `src/hooks/useAdSetsAndAds.ts:403-522`.
  - Listagem de ads com escopo de organização: `src/hooks/useAdSetsAndAds.ts:312-356`.

## Problemas Prováveis
- Chaves de conflito sem `organization_id` podem permitir colisões multi-tenant em alguns fluxos (vide `connect-ad-account`: uso de `external_id, organization_id`).
- Fallback em `useAdMetrics` não inclui alcance/frequência/rankings; filtragem por `accountId` limitada (comentário em `src/hooks/useAdSetsAndAds.ts:469-471`).
- Índices e limites (`limit 10000`) podem degradar desempenho para contas grandes (`get-metrics`).
- Cálculo de `leads_count` depende de `actions` e pode ser 0 quando o tipo difere (`sync-adset-insights:218-233`, `sync-ad-insights:239-263`).
- Paginação e rate-limit do Meta API já tratadas, mas falta backoff/jitter consistente.

## Correções por Camada
### Ingestão (Edge Functions)
- Padronizar `onConflict` em upserts para multi-tenant:
  - Ad sets/ads: avaliar inclusão de `organization_id` quando disponível (referência: `supabase/functions/connect-ad-account/index.ts:312-356`).
- Garantir extração robusta de `leads_count` dos `actions` com mapa de tipos e validação (já parcialmente implementado em `sync-adset-insights:218-233` e `sync-ad-insights:239-263`).
- Implementar backoff exponencial para erros 429/5xx da Meta e logs estruturados com contadores por lote.
- Validar conversões de budget (cents→unidade) e timezone de `start_time/end_time` (`sync-ad-sets:200-204`).

### Esquema e Índices (Postgres)
- Confirmar unicidades: `ad_set_daily_insights (ad_set_id,date)` e `ad_daily_insights (ad_id,date)`; validar índices compostos para consultas por período/campanha/ad set/ad.
- Auditar FKs e RLS garantindo cadeia `ad_accounts→ad_campaigns→ad_sets→ads` consistente.
- Otimizar índices usados por RPC (comentado em `supabase/migrations/20251215000000_optimize_meta_indexes.sql`).

### RPC e API Unificada
- Ad set: manter agregações e derivados em `get_ad_set_metrics` (arquivo já correto: linhas `49-72`).
- Ad: manter novos campos e filtros (arquivo atualizado: `supabase/migrations/20251215020010_update_get_ad_metrics_function.sql:61-87`).
- `get-metrics`:
  - Ad set: verificar `combinedCampaignIds/in` e limite; paginar quando necessário (`106-118`).
  - Ad: preservar join com `ads` e extrair metadata criativa (`228-271`).

### Hooks e UI
- Completar fallback `useAdMetrics` com alcance/frequência/rankings quando RPC falhar (`src/hooks/useAdSetsAndAds.ts:436-516`).
- Adicionar filtragem por `accountId` no fallback com join em `ad_campaigns/ad_accounts` quando `campaignId` ausente.
- Revisar componentes:
  - `AdSetPerformanceTable` e `AdPerformanceTableV2` para exibir `link_clicks/post_engagement` e ordenação por métrica principal.

## Testes e Validação
- Criar testes de unidade (Vitest) para hooks:
  - `useAdSetMetrics` e `useAdMetrics` com RPC ok/falha e validação dos derivados.
- Testes de integração para Edge Functions em modo dry-run e com mocks do Meta API.
- Verificar UI em `src/pages/TrafficMetrics.tsx:108-145` após sincronização e agregação.

## Observabilidade e Operação
- Logs estruturados e resumos por execução (já parcialmente em `get-metrics`); adicionar métricas de frescor de dados e taxa de sucesso por lote.
- CRON: validar janelas e sobreposições (`sync-*-cron`); evitar duplicações.

## Segurança/RLS
- Confirmar políticas de seleção e upsert por organização nas tabelas core e de insights; reforçar filtros nos hooks (`src/hooks/useAdSetsAndAds.ts:344-347`).

## Entregáveis
- Fluxo de ingestão e agregação estável com métricas corretas e UI atualizada.
- Testes cobrindo cenários com/sem RPC e deduplicação.
- Guia curto de operação (erros, reprocessamento, limites, tokens) e painel de saúde básico.

## Critérios de Aceite
- Métricas em ad sets e ads refletem valores do Meta para período escolhido.
- Filtros por conta/campanha/ad set/ad operam em RPC e fallback.
- Nenhum erro de RLS/tenant; upserts idempotentes.
- Páginas de métricas carregam em <2s para 10k linhas; sem timeouts.