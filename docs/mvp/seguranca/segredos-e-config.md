# Segurança: .env, Segredos e Chaves

Supabase
- Frontend: use `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Edge Functions: use `SUPABASE_SERVICE_ROLE_KEY` apenas no backend (nunca no cliente).

Meta Ads
- Tokens: armazenar em secret (Supabase secrets) e nunca no banco em texto puro.
 - Escopos mínimos: `ads_read`, `pages_manage_ads`, `leads_retrieval`.
 - Tipos de token:
   - `META_PAGE_ACCESS_TOKEN`: necessário para `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen`.
   - `META_SYSTEM_USER_TOKEN` com `ads_read`/`leads_retrieval`: Insights (`/{campaign_id}/insights`, `act_{ad_account_id}/insights`).
 - Armazenamento sugerido (Supabase Secrets):
   - `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`
   - `META_PAGE_ACCESS_TOKEN`
   - `META_SYSTEM_USER_TOKEN`
   - `SUPABASE_SERVICE_ROLE_KEY`
 - Rotação de tokens: mecanismo de atualização e validação periódica.
   - Implementar checagem de expiração e tentativa de refresh; notificar Admin em falha.
- Nunca logar dados sensíveis (tokens, e-mail/telefone do lead) em texto puro.

Práticas
- .env local: nunca commitar; configure exemplos em `.env.example`.
- Logs: evitar logar dados pessoais de leads; mascarar emails/telefones em logs.
- Rate limit/backoff: implementar na ingestão de insights e leads.
- LGPD: oferecer exclusão de dados de lead; documentar consentimento.
 - Desenvolvimento vs Produção:
   - Em Development Mode, webhooks/Leads funcionam apenas para usuários/testers aprovados no app.
   - Para produção, concluir App Review para `leads_retrieval` e permissões de Página, com política de privacidade publicada.
