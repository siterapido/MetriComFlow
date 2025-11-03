# Integração de E-mail (Mailgun Inbound) → CRM

Este documento descreve a integração completa para receber e-mails via Mailgun Inbound Routes e ingestar no CRM do Insightfy, criando leads e registrando interações automaticamente, com atualização em tempo real na interface.

## Fluxo de Dados

- Envio: Um remetente envia um e-mail para o endereço de coleta da organização (`<org-slug>@VITE_MAILGUN_INBOUND_DOMAIN`).
- Mailgun (Routes): A rota `match_recipient('<org-slug>@<domain>')` faz `forward()` do conteúdo via `POST multipart/form-data` para `https://<SUPABASE_URL>/functions/v1/mailgun-inbound`.
- Edge Function `mailgun-inbound`:
  - Valida a assinatura (`timestamp + token` com `MAILGUN_SIGNING_KEY`).
  - Resolve a organização pelo slug do destinatário.
  - Cria um lead mínimo (`title`, `description`, `status=novo_lead`).
  - Cria uma interação (`interactions`) do tipo `email` e direção `inbound` com `subject` e `content`.
  - Registra auditoria em `lead_activity` (best-effort).
- UI: `src/hooks/useInteractions.ts` agora assina atualizações em tempo real (`postgres_changes`) e invalida a lista automaticamente.

## Requisitos de Segurança

- Assinatura Mailgun: verificação baseada em HMAC-SHA256 com `MAILGUN_SIGNING_KEY` conforme documentação oficial.
  - Campos: `timestamp`, `token`, `signature` (multipart/form-data).
  - Proteção de replay: rejeita `timestamp` com desvio > 15 minutos do clock atual.
- Autorização de provisionamento: apenas `owner`/`admin` da organização podem invocar `provision-mailgun-inbound`.
- Supabase Service Role: Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS, somente no backend.
- Logs: erros e eventos críticos são logados em console; dados sensíveis (emails/telefones) não são expostos em mensagens de erro.

## Configurações Necessárias no Mailgun

1. Defina as variáveis de ambiente (ver `.env.example`):
   - `VITE_MAILGUN_INBOUND_DOMAIN`: domínio de recebimento (ex.: `inbound.suaempresa.com`).
   - `MAILGUN_SIGNING_KEY`: chave de assinatura (Webhook Signing Key do domínio).
   - `MAILGUN_API_KEY`: API Key da conta.
   - `MAILGUN_DOMAIN`: domínio onde as rotas serão criadas.
   - `MAILGUN_API_BASE_URL`: opcional (ex.: `https://api.eu.mailgun.net/v3` para região EU).
2. Crie a rota via app (aba Formulários → Integrações → “E-mail para coleta” → “Configurar”) ou manualmente pela API:
   - `expression`: `match_recipient('<org-slug>@<MAILGUN_DOMAIN>')`
   - `action`: `forward('https://<SUPABASE_URL>/functions/v1/mailgun-inbound')`, `stop()`
3. Alternativamente, use uma rota catch-all (`match_recipient('.*@<MAILGUN_DOMAIN>')`) e deixe o endpoint roteá-la por `recipient`.

## Mapeamento de Campos

- Mailgun → Lead (public.leads):
  - `subject` → `title` (fallback: `Contato: <sender>`)
  - `sender`, `recipient`, `body-plain`/`stripped-text`/`stripped-html` → agregados em `description`
  - `status`: `novo_lead`
  - `organization_id`: inferido pelo slug do destinatário (se a coluna existir no schema)
- Mailgun → Interação (public.interactions):
  - `interaction_type`: `email`
  - `direction`: `inbound`
  - `subject`: `subject`
  - `content`: corpo do e-mail (HTML preferencial, fallback para texto)
  - `lead_id`: id do lead criado
  - `user_id`: `null`, `user_name`: `"Email (Inbound)"`

## Atualização em Tempo Real

- Hook `useInteractions` passa a assinar o canal `realtime-interactions` (Supabase Realtime).
- Qualquer `INSERT/UPDATE/DELETE` em `public.interactions` invalida automaticamente as queries relacionadas, refletindo novas interações imediatamente no CRM.

## Exemplos de Payloads (Mailgun → webhook)

Multipart/form-data (campos principais):

```
timestamp: 1481310293
token: f2a24f20007696fb23fd66ff0f59f17f...
signature: 6ed72df4b5f00af436fff03730dc8bda31bf...
sender: user@samples.mailgun.com
from: Excited User <user@samples.mailgun.com>
recipient: org-slug@inbound.suaempresa.com
subject: Apresentação dos serviços
stripped-text: Olá, gostaria de saber mais.
stripped-html: <p>Olá, gostaria de saber mais.</p>
```

Verificação da assinatura (HMAC-SHA256):

```
hex = HMAC_SHA256(MAILGUN_SIGNING_KEY, timestamp + token)
hex == signature
```

## Endpoints

- `POST /functions/v1/mailgun-inbound`
  - Consome `multipart/form-data` de rotas Mailgun.
  - Retorna `{ ok: true, leadId, organizationId, organizationSlug }` em sucesso.

- `POST /functions/v1/provision-mailgun-inbound`
  - Autenticado (Bearer do usuário): atribui o e-mail de coleta e cria a rota Mailgun para a organização ativa.
  - Retorna `{ ok: true, inboundEmail, routeId? }`.

## Observações de Escalabilidade

- Funções idempotentes e baseadas em slug por organização.
- Validação de assinatura impede chamadas não legítimas.
- Inserções fazem uso do Service Role (sem RLS no backend) e evitam acoplamento forte de schema (colunas opcionais são best-effort).
- Realtime invalida apenas queries relevantes, mantendo UI responsiva.

## Checklist de Deploy

- Configurar segredos no projeto Supabase: `SUPABASE_SERVICE_ROLE_KEY`, `MAILGUN_SIGNING_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`.
- Definir `VITE_MAILGUN_INBOUND_DOMAIN` no ambiente do frontend.
- Deployar as Edge Functions:
  - `supabase functions deploy mailgun-inbound`
  - `supabase functions deploy provision-mailgun-inbound`
  - `supabase functions list` para validar.

