## Objetivo
- Corrigir ponta a ponta ingestão, armazenamento, agregação e exibição de dados de campanhas, conjuntos e anúncios, alinhados com o Marketing API da Meta e boas práticas de RLS do Supabase.

## Referências (Context7)
- Marketing API Insights (Meta): níveis `act_<account>/insights`, `<campaign_id>/insights`, `<adset_id>/insights`, `<ad_id>/insights`; filtros como `ad.effective_status` para DELETED; métricas como `impressions`, `clicks`, `inline_link_clicks`, `website_ctr`, vídeo, ROAS; suporte a async/report-run e paginação.
- RLS (Supabase): habilitar RLS, políticas com `auth.uid()` não nulo; views `security_invoker=true`; evitar bypass em roles públicas.

## Problemas Identificados
- Mensagem “Sem campanhas no período selecionado” mesmo havendo dados: fonte `CampaignOverviewTable` depende de `useMetaCampaignOverviewMetrics` que falha em RPC e não possui fallback completo para `campaign_daily_insights` respeitando organização.
- Filtros inconsistentes (‘accountId’ sem ‘campaignId’) em alguns fallbacks, e ausência de métricas de engajamento em agregações.
- Ingestão: paginação e pequenos backoffs já adicionados, mas falta suporte de filtros por status (DELETED/ARCHIVED) e cobertura de campos adicionais do Insights.
- RLS: políticas existem, mas componentes/hook devem sempre incluir join de organização para leitura consistente.

## Plano de Correção
### 1) Ingestão e Coleta (Edge Functions)
- Adicionar suporte de filtros e campos do Insights (Meta):
  - Endpoints: `/{campaign_id}/insights`, `/{adset_id}/insights`, `/{ad_id}/insights`, `act_<ACCOUNT_ID>/insights`.
  - Campos mínimos: `impressions`, `clicks`, `inline_link_clicks`, `website_ctr`, `spend`, `reach`, `frequency`, `video_*`, `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`.
  - Filtros: `ad.effective_status IN ['ACTIVE','PAUSED','ARCHIVED','DELETED']` conforme necessidade.
  - Time range: `time_range={since,until}` com paginação.
- Persistência: mapear e upsert em `campaign_daily_insights`, `ad_set_daily_insights`, `ad_daily_insights` mantendo `UNIQUE(entity_id,date)`; armazenar campos novos (`inline_link_clicks`, `website_ctr`) conforme disponibilidade.

### 2) Esquema e RLS
- Validar e, se necessário, ajustar políticas de RLS para leituras com cadeia `ad_accounts → ad_campaigns → ad_sets → ads → *_daily_insights` assegurando escopo por `organization_id`.
- Criar views com `security_invoker=true` para consultas consolidadas (performance em dashboards) sem violar RLS.

### 3) Agregação (RPC + Fallback)
- RPC:
  - `get_ad_set_metrics`: garantir campos derivados (CPL, CPM, CPC, CTR, reach, frequency) e filtros por conta/campanha/período.
  - `get_ad_metrics`: incluir `link_clicks`, `post_engagement`, rankings e filtros por ad_set/ad/campanha/conta/período.
- Fallbacks client-side:
  - Para campanhas: agregar `campaign_daily_insights` respeitando organização quando RPC falhar; calcular `cpc`, `cpm`, `ctr` e preencher `unique_ctr_rate` quando não disponível.
  - Para anúncios: já ampliado para alcance/frequência/rankings; manter filtragem por `accountId` via join em `ad_campaigns`.

### 4) UI/Widgets
- Campanhas: corrigir “Sem campanhas…”
  - No hook de overview de campanhas, adicionar fallback seguro que agrega `campaign_daily_insights` com escopo de org; ordenar e popular tabela.
- Conjuntos: widgets semanais com 4 semanas (já integrados)
  - Cards semanais: investimento/leads/CPL/CTR com WoW.
  - Tendência: linha para investimento/leads/CTR.
  - Tabela comparativa: semana atual vs anterior por ad set.
- Criativos: manter tabela com `link_clicks` e `post_engagement` visíveis.

### 5) Observabilidade
- Logs estruturados nas funções: account/campaign/ad_set/ad, range, contadores de paginação, erros por lote e status code.
- Métrica de frescor (último dia sincronizado por entidade) e de sucesso (% de upserts).

### 6) Testes
- Hooks: `useAdSetWeeklyMetrics`, `useAdMetrics` (fallback), `useMetaCampaignOverviewMetrics` (novo fallback), validando derivados e filtros.
- Integração: simular respostas do Insights e verificar persistência/consulta.

### 7) Performance
- Limites de consulta aumentados com paginação real (cursor/offset) quando >50k.
- Índices: compostos por `(entity_id,date DESC)` e por `(campaign_id,date DESC)` já existentes, validar manutenção.

## Entregáveis
- Funções de ingestão atualizadas com campos e filtros corretos.
- RPCs revisadas e fallbacks robustos (campanhas, conjuntos, anúncios).
- UI corrigida exibindo campanhas no período, widgets semanais para ad sets e métricas ampliadas.
- Testes passando e logs úteis de operação.

## Critérios de Aceite
- Campanhas aparecem quando há qualquer dado no período selecionado.
- Filtros por conta/campanha/conjunto/anúncio funcionam em RPC e fallback.
- Dados de engajamento (link clicks/post engagement) presentes onde aplicável.
- Sincronizações estáveis com paginação e backoff; zero erros bloqueantes em logs.

Confirma que posso aplicar todas as correções e validar com testes e preview?