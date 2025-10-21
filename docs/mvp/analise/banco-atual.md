# Análise do Banco Atual (Supabase/Postgres)

Resumo da base em fevereiro/2025 com base nas migrações `001`–`010` + pós-ajustes (`20251020_unified_goals_system.sql`).

## Tabelas principais
- `profiles`: extensão de `auth.users` com `user_type` (`owner`, `traffic_manager`, `sales`), `full_name`, `team`, etc. Funções auxiliares `is_owner`, `has_crm_access`, `has_metrics_access`.
- `team_members`: vínculo entre perfis, cargos e permissões de CRM. Usado para atribuições de leads e tarefas.
- `leads`: agora inclui:
  - Status válidos: `novo_lead`, `qualificacao`, `proposta`, `negociacao`, `follow_up`, `aguardando_resposta`, `fechado_ganho`, `fechado_perdido`.
  - Campos avançados: `product_interest`, `lead_source_detail`, `priority` (`low`–`urgent`), `expected_close_date`, `last_contact_date`, `next_follow_up_date`, `lead_score`, `conversion_probability`, além de metadados Meta Ads (`source`, `campaign_id`, `external_lead_id`, `ad_id`, `adset_id`).
  - Índices: status, priority, expected_close_date, last_contact_date, next_follow_up_date, lead_score, campaign.
- `lead_activity`: auditoria de transições de status/atribuições.
- `labels`, `lead_labels`, `checklist_items`, `comments`, `attachments`: mantidos e adaptados para novas permissões.
- `tasks`: tarefas de follow-up (tipos call/email/meeting/demo/etc., status `pending`–`completed`, prioridade, lembretes, relacionamento com leads e perfis).
- `interactions`: log de interações (ligação, WhatsApp, e-mail) com outcome, follow-up e vínculo opcional à tarefa.
- `client_goals` + tabelas complementares (aprimoradas na migração `20251020_unified_goals_system.sql`).
- `ad_accounts`, `ad_campaigns`, `campaign_daily_insights`: base Meta Ads (contas conectadas, campanhas e insights diários agregados).

## Views e materializações
- `business_kpis`: KPI mensal (investimento, leads gerados, clientes fechados, faturamento realizado/previsto, CPL, ROAS, taxa de conversão).
- `campaign_financials`: agrega por campanha (investimento, leads associados, fechamentos, faturamento, ROAS, CPL, taxa de conversão).
- Agregações adicionais acontecem via `business_kpis` e `campaign_financials`; filtros mais específicos são executados diretamente sobre `campaign_daily_insights`.
- Views legadas: `dashboard_kpis`, `monthly_revenue`.

## Políticas e funções
- Funções de permissão:
  - `is_owner(uuid)`, `has_crm_access(uuid)`, `has_metrics_access(uuid)`.
  - `has_meta_access(uuid)` e `has_task_access(uuid)` adicionadas nas últimas migrações.
- RLS atualizada:
  - `leads`, `tasks`, `interactions`, `comments`, `attachments`, `checklist_items`, `labels`, `lead_labels` permitem leitura/escrita apenas a quem tem `has_crm_access`.
  - `ad_accounts`, `ad_campaigns`, `campaign_daily_insights` liberam SELECT para `has_metrics_access`; inserts/updates restritos a Edge Functions.
  - Views financeiras são acessadas via RPCs (security definer) que validam `has_metrics_access`.
- Triggers:
  - Atualização de `lead_activity` e contadores (`comments_count`, `attachments_count`, `interactions_count`, `tasks_count`).
  - Preenchimento automático de `closed_won_at`/`closed_lost_at` e cálculo de `conversion_probability`.

## Integrações
- `supabase/functions`:
  - `meta-auth`, `connect-ad-account`, `sync-daily-insights`, `webhook-lead-ads` implementam ingestão OAuth + insights + leads.
  - `delete-user`, `create-admin` cobrem onboarding/ offboarding.
- Secrets esperados: `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_SECRET`, `META_CLIENT_ID`, `META_REDIRECT_URI`, `META_PAGE_ACCESS_TOKEN`, tokens de anúncio/conta.

## Pontos de atenção
- O tipo `LeadStatus` no frontend ainda precisa refletir o novo enum do banco.
- `campaign_daily_insights` usa `UNIQUE(campaign_id, date)`; idempotência depende de UPSERT nas Edge Functions.
- Queries financeiras devem usar os RPCs expostos (ver `src/hooks/useMetaMetrics.ts`) para respeitar RLS.
