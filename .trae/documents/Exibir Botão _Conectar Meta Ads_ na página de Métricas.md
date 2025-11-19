## Objetivo
- Garantir que o botão "Conectar Meta Ads" apareça de forma clara e acessível para usuários autorizados na página `/metricas`, iniciando o fluxo OAuth corretamente.

## Onde o botão deve aparecer
- Estado desconectado: exibir um botão primário no banner inicial da página.
  - Referência: `src/pages/TrafficMetrics.tsx:223–230` já possui o botão; manter visível para usuários com acesso a métricas.
- Cabeçalho com filtros (sempre visível para autorizados): exibir botão "Contas Meta" que abre o diálogo de conexão.
  - Referência: `src/pages/TrafficMetrics.tsx:268–276` já possui o botão; garantir visibilidade via permissões.

## Regras de Visibilidade
- Exibir apenas para usuários com permissão de métricas (`owner` ou `traffic_manager`).
  - Hook: `useHasMetricsAccess()` já disponível (`src/hooks/useUserPermissions.ts`).
  - Aplicação na página: manter condicionais existentes em `TrafficMetrics.tsx` para mostrar os botões quando `useHasMetricsAccess()` for verdadeiro.

## Fluxo ao clicar
- Abrir `MetaAdsConnectionDialog` e iniciar OAuth:
  - Handler chama `useMetaAuth.connectMetaBusiness()` → obtém `auth_url` da Edge Function.
  - Redireciona para Facebook OAuth e volta para `/metricas` após sucesso.
- Edge Function responsável:
  - `supabase/functions/meta-auth/index.ts`: ações `get_auth_url`, `exchange_code`, `list_available_accounts`.
  - `redirect_uri` normalizado para `/metricas`, já implementado.

## Tratamento de Erros e Feedback
- Usar toasts em falhas de autenticação ou listagem de contas (já implementados em `MetaAdsConnectionDialog`).
- Exibir alerta no estado desconectado com instruções claras.

## Testes e Verificação
- Manual: abrir `/metricas` → verificar botão visível e funcional; completar OAuth e listar contas.
- Automático: manter testes do hook e componentes relacionados; opcionalmente adicionar um teste de renderização do botão sob permissões (mock de `useHasMetricsAccess`).

## Entregáveis
- Garantir visibilidade dos botões nas duas posições citadas, com regras de permissão ativas.
- Fluxo OAuth funcionando end-to-end na página `/metricas` com feedback apropriado.

## Observações
- Dependências: variáveis `META_APP_ID` e `META_APP_SECRET` configuradas no ambiente/Vault.
- Segurança: checagens de permissão já presentes nas Edge Functions (`owner`/`traffic_manager`).

## Próximo Passo
- Aplicar a configuração para exibir o botão e validar o fluxo de conexão no ambiente atual.