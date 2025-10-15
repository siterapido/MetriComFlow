# Integração com Meta Ads (Facebook Ads)

Objetivo: conectar a conta de anúncios, coletar investimento e gerar cards de leads automaticamente no Kanban.

## Estratégia de MVP

- Conexão inicial simples: Admin informa `Ad Account ID (act_...)` e um Access Token com escopos mínimos. Escopos/Permissões necessárias:
  - `ads_read` (Insights da conta/campanha/adset/ad)
  - `pages_manage_ads` (gestão de anúncios da Página e assinatura de webhooks de Página)
  - `leads_retrieval` (receber/ler Leads de Lead Ads)
- Segurança: token nunca no frontend; armazenar como secret do projeto e usar Edge Functions para chamadas à Graph API.

## Fluxos

1) Conectar Conta
- Tela de Configuração: form para `ad_account_id` e envio do token (Edge Function armazena em secret e registra `ad_accounts`).
- Validação: GET `/{act_id}?fields=name,account_status`.

2) Importar Campanhas
- Edge Function: GET `/{act_id}/campaigns?fields=name,status,objective,start_time,stop_time&effective_status=['ACTIVE','PAUSED']`.
- Persistir em `ad_campaigns` (upsert por `external_id`).

3) Ingestão de Insights Diários
- Tarefa agendada (cron) em Edge Function:
  - Por campanha: `GET /{campaign_id}/insights?fields=spend,impressions,clicks,actions&time_increment=1&date_preset=today`
  - Alternativamente, por conta: `GET /act_{ad_account_id}/insights?level=campaign&fields=spend,impressions,clicks,actions&time_increment=1&date_preset=today`
  - Mapear `leads_count` a partir de `actions` filtrando `action_type='lead'` (valor inteiro). Persistir em `campaign_daily_insights` como:
    - `date` (dia do insight)
    - `spend`, `impressions`, `clicks`, `leads_count`
    - `ad_campaign_id` (chave para `ad_campaigns.external_id`)
  - Suportar `time_range` custom (ex.: retrocoleta) e paginação.

4) Leads Automáticos (Lead Ads)
- Preferencial: Webhook de Lead Ads (app Meta)
  - Assinar a Página: `POST /{page_id}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}`
  - Receber payload `leadgen` (contendo `leadgen_id`, `ad_id`, `adset_id`, `campaign_id`, `created_time` e `field_data`) no endpoint Edge Function `meta-leads-webhook`.
  - Buscar detalhes do Lead se necessário: `GET /{LEAD_ID}?fields=field_data,created_time`.
  - Persistir em `leads` com:
    - `source='meta_ads'`
    - `external_lead_id=leadgen_id`
    - `ad_campaign_id` (via `campaign_id` do payload)
    - opcional: `ad_id`, `adset_id`
  - Deduplicação: chave única por `external_lead_id`.

  Alternativa (Polling):
  - `GET /{form_id}/leads?fields=created_time,field_data` ou `GET /{ad_id}/leads` caso webhook não esteja disponível.
  - Exige resolver mapeamentos form→ad→adset→campaign; aplicar deduplicação por `external_lead_id`.

  Observações:
  - Em Development Mode, o app entrega webhooks/leads apenas de usuários/testers autorizados.
  - Requer `pages_manage_ads` e `leads_retrieval`; tokens de Página (PAGE_ACCESS_TOKEN) para assinatura de webhooks.

## Modelo de Dados
- `ad_accounts`: conta conectada
- `ad_campaigns`: campanhas da conta
- `campaign_daily_insights`: gastos e contagens por dia (leads_count derivado de `actions[action_type='lead']`)
- `leads`: vínculo `ad_campaign_id` + `source='meta_ads'` + `external_lead_id` + opcional `ad_id`/`adset_id`

## Considerações
- Limites de API: respeitar `rate limits` e paginação.
- Timezone: normalizar datas para UTC e `date` local do cliente.
- Consentimento LGPD: armazenar apenas dados de lead necessários (nome, contato) e permitir exclusão.
 - Segurança/Permissões: tokens guardados em Supabase Secrets; Edge Functions com `service_role` para persistência; RLS limita leitura a papéis adequados.
 - Métricas: ROAS/custos calculados com base em `campaign_daily_insights` + receita interna; evitar double-count de leads (usar `external_lead_id`).