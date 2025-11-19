## Visão Geral
- Meta Ads: padronizar ingestão via Insights API nos níveis conta/campanha/conjunto/anúncio.
- Supabase: garantir RLS/índices, views `security_invoker=true`, RPCs coerentes e fallbacks robustos no cliente.
- UI: exibir dados confiáveis (sem mensagens incorretas), comparativos semanais e campos de engajamento.

## Metas e SLAs
- Frescor: dados até D-1 com sucesso ≥ 99% por execução.
- Desempenho UI: respostas < 1,5s para 10k linhas por período.
- Consistência: métricas derivadas iguais (±0,5%) entre RPC e fallbacks.

## Modelo de Dados e Contratos
- Entidades: `ad_accounts`, `ad_campaigns`, `ad_sets`, `ads`.
- Insights:
  - `campaign_daily_insights`: `date`, `spend`, `impressions`, `clicks`, `leads_count`, `link_clicks`, `website_ctr`.
  - `ad_set_daily_insights`: + `reach`, `frequency`, `link_clicks`, `post_engagement`.
  - `ad_daily_insights`: + vídeo (`video_views`, `video_avg_time_watched`) e rankings (`quality_ranking`, `engagement_ranking`, `conversion_ranking`).
- Unicidade: `(entity_id,date)` por tabela; índices auxiliares `(campaign_id,date)`.

## Ingestão (Meta Insights)
- Cobertura de níveis:
  - Conta: `act_<AD_ACCOUNT_ID>/insights` para visão geral.
  - Campanha: `/<CAMPAIGN_ID>/insights`.
  - Conjunto: `/<ADSET_ID>/insights`.
  - Anúncio: `/<AD_ID>/insights`.
- Parâmetros:
  - `fields`: `impressions,clicks,inline_link_clicks,website_ctr,spend,reach,frequency,video_*`.
  - `time_range`: `{since,until}`; janela diária.
  - `filtering`: quando necessário, `ad.effective_status IN ['ACTIVE','PAUSED','ARCHIVED','DELETED']`.
- Resiliência:
  - Paginação com cursor; micro-backoff progressivo (800ms * tentativas, máx 3); jitter 120ms entre páginas.
  - Logs por lote: contagem de páginas, erros por status HTTP, tempo total.

## Banco e RLS
- Migrations:
  - `campaign_daily_insights`: adicionar `link_clicks BIGINT DEFAULT 0`, `website_ctr NUMERIC DEFAULT 0`.
  - Comentários/índices: garantir `(campaign_id,date DESC)`; verificar triggers de `updated_at`.
- Views
  - `v_campaign_overview` (security_invoker=true): agrega por `campaign_id` e calcula `cpc`, `cpm`, `ctr` para leitura rápida.
- Políticas RLS
  - Seleção condicionada a `organization_id` via joins; cláusulas `USING (auth.uid() IS NOT NULL AND …)`.

## RPCs e Fallbacks
- `get_ad_set_metrics`: confirmar filtros `p_account_id/p_campaign_id/p_ad_set_id` e derivados.
- `get_ad_metrics`: incluir `link_clicks/post_engagement/reach/frequency` e rankings.
- Fallback campanhas:
  - Primeiro `get_ad_metrics`/`get_ad_set_metrics`; se vazio, usar `v_campaign_overview` com escopo `orgId`.

## UI e Experiência
- Campanhas:
  - Tabela “Visão geral” deve usar fallback agregado ao detectar RPC vazio; remover falso positivo “Sem campanhas…” quando há dados no período.
- Conjuntos:
  - Widgets 4 semanas (cards WoW + tendência + tabela comparativa) já presentes; validar sempre que filtros mudarem.
- Criativos:
  - Exibir `link_clicks` e `post_engagement` com ordenação.

## Observabilidade
- Estrutura de logs:
  - `event=insights_sync`, `level` (account/campaign/adset/ad), `range`, `pages`, `rows`, `upserts`, `duration_ms`, `errors`.
- Frescor:
  - Tabela/coluna com último `date` sincronizado por entidade; endpoint/resumo para UI.

## Paginação/Performance
- Leitura:
  - Evitar limites fixos; usar cursor ou particionar períodos > 50k linhas.
- Índices:
  - Validar compostos por filtros usuais; `EXPLAIN` para consultas de RPC/views.

## Testes
- Unidade:
  - Hooks: `useMetaCampaignOverviewMetrics`, `useAdSetWeeklyMetrics`, `useAdMetrics` fallback — filtros, derivados, mensagens.
- Integração (mock):
  - Respostas do Insights; persistência e consultas em `*_daily_insights` e view.
- Regressão UI:
  - Verificar mensagens e renderizações com dados e sem dados.

## Rollout e Backout
- Funcionalidades por etapas: migrations → ingestão → views → RPC → hooks/UI.
- Backout: migrar sem `DROP`; feature flags para campos novos; logs para reversão.

## Critérios de Aceite
- Campanhas aparecem com dados do período; clicáveis; métricas coerentes (CPC/CPM/CTR).
- Filtros por conta/campanha/conjunto/anúncio funcionam em RPC e fallback.
- Sincronizações estáveis (sem 429 excessivos) e observáveis.

Confirma que posso aplicar este plano refinado, executar ingestão, ajustar views/RPCs, e validar tudo com testes + preview?