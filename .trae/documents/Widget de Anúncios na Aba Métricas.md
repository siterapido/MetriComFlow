## Objetivo
- Adicionar um widget "Desempenho dos Anúncios" na aba/página de Métricas para visualizar métricas por anúncio (spend, impressões, cliques, leads, CTR, CPC, CPL, link clicks, post engagement).

## Local de Integração
- Página atual da rota `"/metricas"`: `src/pages/MetricsPageModern.tsx`.
- Inserir o widget como um novo `Card` abaixo dos blocos de KPIs e dos gráficos/tabelas existentes, mantendo o grid responsivo.

## Dados e Hooks
- Usar `useAdMetrics({ accountId, campaignId, adSetId?, dateRange }, { enabled })` com fallback em `ad_daily_insights` quando RPC não disponível.
- Alternativamente, para renderização pronta de tabela, reutilizar `AdPerformanceTableV2` que consome `useGetMetrics({ level: 'ad', ad_account_ids, campaign_ids, ad_set_ids, since, until })`.
- Filtros conectados aos existentes na página: `dateRange`, `accountId`, `campaignId` (valores `'all'` → `undefined`).
- Gating via conexão Meta: `enabled` a partir de `useMetaConnectionStatus`.

## UI/UX do Widget
- Contêiner: `Card` (shadcn/ui) com `CardHeader` (título "Desempenho dos Anúncios"), `CardDescription` (explicação breve) e `CardContent`.
- Conteúdo: tabela com colunas principais: `Anúncio`, `Status`, `Gasto`, `Impressões`, `Cliques`, `Leads`, `CTR`, `CPC`, `CPL`, `Cliques no Link`, `Engaj. com a Publicação`.
- Recursos de tabela: busca por texto, filtro de `status` (`all` | `ACTIVE` | `PAUSED` | `ARCHIVED`), ordenação por métrica, paginação (`10/25/50`).
- Estados: `Skeleton` durante carregamento; empty state com mensagem `text-muted-foreground` e sugestão de ajustar filtros.
- Responsividade: grid e tabela fluida; colunas numéricas com `text-right`; ocultar colunas menos críticas em `sm`.
- Formatação: helpers existentes (`formatCurrency`, `formatNumber`, `formatPercentage`).

## Integração com Página
- Em `src/pages/MetricsPageModern.tsx`, receber filtros da página (já usados por outros widgets) e repassá-los ao novo componente.
- Layout: inserir dentro do grid existente, por exemplo em uma seção `lg:grid-cols-2`, ao lado de tabela de campanhas ou abaixo dos gráficos.
- Reutilizar padrões de naming/props existentes (componentes “burros”; derivação/seleção de filtros na página).

## Testes e Validação
- Testes de renderização com `vitest` e `@testing-library/react`:
  - Carregamento (`Skeleton` visível) quando `isLoading`.
  - Renderização de linhas com dados e formatação correta.
  - Empty state quando sem dados.
  - Mudança de ordenação/paginação atualiza exibição.
- Verificação manual: abrir `"/metricas"` e conferir integração visual, filtros e responsividade.

## Entregáveis
- Novo bloco `Card` com tabela de anúncios (ou inclusão de `AdPerformanceTableV2`) em `MetricsPageModern`.
- Conexão de filtros e gating por conexão Meta.
- Testes unitários cobrindo estados principais.

## Referências no Código
- Rota/aba Métricas: `src/App.tsx` (roteamento para `MetricsPageModern`).
- Página: `src/pages/MetricsPageModern.tsx`.
- Hooks: `src/hooks/useAdMetrics.ts`, `src/hooks/useGetMetrics.ts` (level `'ad'`).
- Tabela pronta: `src/components/metrics/AdPerformanceTableV2.tsx`.
- Helpers e padrões: `src/components/ui/*`, `src/lib/metaMetrics.ts`.

Confirma a implementação para prosseguir com o código?