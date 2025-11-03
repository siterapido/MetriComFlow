# Configuração da Integração de E-mail (Mailgun Inbound)

Este guia explica, passo a passo, como configurar a Mailgun para que e‑mails recebidos virem leads e interações no CRM do Insightfy.

---

## Visão Geral
- Cada organização do Insightfy pode ter um endereço único de coleta: `<slug-da-org>@<DOMÍNIO>`.
- A Mailgun encaminha e‑mails recebidos (Routes) para a função Edge `mailgun-inbound`.
- A função valida a assinatura, cria um Lead e registra uma Interação do tipo e‑mail (inbound) em tempo real no CRM.

---

## Pré‑requisitos
- Conta Mailgun ativa com um domínio verificado (DNS ok para receber e‑mails: registros MX, SPF e DKIM).
- Projeto Supabase com as Edge Functions implantadas.
- A organização no Insightfy deve ter um `slug` (usado no endereço de e‑mail).

---

## Variáveis de Ambiente

Defina as variáveis a seguir.

Backend (Supabase Secrets):
- `MAILGUN_SIGNING_KEY` — Webhook Signing Key do domínio (Mailgun → Domain Settings → Webhooks → Signing key).
- `MAILGUN_API_KEY` — API Key privada (Mailgun → API Keys).
- `MAILGUN_DOMAIN` — Domínio que receberá os e‑mails (ex.: `inbound.suaempresa.com`).
- `MAILGUN_API_BASE_URL` — Opcional. Padrão US: `https://api.mailgun.net/v3`. Região EU: `https://api.eu.mailgun.net/v3`.

Frontend (ambiente do app):
- `VITE_MAILGUN_INBOUND_DOMAIN` — mesmo domínio de recebimento (`MAILGUN_DOMAIN`). Usado para exibir o endereço na UI.

Como definir (exemplo Supabase CLI):

```
# Substitua <ref> pelo project ref (ex.: fjoaliipjfcnokermkhy)
supabase secrets set --project-ref <ref> \
  MAILGUN_SIGNING_KEY="<signing_key>" \
  MAILGUN_API_KEY="<api_key>" \
  MAILGUN_DOMAIN="inbound.suaempresa.com" \
  MAILGUN_API_BASE_URL="https://api.mailgun.net/v3"
```

---

## Deploy das Funções Edge

As funções já estão no repositório:
- `supabase/functions/mailgun-inbound`
- `supabase/functions/provision-mailgun-inbound`

Faça o deploy:

```
supabase functions deploy mailgun-inbound --project-ref <ref> --no-verify-jwt
supabase functions deploy provision-mailgun-inbound --project-ref <ref>
```

> Observação: `mailgun-inbound` não exige JWT, pois a autenticação é feita via assinatura HMAC da Mailgun.

---

## Configuração via Aplicação (recomendado)

1) No app, acesse “Formulários” → aba “Integrações”.
2) Em “E‑mail para coleta (Mailgun)”, clique em “Configurar”.
3) O sistema criará automaticamente uma Route na Mailgun para sua organização:
   - Expressão: `match_recipient('<slug-da-org>@<MAILGUN_DOMAIN>')`
   - Ação: `forward('<SUPABASE_URL>/functions/v1/mailgun-inbound')`, `stop()`
4) O endereço ficará visível na UI e pronto para uso.

---

## Configuração Manual na Mailgun (opcional)

Via painel:
- Domains → Routes → Create Route
  - Expression: `match_recipient('<slug-da-org>@<MAILGUN_DOMAIN>')`
  - Action: `forward('https://<SUPABASE_URL>/functions/v1/mailgun-inbound')` e `stop()`

Via API:

```
# US: https://api.mailgun.net/v3 | EU: https://api.eu.mailgun.net/v3
curl -u 'api:<MAILGUN_API_KEY>' https://api.mailgun.net/v3/routes \
  -F priority=0 \
  -F description='Insightfy inbound <org-slug>' \
  -F expression="match_recipient('<org-slug>@<MAILGUN_DOMAIN>')" \
  -F action="forward('https://<SUPABASE_URL>/functions/v1/mailgun-inbound')" \
  -F action="stop()"
```

---

## Teste e Validação

- Envie um e‑mail para `<org-slug>@<MAILGUN_DOMAIN>`.
- Verifique no CRM: um novo Lead e uma Interação “email inbound” devem aparecer quase em tempo real.
- Logs da função podem ser vistos no painel do Supabase (Edge Functions → `mailgun-inbound`).

Teste rápido (simulando Mailgun, sem assinatura válida):

```
curl -i -X POST "https://<SUPABASE_URL>/functions/v1/mailgun-inbound" \
 -F timestamp=$(date +%s) \
 -F token=abc \
 -F signature=deadbeef \
 -F sender=user@example.com \
 -F recipient='<org-slug>@<MAILGUN_DOMAIN>' \
 -F subject='Teste Inbound' \
 -F stripped-text='Olá, tudo bem?'
```

> Em produção, configure `MAILGUN_SIGNING_KEY` para validar a assinatura enviada pela Mailgun. Se a assinatura não bater, a função retorna 401 (Invalid signature).

---

## Segurança
- Assinatura HMAC (Mailgun): valida `signature == HMAC_SHA256(MAILGUN_SIGNING_KEY, timestamp + token)`.
- Proteção contra replay: rejeita `timestamp` com desvio maior que 15 minutos.
- Provisionamento restrito: apenas owner/admin podem criar rotas via função `provision-mailgun-inbound`.
- Segredos permanecem no backend (Supabase Secrets); nada exposto ao cliente.

---

## Mapeamento de Dados (resumo)
- Lead: `title` ← assunto (fallback no remetente); `description` ← remetente/destinatário/corpo; `status=novo_lead`.
- Interação: `interaction_type='email'`, `direction='inbound'`, `subject`, `content`, `lead_id` do lead criado.

---

## Troubleshooting
- 401 Invalid signature: verifique `MAILGUN_SIGNING_KEY` e se a requisição veio da Mailgun (timestamp/token/assinatura).
- 404/422 ao criar Route: confirme `MAILGUN_DOMAIN` e permissões da API key.
- E‑mail não chega: confira DNS (MX, SPF, DKIM) e se o domínio está verificado na Mailgun.
- Lead não aparece: verifique logs da função no Supabase e policies/RLS do schema.

---

## Referências
- Guia técnico completo: `docs/MAILGUN_INBOUND.md`
- Mailgun Docs – Routes & Webhooks

