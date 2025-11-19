## Diagnóstico
- Local de exibição do erro: `src/components/metrics/AdSetPerformanceTable.tsx:39-41`.
- Origem da falha: `useGetMetrics` chama a função `get-metrics` e, ao receber `error`, a UI mostra a mensagem ( `src/hooks/useGetMetrics.ts:34-44`, `49-53`).
- Causa raiz confirmada: a função Edge `get-metrics` rejeita múltiplas contas por chamada (`supabase/functions/get-metrics/index.ts:47-50`). A página `MetricsPage` envia todas as contas ativas quando o filtro está em “Todas as contas” (`src/pages/MetricsPage.tsx:189-193`, `435-439`), disparando `400` e, portanto, o erro na UI.
- Conexão com a fonte dos ad sets: sincronização via Meta Graph API em `sync-ad-sets` com token resolvido de `meta_business_connections` ou `META_ACCESS_TOKEN` (`supabase/functions/sync-ad-sets/index.ts:97-118`, `120-171`, `187-218`). Métricas são lidas do banco via `get-metrics` (RPC `get_ad_set_metrics` ou fallback em `ad_set_daily_insights`; `supabase/functions/get-metrics/index.ts:60-161`).
- Credenciais/permissões: `get-metrics` usa `SUPABASE_SERVICE_ROLE_KEY` para consultas (`supabase/functions/get-metrics/index.ts:18-19`, `36-38`). Tabelas e RLS configuradas em `supabase/migrations/20251203120000_meta_ad_sets_and_ads.sql:128-181` e `185-247`.

## Ajustes Propostos
- Backend (preferência): aceitar `ad_account_ids` múltiplos em `get-metrics` e agregar no servidor.
  - Para `level='adSet'`: coletar `campaign_ids` de todas as contas e agregar `ad_set_daily_insights` por `ad_set_id` com filtro em `campaign_id` IN (todas), mantendo mapeamento de nomes de `ad_sets`.
  - Para `level='ad'`: idem usando `ad_daily_insights` e mapeando nomes em `ads`.
  - Manter RPC como primeira tentativa; se o RPC não suportar múltiplas contas, cair para o fallback agregador multi-conta.
  - Retornar `success: true` e lista consolidada, sem alterar o contrato (`GetMetricsResponse`).
- Frontend (robustez e UX):
  - Validar antes de consultar: se várias contas e o backend ainda não suportar, executar chamadas por conta e mesclar no cliente para evitar erro de UI.
  - Melhorar mensagens: diferenciar “sem dados” de “parâmetros inválidos” ou “múltiplas contas não suportadas”.
  - Ajustar cache do React Query: `staleTime` razoável (ex.: 60s), `retry: 2`, `keepPreviousData: true`, chave de query estável.
- Validações de dados recebidos:
  - Normalizar numéricos para `number` e garantir não-negativos.
  - Garantir datas `since/until` válidas, `since ≤ until` e janelas dentro do limite de histórico desejado.

## Verificações
- Integridade pós-correção:
  - SQL: contagem total por `ad_set_id` e somatórios por período em `ad_set_daily_insights` e `ad_daily_insights` batendo com a agregação devolvida.
  - Amostragem de registros para checar nomes, IDs e relacionamento com campanhas/contas.
- Validação de métricas:
  - Comparar resultados do novo agregador com o RPC single-account em cenários controlados.
  - Checar campos calculados (CTR, CPL, CPM) quando pertinentes.
- Desempenho:
  - Testar com 5–20 contas e milhares de linhas por período; avaliar tempo de resposta e paginação/limites.

## Garantias
- Testes automatizados:
  - Unit em `useGetMetrics` para cenários: 1 conta, N contas, erro de parâmetros, sem dados.
  - Integração do agregador no Edge Function com fixtures de banco (mocks ou ambiente de teste).
  - Testes de UI para `AdSetPerformanceTable` cobrindo estados loading/empty/error.
- Monitoramento:
  - Logs estruturados em `get-metrics` (parâmetros, tamanho dos resultados, tempos de consulta, códigos de erro).
  - Painel de cron e logs já disponíveis (`src/hooks/useCronJobs.ts`, `src/components/meta-ads/CronJobsMonitor.tsx`), expandir para métricas.
- Documentação:
  - Atualizar guias existentes (`META_ADS_ARCHITECTURE.md`, `TRAFFIC_METRICS_IMPLEMENTATION.md`) descrevendo suporte multi-conta e fluxo de agregação.

## Entregáveis
- Relatório detalhado: causa raiz, mudanças no backend/frontend, resultados de testes, métricas de desempenho.
- Sistema operando sem interrupções no carregamento (multi-conta suportado, UI sem erro).
- Métricas consistentes e confiáveis para decisão (validadas contra amostras e RPC single-account).

Confirma a execução deste plano? Após confirmação, implemento as alterações no Edge Function e no frontend, adiciono testes e verifico com dados reais de múltiplas contas.