## O que você está vendo
- Seu screenshot corresponde à página `MetricsPage` (relatório consolidado) e não à `TrafficMetrics` (com abas). A `TrafficMetrics` já exibe o botão; a `MetricsPage` ainda não tem o botão de conexão de contas.

## O que vou fazer
- Adicionar o botão "Conectar Meta Ads" e o diálogo `MetaAdsConnectionDialog` na `MetricsPage`.
- Habilitar visibilidade apenas para usuários com permissão de métricas (`owner` ou `traffic_manager`).
- Se não houver conexão ativa, mostrar chamada clara para conectar; caso haja, manter o botão "Contas Meta" disponível para gerenciar.

## Implementação
- Importar: `MetaAdsConnectionDialog`, `useMetaConnectionStatus`, `useHasMetricsAccess`, `Link2`.
- Estado local: `showConnectionDialog` (boolean).
- Lógica de visibilidade:
  - `const { hasActiveConnection } = useMetaConnectionStatus()`
  - `const canManageMeta = useHasMetricsAccess()`
- Header da `MetricsPage`:
  - Adicionar botão:
    - Se `!hasActiveConnection && canManageMeta`: mostrar botão primário "Conectar Meta Ads".
    - Se `hasActiveConnection && canManageMeta`: mostrar botão "Contas Meta" (abre o diálogo de seleção/gestão).
- Renderizar `<MetaAdsConnectionDialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog} />` no final da página.

## Tratamento de erros e feedback
- Reusar os toasts do diálogo para indicar sucesso/erro.
- Manter mensagens atuais da `MetricsPage` para estados sem dados.

## Testes/Verificação
- Manual: abrir `/metricas` (página consolidada) e verificar:
  - Usuário autorizado sem conexão: botão "Conectar Meta Ads" visível e funcional.
  - Usuário autorizado com conexão: botão "Contas Meta" visível.
  - Usuário sem permissão: botões ocultos.
- Automático (opcional): teste de render com mock de `useHasMetricsAccess` e `useMetaConnectionStatus`.

## Observações
- Backend já tem checagem de permissão nas Edge Functions.
- Não altera o fluxo já funcional da `TrafficMetrics`; apenas adiciona a mesma capacidade à `MetricsPage`.

## Próximo passo
- Aplicar as alterações na `MetricsPage` e disponibilizar o botão para você usar imediatamente.