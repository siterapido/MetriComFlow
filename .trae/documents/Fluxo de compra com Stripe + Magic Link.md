## Visão Geral
- Implementar fluxo completo de compra que usa Stripe para pagamento e autenticação por Magic Link via e-mail.
- Reaproveitar Supabase Edge Functions já existentes para Stripe e e-mail; adicionar funções pontuais para emissão/validação do Magic Link e telas no React.
- Garantir segurança: tokens únicos, TTL, uso único, logging de tentativas, rate limiting e RLS.

## Arquitetura
- Frontend: `React + Vite + TypeScript`, roteamento com `react-router-dom`, UI com `shadcn-ui`/Tailwind, estado com `React Query`.
- Backend: `Supabase Edge Functions (Deno)` para checkout, webhooks, emissão/validação do magic link e reenvio.
- Auth: Supabase Auth (v2). A validação do nosso token redireciona para um `action_link` oficial do Supabase (`auth.admin.generateLink` tipo `magiclink`).
- Email: Reutilizar infra existente (Mailgun/convites); adicionar template de e-mail do Magic Link.

## Stripe: Integração
- Reutilizar funções existentes:
  - `create-stripe-checkout`: cria `Checkout Session` com `success_url` e `cancel_url` adequadas.
  - `finalize-stripe-checkout`: confirma sessão (`session_id`), persiste compra/assinatura.
  - `stripe-webhook`: receber `checkout.session.completed` e `payment_intent.succeeded`.
- Ajustes:
  - Incluir emissão de Magic Link na conclusão de compra (via webhook ou finalize), gerando nosso token e e-mail.
  - Garantir `price_id` e `mode` compatíveis com `src/lib/stripePricing.ts`.

## Magic Link: Emissão
- Criar Edge Function `issue-magic-link` (ou dentro do webhook/finalize):
  - Entrada: `email`, `order_id`/`checkout_session_id`.
  - Gera `token` aleatório (32 bytes), `token_hash` (SHA-256 com sal), `expires_at` (ex.: 30 min), `max_attempts` (ex.: 5), `status = active`.
  - Persiste em `public.magic_links` (RLS: somente serviço).
  - Usa `auth.admin.generateLink({ type: 'magiclink', email, options: { redirect_to: APP_URL + '/pos-login?orderId=...' } })` para obter `action_link` do Supabase.
  - Envia e-mail com link para nosso endpoint de validação, não direto para `action_link`.

## Magic Link: Validação
- Criar Edge Function `validate-magic-link`:
  - Entrada via URL: `t` (token), opcional `email`.
  - Lógica:
    - Buscar `magic_links` por `token_hash` (comparando hash), `status = active`, `expires_at > now`. Incrementar `attempt_count` e `last_attempt_at`, salvar `ip` e `ua`.
    - Se inválido/expirado/excedeu tentativas: responder 200 com payload de erro (HTML simples ou JSON) e instruções de recuperação.
    - Se válido: marcar como `consumed_at = now`, `status = consumed` (single-use). Gerar/redescobrir `action_link` via `auth.admin.generateLink` e responder 302 redirect para `action_link` do Supabase.
  - Rate limiting básico por IP+email (ex.: 10/min).

## Reenvio do Magic Link
- Criar Edge Function `resend-magic-link`:
  - Valida elegibilidade (compra existente, limites de reenvio por hora/dia).
  - Revoga tokens ativos anteriores (status `revoked`) e emite novo token com novo TTL.
  - Reenvia e-mail com instruções de uso.

## Modelo de Dados (Supabase)
- Tabela `public.magic_links`:
  - `id` (uuid), `email` (text), `user_id` (uuid, null), `order_id` (text ou uuid), `checkout_session_id` (text), `token_hash` (text), `expires_at` (timestamptz), `consumed_at` (timestamptz), `status` (enum: active, consumed, expired, revoked), `attempt_count` (int), `last_attempt_at` (timestamptz), `last_attempt_ip` (inet), `last_attempt_ua` (text), `created_at`.
  - Índices em `token_hash`, `email`, `status`, `expires_at`.
  - RLS: somente `service role` pode `select/insert/update`.
- Opcional: `public.purchase_orders` (se não existir) ou reutilizar colunas/migrações de Stripe já presentes para vincular `order_id`.

## E-mail: Conteúdo
- Assunto: "Seu acesso está pronto — Magic Link"
- Corpo:
  - Link seguro e temporário (`https://app.seu-dominio/magic/validate?t=...`).
  - Instruções: clicar uma vez no mesmo dispositivo/navegador, válido por `N` minutos.
  - Validade: exibir janela do TTL e política de reenvio.
  - Suporte: instruções para recuperação se expirado ou perdido.
- Implementação: Reutilizar rotina de envio existente (Mailgun). Template simples (HTML + texto).

## UI: Fluxo de Compra
- Páginas/Componentes:
  - `PurchasePage`: seleção de plano, resumo, CTA "Pagar".
  - Ao criar checkout: chamar `supabase.functions.invoke('create-stripe-checkout')` e redirecionar para Stripe.
  - `PurchaseSuccessPage`: via `success_url` com `session_id` → chamar `finalize-stripe-checkout` e informar "Magic link enviado" com botões: "Abrir e-mail", "Reenviar link".
  - `PurchaseCancelPage`: feedback claro e opção de tentar novamente.
  - `MagicLinkStatus`: componente que mostra estados (pendente, enviado, reenviado) e erros.
  - `PosLoginPage`: destino do `redirect_to` após o `action_link` do Supabase; mostra confirmação de login e leva para dashboard.
- Acessibilidade: Navegação por teclado, foco gerenciado, ARIA para formulários/feedback, alto contraste.
- Responsividade: Layout fluido (Tailwind), breakpoints e componentes shadcn.

## Segurança
- Tokens: aleatórios, single-use, nunca armazenar em texto puro; usar `token_hash` com sal.
- TTL: expirar automaticamente via checagem na validação; job opcional para limpeza.
- Tentativas de acesso: log com IP/UA, contador e limitação por janela de tempo.
- Revogação: permitir revogar tokens antigos ao reenviar.
- Headers/CSRF: nas invocações de Edge Functions, validar origem; usar `Authorization: Bearer <anon|service>` conforme apropriado.
- RLS: tabelas acessíveis apenas por funções (service role).

## Tratamento de Erros & Recuperação
- Estados de erro no UI: pagamento falhou, sessão inválida, link expirado, limite excedido.
- Ações de recuperação: reenvio, suporte, retry de checkout.
- Telemetria: registrar eventos de falha/sucesso para observabilidade.

## Testes & Verificação
- Unitários: geração/validação de token (hash, TTL, uso único), rate limiting.
- Integração: fluxo de webhook Stripe → emissão de token → e-mail → validação → redirecionamento.
- E2E parcial: simular checkout com Stripe test keys e clicar magic link.
- UI: testes com `@testing-library` e `Vitest` para estados e acessibilidade.

## Configuração & Segredos
- Variáveis:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `MAGIC_LINK_SECRET` (sal/HMAC)
  - `MAILGUN_API_KEY` e `MAILGUN_DOMAIN` (ou provedor equivalente)
  - `APP_URL`
- Script de secrets: reutilizar `scripts/update-all-supabase-secrets.sh` para adicionar chaves novas.

## Entregáveis
- Novas Edge Functions: `validate-magic-link`, `resend-magic-link` (e emissão integrada no webhook/finalize).
- Migração SQL para `public.magic_links`.
- Páginas React: `PurchasePage`, `PurchaseSuccessPage`, `PurchaseCancelPage`, `PosLoginPage` e componente `MagicLinkStatus`.
- Templates de e-mail.

## Riscos & Mitigações
- Duplicidade de emissão: condicionar a emissão a transições idempotentes do webhook.
- Phishing/abuso de links: usar domínio próprio, instruções claras, monitorar anomalias.
- Entrega de e-mails: fallback e reenvio; monitorar bounces.

## Próximos Passos
- Implementar migração da tabela `magic_links`.
- Ajustar webhook/finalize para emitir o token e disparar o e-mail.
- Criar `validate-magic-link` e `resend-magic-link` com logging/limites.
- Implementar páginas e componentes no frontend.
- Testar fluxo end-to-end com chaves de teste do Stripe.