# Convites de Equipe — Envio por E-mail

O sistema de convites de equipe suporta dois modos de envio de e-mail:

- Supabase Auth (SMTP configurado no Auth) — recomendado por simplicidade
- Resend (API externa) — já implementado e usado como fallback

## Como usar o e-mail do Supabase (Auth)

1. No Supabase Studio, vá em `Authentication → Providers → Email` e configure o provedor:
   - Você pode usar o mailer padrão do Supabase para dev ou apontar um SMTP próprio.
   - Ajuste os templates em `Authentication → Templates` (por exemplo, o template de “Invite”).

2. Defina a variável de ambiente no projeto para ativar o modo Supabase Auth:

   - `USE_SUPABASE_AUTH_INVITE=true`
   - (Opcional) `APP_URL=https://app.seudominio.com` — usado para montar o link de aceite

3. Garanta que as variáveis do Supabase estejam disponíveis para as Edge Functions:

   - `PROJECT_URL` ou `SUPABASE_URL`
   - `SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`

4. Deploy das funções (se necessário):

   - `npx supabase functions deploy send-team-invitation`
   - `npx supabase functions deploy accept-invitation`

## Como funciona

- Ao enviar um convite, criamos o registro em `public.team_invitations` e geramos um link para `\`/accept-invitation?token=...\``.
- Se `USE_SUPABASE_AUTH_INVITE=true`, a função `send-team-invitation` chama `auth.admin.inviteUserByEmail(email, { redirectTo: inviteLink })`.
  - O e-mail é enviado pelo Supabase (usando o SMTP configurado) e, após a confirmação, o usuário é redirecionado para o link de aceite do convite.
- Se `USE_SUPABASE_AUTH_INVITE` não estiver ativo (ou falhar), usamos o Resend quando `RESEND_API_KEY` estiver presente.

## Observações importantes

- Convites via Supabase Auth são ideais para usuários que ainda não possuem conta. Se o e-mail já existir em `auth.users`, `inviteUserByEmail` pode falhar e o envio não ocorrer — nesse caso, mantemos o convite criado e, quando `RESEND_API_KEY` estiver configurado, caímos no fallback Resend.
- Ajuste os templates de e-mail do Supabase para refletir o fluxo (por exemplo, mencione que, após confirmar o e-mail, o usuário será redirecionado para aceitar o convite da organização).
- O link de aceite expira conforme `INVITE_EXPIRATION_DAYS` (padrão: 7 dias). Configure conforme sua política.

## Variáveis de ambiente relacionadas

- `USE_SUPABASE_AUTH_INVITE` — `true` para usar o Supabase Auth como remetente dos convites.
- `APP_URL` — Base para montar o link de aceite (`/accept-invitation`).
- `PROJECT_URL`/`SUPABASE_URL` — Endpoint do projeto Supabase.
- `SERVICE_ROLE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` — Chave service role (usada nas Edge Functions).
- `RESEND_API_KEY` — (Opcional) habilita fallback de envio via Resend.

