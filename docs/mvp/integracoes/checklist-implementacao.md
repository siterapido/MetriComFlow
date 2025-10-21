# Checklist de Implementação da Integração Meta Ads

Objetivo: orientar a execução da integração com a API de Marketing da Meta para campanhas (Insights) e geração de leads (Lead Ads via webhooks/polling).

Pré-requisitos
- Secrets no Supabase (`supabase secrets set`): `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_PAGE_ACCESS_TOKEN`, `META_SYSTEM_USER_TOKEN` (ads_read), `SUPABASE_SERVICE_ROLE_KEY`.
- Permissões concedidas ao app: `ads_read`, `pages_manage_ads`, `leads_retrieval`.
- App Review: preparar submissão para `leads_retrieval` e `pages_manage_ads`; em Development Mode, somente testers recebem webhooks.

Conexão de Conta
- `meta-auth`: gerar link OAuth, armazenar tokens em secrets (`meta_access_token_{connectionId}`).
- `connect-ad-account`: receber `act_id`, validar `GET /act_{id}?fields=id,name,business_name`, upsert em `ad_accounts` e armazenar mapeamento connection↔account.
- Garantir que a tela `MetaAdsConfig` reflita status (ativa/inativa, último sync, erros).

Campanhas
- Importar campanhas: GET /{act_id}/campaigns?fields=name,status,objective,start_time,stop_time&effective_status=['ACTIVE','PAUSED'].
- Upsert em ad_campaigns usando external_id como chave.

Insights (Diários)
- Edge Function `sync-daily-insights` (invocada pelo Scheduler):
  - `/act_{ad_account_id}/insights?level=campaign&fields=spend,impressions,clicks,actions&time_increment=1&date_preset=today`.
  - Alternativa retroativa: usar `time_range={since,to}` parcelando em lotes de 7 dias.
- Conversão: `leads_count = SUM(actions[action_type='lead'])`.
- Persistência: upsert em `campaign_daily_insights` (UNIQUE `(campaign_id,date)`); agregações são calculadas no frontend ou via `business_kpis`/`campaign_financials`.
- Resiliência: implementar backoff exponencial e logging sanitizado; retornar `202` para reprocessar filas longas.

Lead Ads (Webhook)
- Assinar Página: `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}`.
- Endpoint `webhook-lead-ads`:
  - Validar `X-Hub-Signature-256` (HMAC-SHA256 com `META_APP_SECRET`) e parâmetro `hub.verify_token`.
  - Persistir `external_lead_id`, `campaign_id`, `adset_id`, `ad_id`, `created_time`, `field_data`.
  - Deduplicar com `UNIQUE INDEX ux_leads_external_lead_id_not_null`; se duplicado, atualizar apenas campos complementares.
  - Opcional: enriquecer com `GET /{leadgen_id}?fields=field_data,created_time`.

Lead Ads (Polling – alternativa)
- GET /{form_id}/leads?fields=created_time,field_data ou GET /{ad_id}/leads.
- Resolver mapeamentos form→ad→adset→campaign; aplicar deduplicação.

Segurança
- Tokens e IDs sensíveis ficam em secrets; Edge Functions usam `createClient(SUPABASE_SERVICE_ROLE_KEY)`.
- RLS: SELECT em `ad_accounts`/`ad_campaigns`/`campaign_daily_insights` exige `has_metrics_access`; inserts/updates apenas via Edge.
- LGPD: armazenar somente dados essenciais (nome, contato, campanha); oferecer exclusão; logs sem PII ou tokens.

Testes
- Webhook: payload de exemplo; assinatura válida; deduplicação.
- Insights: conferência de leads_count e totais de spend; período atual e retrocoleta.

Critérios de Aceite
- Contas e campanhas importadas com sucesso.
- Insights diários persistidos e consolidados.
- Leads recebidos em tempo real (webhook) e sem duplicação.
- Relatórios por campanha refletindo investimento, leads, vendas e ROAS.
