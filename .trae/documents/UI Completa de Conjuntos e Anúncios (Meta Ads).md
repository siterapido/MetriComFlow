## Objetivos
- Exibir informações completas e organizadas de conjuntos de anúncios e anúncios individuais.
- Interface responsiva com filtros, ordenação e paginação.
- Dados corretos, sem erros de formatação, com atualização em tempo real.

## Fontes de Dados
- Conjuntos: `ad_sets` (nome, status, budgets, targeting). Referência: extração em `supabase/functions/connect-ad-account/index.ts:284–295`.
- Anúncios: `ads` (nome, status, creative_data com título, imagem, texto, link). Referência: upsert em `supabase/functions/connect-ad-account/index.ts:323–334`.
- Métricas: `ad_set_daily_insights` e `ad_daily_insights` (spend, impressions, clicks, leads...). Referências:
  - Ad sets: `supabase/migrations/20240729220000_create_get_ad_set_metrics_function.sql:49–73`.
  - Ads: `supabase/migrations/20251215020010_update_get_ad_metrics_function.sql:61–86`.

## Arquitetura de UI
- Página/Abas alvo: `src/pages/TrafficMetrics.tsx` (abas "Conjuntos" e "Criativos").
- Componentes:
  - Conjuntos:
    - Reutilizar/estender `AdSetPerformanceTable` para mostrar lista e métricas de cada conjunto (nome, ID, status, budgets). Referência: `src/components/metrics/AdSetPerformanceTable.tsx`.
    - Novo painel de detalhes "AdSetDetail" com lista de anúncios pertencentes ao conjunto, com campos do criativo.
  - Anúncios:
    - Estender `AdPerformanceTableV2` para acrescentar colunas de criativo (título, imagem, texto, URL destino) e status. Referência atual: `src/components/metrics/AdPerformanceTableV2.tsx:71–100`.
- Responsividade: usar grid flexível (classes Tailwind já presentes), `line-clamp` para textos longos e imagens com proporção fixa (thumb/preview).

## Funcionalidades
- Filtros:
  - Conjunto: `Select` por campanha e por conjunto (já existe). Acrescentar busca textual por nome/ID e filtro por status.
  - Anúncio: filtros por tipo de criativo, status e busca textual.
- Ordenação:
  - Cabeçalhos clicáveis nas tabelas (por data, status, desempenho: gasto, leads, CTR). Guardar estado local e aplicar ordenação antes do render.
- Paginação:
  - Controlar `page`, `pageSize` no estado. Consultas com `limit` e `offset` (ou `range`) para `ads` e `ad_sets`.
  - Exibir controles (próxima/anterior, total) e manter seleção ativa.

## Tempo Real
- Assinar mudanças nas tabelas e invalidar caches:
  - `ad_sets`, `ads`, `ad_set_daily_insights`, `ad_daily_insights` via `supabase.channel('realtime-ads-insights')`.
  - Ao receber eventos, invalidar chaves das queries (`['ad-sets']`, `['ads']`, `['ad-set-metrics']`, `['ad-metrics']`). Padrão semelhante ao já usado em `src/hooks/useDashboard.ts`.

## Implementação (arquivos)
- `src/pages/TrafficMetrics.tsx`
  - Abas "Conjuntos" e "Criativos": inserir filtros adicionais (busca, status), ordenação e paginação.
  - Adicionar subscriptions para tempo real (caso não estejam presentes na aba específica).
- `src/components/metrics/AdSetPerformanceTable.tsx`
  - Adicionar colunas: ID, Status, `daily_budget`/`lifetime_budget`. Link para detalhar o conjunto (abre painel lateral ou seção abaixo).
- `src/components/metrics/AdPerformanceTableV2.tsx`
  - Acrescentar colunas visuais do criativo (título, imagem, texto, URL destino) e status. Fallback para conteúdo ausente.
- Novo `src/components/metrics/AdSetDetail.tsx`
  - Mostra cabeçalho do conjunto (nome, ID, status, budgets) e a lista de anúncios do conjunto com campos do criativo e métricas.
- Hooks
  - `src/hooks/useAdSetsAndAds.ts`: incluir filtros (texto/status), ordenação e paginação para `useAdSets` e `useAds` (parâmetros opcionais), mantendo padrões atuais.

## Validação e Formatação
- Fallbacks claros: "—" para textos ausentes, imagem placeholder quando `thumbnail_url`/`image_url` não existir.
- Formatadores existentes: `formatCurrency`, `formatNumber` para métricas (já usados em várias tabelas).
- IDs apresentados em formato curto, com tooltip para visualizar ID completo.

## Testes
- Unitários (Vitest + Testing Library):
  - `AdSetPerformanceTable`: render de colunas novas, ordenação por gasto e status.
  - `AdPerformanceTableV2`: render de campos do criativo e mensagens de ausência.
  - `AdSetDetail`: lista de anúncios por conjunto com métricas e criativo.
- Integração: mock de hooks com paginação e filtros; simular eventos de tempo real e verificar invalidação.

## Entrega/Verificação
- Manual: abrir `/metricas` → abas "Conjuntos"/"Criativos"; conferir filtros, ordenação e paginação; clicar em conjunto para ver detalhes; validar imagens/textos/URLs.
- Tempo real: disparar uma sync (ou alteração) e confirmar atualização imediata.

## Observações
- Sem alteração do modelo de dados: usamos colunas já preenchidas pelos sincronizadores.
- Segurança e permissões preservadas; leitura escopada por organização e papel.

## Próximo Passo
- Aplicar as mudanças, rodar testes e validar a página em dispositivos diferentes (desktop/tablet/mobile).