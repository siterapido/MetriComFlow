# Formulários Nativos InsightFy

Este módulo permite criar, publicar e embedar formulários nativos com validação em tempo real, integração com CRM e Meta Ads, e exportação de submissões.

## Visão Geral
- Builder em `CRM → Formulários`: cria e organiza campos, define obrigatoriedade e publica alterações.
- Página pública `/forms/:formId`: entrega o formulário, coleta UTMs/fbp/fbc e envia os dados para o backend.
- Backend (Supabase Edge Functions): valida payload, persiste submissão/lead, dispara Conversions API e registra eventos.

## Arquivos Relevantes
- Público: `src/pages/PublicLeadForm.tsx`, `src/components/forms/FormRenderer.tsx`, `src/hooks/usePublicLeadForm.ts`
- Builder: `src/pages/LeadForms.tsx`, `src/components/forms/LeadFormBuilderDrawer.tsx`
- Edge Functions:
  - `supabase/functions/submit-lead-form` (validação + criação de lead)
  - `supabase/functions/meta-conversion-dispatch` (Meta CAPI)
  - `supabase/functions/export-lead-form` (exportação CSV)
- SQL: `supabase/migrations/20251106_native_lead_forms_phase1.sql`

## Fluxo de Dados
1. Usuário acessa ou embeda `/forms/:formId?variant=slug`.
2. `FormRenderer` valida em tempo real (react-hook-form) e coleta tracking (`utm_*`, `fbp/fbc`, referrer).
3. Envio via `submit-lead-form` → cria `lead_form_submissions` e `leads` no CRM.
4. Disparo assíncrono para Meta CAPI (`meta-conversion-dispatch`) com `event_id = submission_id` (deduplicação).
5. Dashboard/relatórios consomem `lead_form_performance` + métricas de campanhas.

## Como Publicar/Embedar
- Link público: copie o link em `CRM → Formulários → Ações → Link`.
- Embed: copie o `<iframe>` em `CRM → Formulários → Ações → Embed`.
- Variantes (opcional): use `?variant=slug` para segmentar por campanha (Meta Ads).

## Exportar Submissões
- `CRM → Formulários → Ações → CSV` baixa arquivo com colunas fixas (tracking) + colunas dinâmicas (campos do formulário).
- Filtro por período/variante poderá ser adicionado (parâmetros `from`, `to`, `variantId`).

## Segurança
- RLS nas tabelas de formulários, campos e submissões.
- Edge Functions sanitizam strings e validam email/telefone.
- `export-lead-form` exige usuário autenticado com `has_crm_access`.
- CAPI recebe `email/phone` hasheados (SHA-256) e dados de client (fbp/fbc, IP, UA) quando disponíveis.

## Variáveis de Ambiente
Veja `.env.example` para chaves relevantes. Use `supabase secrets set` em produção para CAPI.

## Roadmap
- Multi-step, campos condicionais, honeypot/reCAPTCHA e assinaturas de embed.

## Troubleshooting
- Verifique `Supabase Logs` das Edge Functions.
- Rode `npm run verify:meta` para checar configuração Meta.

