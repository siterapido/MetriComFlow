# Integração com Meta Ads

Objetivo: operar a conexão entre o CRM Metricom Flow e a Graph API para sincronizar contas, campanhas, insights e leads (Lead Ads).

## Escopos e segurança
- Permissões mínimas: `ads_read`, `pages_manage_ads`, `leads_retrieval`.
- Tokens nunca trafegam no frontend; todos os fluxos passam por Edge Functions com `SUPABASE_SERVICE_ROLE_KEY`.
- Secrets necessários em `supabase secrets`: `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_PAGE_ACCESS_TOKEN`, tokens de sistema/usuário para ads, e `SUPABASE_SERVICE_ROLE_KEY`.
- As funções fazem validação de `state` e verificam assinatura (`X-Hub-Signature`) dos webhooks.

## Fluxos implementados
1. **OAuth Meta Business (`meta-auth`)**
   - `GET /auth/meta` gera `state`, redireciona para o consent screen.
   - Callback grava tokens em secrets (`meta_access_token_{connectionId}`) e cria registro em `meta_connections`.
2. **Conectar conta de anúncios (`connect-ad-account`)**
   - Recebe `ad_account_id` e opcionalmente um token; valida via Graph API `act_{id}?fields=id,name,business_name`.
   - Upserta em `ad_accounts`, atribui `connected_by` com o usuário autenticado e injeta secrets (`META_AD_ACCOUNT_ID`, `META_ACCOUNT_TOKEN`).
3. **Sincronizar campanhas (`connect-ad-account` & `useMetaAuth`)**
   - `GET /act_{id}/campaigns?fields=id,name,status,objective,start_time,stop_time&effective_status=['ACTIVE','PAUSED']`.
   - Persiste em `ad_campaigns` (upsert por `external_id`).
4. **Insights diários (`sync-daily-insights`)**
   - Scheduler (Supabase cron) chama Edge Function diariamente.
   - Para cada campanha ativa, consulta `/{campaign_id}/insights?level=campaign&time_increment=1&fields=spend,impressions,clicks,actions`.
   - Converte `actions[*].action_type='lead'` para `leads_count`, upserta em `campaign_daily_insights` com `UNIQUE(campaign_id,date)`.
   - Agregações (KPIs e tabelas) usam `business_kpis` e `campaign_financials` ou são calculadas no frontend a partir da tabela bruta.
5. **Webhook Lead Ads (`webhook-lead-ads`)**
   - Assinatura: `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}`.
   - Recebe payload `leadgen` com `leadgen_id`, `campaign_id`, `adset_id`, `ad_id`, `created_time`, `field_data`.
   - Deduplica por `external_lead_id` e insere em `leads` com `source='meta_ads'`, `campaign_id` resolvido a partir de `ad_campaigns`.
   - Opcional: chama `/{leadgen_id}?fields=field_data,created_time` para enriquecer dados.

## Consumo no frontend
- `useMetaAuth` lista conexões (`meta_connections` + `ad_accounts`), permite ativar/desativar contas e dispara refresh (`refreshData` → `sync-daily-insights`).
- `useMetaMetrics` lê `campaign_daily_insights`, `business_kpis` e `campaign_financials` via React Query com validação de `has_metrics_access`.
- `MetaAdsConfig` exibe status das contas (ativas/inativas), datas do último sync e erros de OAuth.
- `MetricsPage` aplica filtros combinados (conta, campanha, período) e renderiza KPIs, série temporal e tabela (`CampaignTable`).

## Considerações operacionais
- **Rate limits**: Edge Functions implementam backoff exponencial; evitar refetch agressivo no frontend (React Query `staleTime` > 5 min).
- **Timezone**: insights são gravados em UTC e convertidos para a data local via helpers (`getLastNDaysDateRange`); alinhar cron para fuso do cliente (atualmente 03:00 UTC).
- **LGPD**: armazenar somente dados essenciais do lead; permitir exclusão sob demanda; registrar política de privacidade (ver `src/pages/PrivacyPolicy.tsx`).
- **Monitoramento**: configurar notificações no Supabase para falhas em `sync-daily-insights` e `webhook-lead-ads`; persistir logs enxutos (sem tokens/personais).
