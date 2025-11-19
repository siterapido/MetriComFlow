## Objetivo
- Ampliar ingestão e agregação com campos avançados do Marketing API (Meta), fortalecer RLS e observabilidade, e garantir paginação/cursor para grandes volumes.

## Ingestão (Edge Functions)
- Adicionar campos do Insights por nível (conta/campanha/conjunto/anúncio):
  - `inline_link_clicks`, `website_ctr`, `video_time_watched_actions`, `video_play_retention_*`, `website_purchase_roas`, `reach`, `frequency`.
  - Filtrar por `ad.effective_status IN ['ACTIVE','PAUSED','ARCHIVED','DELETED']` quando útil.
  - Usar `time_range={since,until}` com paginação; manter micro-backoff para 429/5xx.
- Arquivos a atualizar:
  - `supabase/functions/sync-adset-insights/index.ts` e `sync-ad-insights/index.ts` para mapear novos campos.
  - Opcional: `supabase/functions/sync-daily-insights/index.ts` para nível campanha.

## Esquema (Migrations + RLS)
- `campaign_daily_insights`: adicionar colunas `link_clicks BIGINT DEFAULT 0`, `website_ctr NUMERIC DEFAULT 0`.
- Validar `ad_set_daily_insights` e `ad_daily_insights` já possuem `link_clicks`/`post_engagement`/vídeo; garantir tipos e índices.
- Manter RLS com cadeia `ad_accounts → ad_campaigns → ad_sets → ads → *_daily_insights`.
- Criar view com `security_invoker=true`:
  - `public.v_campaign_overview` agregando `campaign_daily_insights` por campanha com `cpc/cpm/ctr` calculados; respeitar RLS.

## RPC e Fallbacks
- Atualizar `get_ad_set_metrics` e `get_ad_metrics` para ler campos novos quando disponíveis.
- Fallback campanhas:
  - Consolidar agregação de `campaign_daily_insights` usando a view `v_campaign_overview` (com `security_invoker=true`) para performance.
- Hooks:
  - `useMetaCampaignOverviewMetrics`: preferir RPC; se vazio/falha, consultar view agregada; manter escopo por `orgId`.

## Observabilidade
- Logs estruturados nas funções:
  - Contas/campanhas/conjuntos/anúncios processados, range, paginações, contadores por lote, status HTTP, tempo de execução.
- Métricas de frescor:
  - Persistir último `date` sincronizado por entidade; expor em um endpoint/resumo.

## Paginação/Performance
- Paginar leituras >50k com cursor ou `since/until` em janelas menores; evitar `limit` fixo.
- Confirmar índices `(entity_id,date DESC)` e `(campaign_id,date DESC)`; adicionar índices compostos para filtros usuais.

## Testes
- Unit: hooks (`useMetaCampaignOverviewMetrics`, `useAdSetWeeklyMetrics`, `useAdMetrics` fallback) cobrindo filtros e derivados.
- Integração: simular respostas do Insights, validar persistência e queries de leitura.

## Entregáveis
- Edge Functions atualizadas com novos campos e filtros.
- Migration alterando `campaign_daily_insights` e criação de view com `security_invoker=true`.
- RPCs e hooks alinhados; UI sem mensagens incorretas.
- Logs e métricas de frescor disponíveis.

## Critérios de Aceite
- Campanhas mostram dados do período com `inline_link_clicks/website_ctr` quando disponíveis.
- Filtros por conta/campanha funcionam em RPC e view fallback.
- Sincronizações estáveis e observáveis com paginação; sem quedas por rate limit em execuções normais.

Posso aplicar essas mudanças agora e validar com testes e preview?