# Checklist de Implementação da Integração Meta Ads

Objetivo: orientar a execução da integração com a API de Marketing da Meta para campanhas (Insights) e geração de leads (Lead Ads via webhooks/polling).

Pré-requisitos
- Segredos configurados no Supabase Secrets: META_PAGE_ACCESS_TOKEN, META_ADS_ACCESS_TOKEN (user/system), META_AD_ACCOUNT_ID (act_...).
- Permissões: ads_read, pages_manage_ads, leads_retrieval.
- App Review: preparar produção para leads_retrieval/pages_manage_ads; em Development Mode, apenas testers/autorizados.

Conexão de Conta
- Endpoint (Edge): receber act_id, validar GET /{act_id}?fields=name,account_status.
- Persistir ad_accounts (external_id=act_...) e guardar tokens em secrets.

Campanhas
- Importar campanhas: GET /{act_id}/campaigns?fields=name,status,objective,start_time,stop_time&effective_status=['ACTIVE','PAUSED'].
- Upsert em ad_campaigns usando external_id como chave.

Insights (Diários)
- Coleta:
  - GET /act_{ad_account_id}/insights?level=campaign&fields=spend,impressions,clicks,actions&time_increment=1&date_preset=today.
  - Alternativa por campanha: GET /{campaign_id}/insights?fields=spend,impressions,clicks,actions&time_increment=1.
- Mapeamento:
  - leads_count = soma de actions com action_type='lead'.
- Persistência:
  - Upsert em campaign_daily_insights (date, spend, impressions, clicks, leads_count, ad_campaign_id).
- Retrocoleta e Resiliência:
  - Suportar time_range; paginação; rate limit/backoff.

Lead Ads (Webhook)
- Assinar Página: POST /{page_id}/subscribed_apps?subscribed_fields=leadgen com PAGE_ACCESS_TOKEN.
- Endpoint meta-leads-webhook:
  - Verificar assinatura (X-Hub-Signature) e verify token.
  - Persistir external_lead_id (leadgen_id), ad_id, adset_id, campaign_id, created_time, field_data.
  - Deduplicar por external_lead_id; opcionalmente, GET /{LEAD_ID}?fields=field_data,created_time para detalhamento.

Lead Ads (Polling – alternativa)
- GET /{form_id}/leads?fields=created_time,field_data ou GET /{ad_id}/leads.
- Resolver mapeamentos form→ad→adset→campaign; aplicar deduplicação.

Segurança
- Tokens em Secrets; nenhuma exposição no frontend.
- RLS: leitura de ad_accounts/ad_campaigns/campaign_daily_insights por admin/manager; ingestões via Edge.
- LGPD: armazenar somente dados necessários; oferecer exclusão; sanitizar logs.

Testes
- Webhook: payload de exemplo; assinatura válida; deduplicação.
- Insights: conferência de leads_count e totais de spend; período atual e retrocoleta.

Critérios de Aceite
- Contas e campanhas importadas com sucesso.
- Insights diários persistidos e consolidados.
- Leads recebidos em tempo real (webhook) e sem duplicação.
- Relatórios por campanha refletindo investimento, leads, vendas e ROAS.