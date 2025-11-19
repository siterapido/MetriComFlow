## Objetivo
Garantir o fluxo completo “compra → criação automática da conta/organização → envio de magic link via Supabase → finalização do cadastro”, com planos corretamente mapeados no Stripe.

## Componentes já existentes
- Criação do Checkout: `supabase/functions/create-stripe-checkout/index.ts` (usa `subscription_plans.stripe_price_id`, grava `pending_plan` e `stripe_checkout_session_id`).
- Webhook Stripe: `supabase/functions/stripe-webhook/index.ts` (trata `checkout.session.completed` e cria usuário/organização/assinatura; envia convite).
  - Criação de usuário: `supabase/functions/stripe-webhook/index.ts:388-397`
  - Criação de organização: `supabase/functions/stripe-webhook/index.ts:429-446`
  - Inserção da assinatura: `supabase/functions/stripe-webhook/index.ts:518-543`
  - Envio do convite (magic link): `supabase/functions/stripe-webhook/index.ts:561-577`
- Claim da sessão pós-checkout: `supabase/functions/checkout-session-claim/index.ts` (recria tudo caso ausência no banco).
  - Criação de usuário: `supabase/functions/checkout-session-claim/index.ts:240-248`
  - Inserção da assinatura: `supabase/functions/checkout-session-claim/index.ts:380-407`
  - Envio do convite (magic link): `supabase/functions/checkout-session-claim/index.ts:455-458`
- Finalização do cadastro (frontend): `src/pages/FinalizeSignup.tsx` invoca `complete-stripe-signup` ao definir senha
  - Claim fetch: `src/pages/FinalizeSignup.tsx:98-118`
  - Concluir cadastro: `src/pages/FinalizeSignup.tsx:158-188`
- Completar cadastro (backend): `supabase/functions/complete-stripe-signup/index.ts`
  - Atualiza senha e marca claim como `completed`: `supabase/functions/complete-stripe-signup/index.ts:142-173`

## Plano de ação
1) Mapear corretamente os planos do Stripe
- Preencher `subscription_plans.stripe_price_id` para todos os planos ativos (ex.: `basico`, `intermediario`, `pro`).
- Conferir o fallback `PRICE_TO_PLAN_SLUG` em:
  - `supabase/functions/stripe-webhook/index.ts:27-32`
  - `supabase/functions/checkout-session-claim/index.ts:31-35`
- Resultado: `checkout.session.completed` sempre resolve o `plan_id` sem ambiguidade.

2) Garantir criação automática de conta após pagamento
- Confirmar que o webhook cobre o cenário externo (cliente não logado): criação de `auth.user`, `organizations`, `organization_memberships`, `profiles` e `organization_subscriptions`.
- Ajustar apenas se necessário, mantendo as rotas de redirecionamento para `finalizar-cadastro` com parâmetros: `claim`, `org`, `sub`, `email`, `session_id` conforme `stripe-webhook` já faz em `supabase/functions/stripe-webhook/index.ts:567-573`.

3) Envio de magic link pelo Supabase
- Validar o uso de `auth.admin.inviteUserByEmail(email, { redirectTo })` nos dois caminhos (webhook e claim).
- `redirectTo` aponta para `src/pages/FinalizeSignup.tsx` via `/finalizar-cadastro` (rota existente em `src/App.tsx:50`).
- Checar `APP_URL`/`VITE_APP_URL` para montar corretamente o `redirectTo`.

4) Finalização do cadastro
- Na página `FinalizeSignup`, garantir leitura de `session_id`/`claim` e chamada a `checkout-session-claim` quando necessário.
- Concluir via `complete-stripe-signup`, que define senha e marca `claim_status` como `completed`.

5) Fluxo autenticado (opcional)
- Se o usuário já estiver logado e voltar para `/planos?session_id=...`, decidir entre:
  - Integrar a tela para invocar `finalize-stripe-checkout` usando `session_id`, ou
  - Confiar somente no webhook para atualização da assinatura (já funcional). Observação: atualmente não há chamada a `finalize-stripe-checkout` no frontend (`grep` não encontrou referências).

6) Variáveis e configuração
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (ou `STRIPE_SIGNING_SECRET`).
- Supabase: `SUPABASE_URL`/`PROJECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- App: `APP_URL`/`VITE_APP_URL` para compor `redirectTo`.
- Verificar que todas estão presentes em produção (scripts de secrets existem e devem estar atualizados).

7) Testes de aceitação (ambiente de teste)
- Criar sessão de checkout com cartão de teste e completar pagamento.
- Usar Stripe CLI para encaminhar webhooks para a função de webhook e verificar:
  - Usuário criado no Supabase (`auth.admin.createUser`).
  - Organização e assinatura criadas com `plan_id` correto.
  - E-mail de convite enviado (logs de `inviteUserByEmail` sem erro).
  - Acessar o link recebido, abrir `/finalizar-cadastro`, definir senha e entrar.
- Validar eventos de `invoice.payment_succeeded`/`invoice.payment_failed` atualizando estado da assinatura.

8) Observabilidade e logs
- Conferir os `console.warn`/`console.error` nos pontos críticos do webhook e claim para troubleshooting.
- Usar `subscription_event_logs` para acompanhar o ciclo de vida (`plan_change_requested`, `plan_change_confirmed`, `payment_*`).

## Critérios de aceitação
- Compra concluída dispara criação automática de usuário/organização/assinatura.
- Magic link é enviado ao e-mail do comprador, levando à página `/finalizar-cadastro`.
- Finalização define senha e marca `claim_status = completed` com acesso ao dashboard.
- `plan_id` e metadados Stripe gravados corretamente na assinatura.

## Riscos e mitigação
- E-mail ausente no checkout: bloquear ou capturar no frontend antes de redirecionar.
- `stripe_price_id` não preenchido: preencher tabela; fallback cobre apenas ids mapeados.
- Usuário já existente: fluxo lida com conflito e apenas envia novo convite.

Se aprovar, executo a revisão de mapeamentos, verifico variáveis, e preparo testes end-to-end no ambiente de desenvolvimento.