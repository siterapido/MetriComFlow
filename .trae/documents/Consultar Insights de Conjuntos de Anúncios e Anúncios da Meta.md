## Objetivo
- Garantir que a aba "Métricas" tenha dados confiáveis (ad accounts/campanhas/conjuntos/anúncios) e se mantenha atualizada continuamente.

## Fontes e Escopo
- Fonte: API de Marketing da Meta (Graph API) via borda `insights` em nível de conta, campanha, ad set e anúncio.
- Abrangência: `ad_sets`, `ads`, e `*_daily_insights` (campanha/ad set/ad) com intervalos configuráveis.

## Infra atual (onde conectar)
- Página: `src/pages/MetricsPageModern.tsx` (rota `'/metricas'`).
- Hooks principais: `useUnifiedMetrics`, `useUnifiedDailyBreakdown`, `useAdAccounts`, `useAdCampaigns`, `useAdSets`, `useAds`, `useAdSetMetrics`, `useAdMetrics`.
- Funções de sincronização já existentes: `sync-ad-sets`, `sync-ads`, `sync-ad-insights`, `sync-adset-insights` (invocadas por hooks `useSync*`).
- Realtime disponível em `TrafficMetrics.tsx` para `ad_daily_insights` e `ad_set_daily_insights` (podemos reaproveitar).

## Plano de Ingestão e Atualização
1. Credenciais e Permissões
- Validar `ads_read` e escopo da conta de anúncios; usar token de sistema (Business) para estabilidade.
- Guardar secrets em ambiente seguro; rotacionar e monitorar expiração.

2. Descoberta de entidades
- Diária: listar `ad_accounts` e `ad_campaigns` da organização.
- Sincronizar `ad_sets` e `ads` (idempotente, com upsert por `id`).

3. Coleta de insights
- Campanha/ad set/ad: jobs diários e intradiários (ex.: a cada 2h) para `*_daily_insights`.
- Intervalos: `date_preset=last_7d` intradiário; `time_range` para backfill.
- Conversões: incluir `actions` e `action_attribution_windows` quando necessário.

4. Tolerância a falhas e limites
- Paginar com `limit` e seguir `paging`; para grandes volumes usar jobs assíncronos de insights.
- Requisições em lotes por janela e por entidade; retries exponenciais com jitter.
- Rate limit: orquestrar com fila simples (ex.: backoff por conta) e registrar erros por job.

5. Armazenamento e índices (Supabase)
- Tabelas: `ad_accounts`, `ad_campaigns`, `ad_sets`, `ads`, `campaign_daily_insights`, `ad_set_daily_insights`, `ad_daily_insights`.
- Chaves/índices: `unique (entity_id, date)` por tabela de insights; índices por `account_id`, `campaign_id`, `adset_id`, `ad_id`, `date`.

6. Orquestração e Scheduler
- Agendar invocações das funções `sync-*` (cron Supabase ou orquestrador externo) com janelas definidas.
- Separar “intradiário” (curto) e “diário” (completo + backfill 37 meses conforme necessário).

7. Realtime e Cache
- Canal realtime para `*_daily_insights` na aba `MetricsPageModern` (espelhar o padrão de `TrafficMetrics.tsx`).
- Cache (client) por `accountId/campaignId/dateRange`; invalidar sob eventos realtime e após sync.

8. UI/UX robusta
- Status de conexão (`useMetaConnectionStatus`), último sync, botão “Sincronizar agora” com feedback.
- Filtros consistentes (conta, campanha, intervalo) e fallback para último snapshot quando API indisponível.
- Remover dependência de mocks (`useMetaMetricsV2/lib/metaMetrics`) onde houver; unificar em dados reais.

9. Observabilidade
- Tabela `sync_runs` (ou equivalente) para logs de execução, contagem de objetos, tempo, erros.
- Alertas simples (ex.: e-mail/webhook) quando uma janela intradiária falhar consecutivamente.

10. Backfill controlado
- Job dedicado para preencher histórico de `campaign/adset/ad daily insights` por blocos (ex.: 30 dias por rodada) até 37 meses.

## Critérios de Aceite
- Aba `'/metricas'` exibe dados para conta/campanha selecionadas sem erros.
- “Última atualização” visível e menor que 2h no intradiário.
- Real-time reflete novas linhas em `*_daily_insights` sem recarregar a página.
- Logs de `sync_runs` sem falhas não tratadas; rate limit respeitado.

## Próximas Ações
- Confirmar credenciais da Meta e contas alvo.
- Ativar agendamentos de `sync-ad-sets`, `sync-ads`, `sync-adset-insights`, `sync-ad-insights` (intradiário e diário).
- Conectar `MetricsPageModern` aos canais realtime e exibir estado de sync.
- Eliminar mocks V2 onde necessário e validar consultas de `useUnifiedMetrics`.

## Referências
- Insights oficial: https://developers.facebook.com/docs/marketing-api/insights/