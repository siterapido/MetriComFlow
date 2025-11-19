## Objetivos
- Exibir todos os anúncios corretamente na aba de métricas
- Atualizar desempenho em tempo real na UI de métricas
- Garantir cálculos de métricas consistentes
- Ativar e proteger o botão de conectar contas (fluxo Meta OAuth)
- Adicionar tratamento de erros e feedback
- Cobrir com testes unitários e de integração

## Correção: Exibição de Anúncios
- Ajustar a chamada do componente `AdPerformanceTableV2` para enviar arrays de IDs:
  - Em `src/pages/TrafficMetrics.tsx:552–557`, substituir props por:
    - `adAccountIds={selectedAccount === 'all' ? (accounts?.map(a => a.id) ?? []) : [selectedAccount]}`
    - `campaignIds={selectedCampaign === 'all' ? undefined : [selectedCampaign]}`
    - `adSetIds={selectedAdSet === 'all' ? undefined : [selectedAdSet]}`
- Manter fallback sem `campaign_ids` para que `get-metrics` agregue automaticamente por campanhas conectadas.
- Verificar `AdPerformanceTableV2` para alinhamento de props (aceita `adAccountIds: string[]`) em `src/components/metrics/AdPerformanceTableV2.tsx:15–27`.

## Tempo Real: Atualização de Métricas
- Adicionar assinaturas de banco e invalidações de cache:
  - Criar um effect em `TrafficMetrics.tsx` que assine `postgres_changes` via `supabase.channel` para:
    - `ad_daily_insights` e `ad_set_daily_insights` (operações `INSERT/UPDATE/DELETE`).
  - Ao receber eventos, chamar `queryClient.invalidateQueries({ queryKey: ['metrics'] })` e chaves relevantes dos hooks (`useAdMetrics`, `useAdSetMetrics`).
- Referências atuais de tempo real: `src/hooks/useDashboard.ts:1–60` já assina KPIs; replicar padrão para métricas por anúncio/conjunto.
- Como fallback, adicionar `refetchInterval: 30000` em `useGetMetrics` para garantir frescor quando não houver eventos.

## Precisão de Métricas
- Confirmar fórmulas nas funções SQL:
  - `get_ad_metrics` com `cpl`, `cpm`, `cpc`, `ctr` em `supabase/migrations/20251215020010_update_get_ad_metrics_function.sql:69–86`.
  - `get_ad_set_metrics` com mesmas fórmulas em `supabase/migrations/20240729220000_create_get_ad_set_metrics_function.sql:55–73`.
- Na UI, continuar exibindo métricas brutas em `AdPerformanceTableV2` e derivadas nas tabelas de campanhas/conjuntos; evitar divisões por zero.

## Botão de Conectar Contas
- Garantir visibilidade apenas para usuários autorizados:
  - Usar `useHasMetricsAccess()` e exibir/ativar o botão apenas quando verdadeiro em `TrafficMetrics.tsx:268–276` e no estado desconectado em `TrafficMetrics.tsx:223–230`.
- Fluxo de conexão:
  - O botão abre `MetaAdsConnectionDialog` que chama `useMetaAuth.connectMetaBusiness()`.
  - Edge Function `meta-auth` valida token e gera `auth_url` em `supabase/functions/meta-auth/index.ts:200–234`.
  - Callback troca `code` por token e lista contas (armazena em `meta_business_connections`).
- Garantir que `Meta OAuth redirect_uri` esteja correto (normalizado em `supabase/functions/meta-auth/index.ts:86–137`).

## Tratamento de Erros e Feedback
- Reforçar mensagens na aba de criativos:
  - Em `AdPerformanceTableV2`, já há mensagens para parâmetros/autorização/permissão em `src/components/metrics/AdPerformanceTableV2.tsx:48–61`.
  - Adicionar mensagem específica quando `adAccountIds.length === 0` sugerindo conectar contas.
- Backend `get-metrics` já registra e valida parâmetros:
  - Log de erro de parâmetros em `supabase/functions/get-metrics/index.ts:45`.
  - Retorno `400` com `{ error: 'Parâmetros obrigatórios ausentes.' }` em `supabase/functions/get-metrics/index.ts:46–47`.
- Garantir toasts consistentes nas ações de conexão/sincronização (infra já presente em `src/components/metrics/MetaAdsConnectionDialog.tsx` e `src/components/metrics/SyncStatusIndicator.tsx`).
- Segurança: adicionar checagem explícita de permissão antes de ações com Service Role (ex.: validar `has_metrics_access(auth.uid())` via RPC) nas Edge Functions sensíveis (`meta-auth`, `connect-ad-account`).

## Testes
- Unitário (Vitest + Testing Library):
  - `useGetMetrics`: casos de sucesso e erro (parâmetros ausentes, erro 400) — base existente em `src/hooks/__tests__/useGetMetrics.test.tsx`.
  - `AdPerformanceTableV2`: renderiza linhas quando recebe dados; mostra feedback quando não há dados; mostra erro quando ausência de parâmetros.
  - `TrafficMetrics`: com `hasActiveConnection=true` e `selectedAccount='all'`, garante que `adAccountIds` inclui todas as contas e renderiza resultados na aba “Criativos”.
- Integração (scripts):
  - Invocar `get-metrics` com combinações de filtros e validar agregação.
  - Simular fluxo `meta-auth` (`get_auth_url` e `exchange_code`) com token mock.
- Execução:
  - Frontend: `npm run test`.
  - Scripts: `npx tsx scripts/test-meta-auth.ts`, `npx tsx scripts/test-ad-accounts-query.ts`.

## Verificação Manual
- Abrir `/metricas` e:
  - Desconectado: verificar botão “Conectar Meta Ads” visível apenas para usuários com acesso a métricas.
  - Conectado: selecionar “Todas as contas” e confirmar exibição de todos os criativos na aba “Criativos”.
  - Disparar sincronização e observar atualização em tempo real das tabelas.

## Entregáveis
- Ajuste de props em `TrafficMetrics` para arrays
- Assinaturas realtime e invalidação de cache
- Mensagens/feedback aprimorados na aba de criativos
- Checagens de permissão explícitas nas Edge Functions sensíveis
- Testes atualizados cobrindo fluxos de métricas e conexão

## Riscos e Mitigações
- Service Role bypassa RLS: mitigar com validação explícita de permissão
- Rate limit da Meta API: já tratado com respostas adequadas em funções de sync; manter `refetchInterval` moderado
- Ambiguidade de `redirect_uri`: normalização existente reduz erros de OAuth

## Próximo Passo
- Aprovar este plano para aplicar as mudanças, executar testes e validar em preview.