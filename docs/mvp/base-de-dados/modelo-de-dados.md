# Modelo de Dados (Estado Pós-Migrations 010)

Consolidação do schema adotado pelo MVP após as migrations `001_initial_schema.sql` até `010_crm_essential_features.sql` e `20251020_unified_goals_system.sql`.

## Leads e entidades CRM
- `leads`
  - Status (`leads_status_check`): `novo_lead`, `qualificacao`, `proposta`, `negociacao`, `follow_up`, `aguardando_resposta`, `fechado_ganho`, `fechado_perdido`.
  - Campos chave: `value`, `priority` (`low|medium|high|urgent`), `expected_close_date`, `last_contact_date`, `next_follow_up_date`, `lead_score`, `conversion_probability`, `product_interest`, `lead_source_detail`.
  - Integração Meta: `source`, `campaign_id`, `external_lead_id`, `ad_id`, `adset_id`.
  - Fechamento: `closed_won_at`, `closed_lost_at`, `lost_reason`.
  - Índices: status, priority, expected_close_date, last_contact_date, next_follow_up_date, lead_score, campaign; `UNIQUE(external_lead_id) WHERE NOT NULL`.
- `lead_activity`: histórico de transições/atribuições (trigger em `leads`).
- `labels`, `lead_labels`, `checklist_items`, `comments`, `attachments` continuam com RLS via `has_crm_access`.
- `tasks`: tarefas relacionadas a leads (`task_type`, `status`, `priority`, `due_date`, `reminder_date`, `assigned_to`, `created_by`).
- `interactions`: log de contatos (tipo, direção, outcome, follow_up).

## Usuários e permissões
- `profiles` possui `user_type` enum (`owner`, `traffic_manager`, `sales`).
- Funções auxiliares:
  - `is_owner(uuid)`
  - `has_crm_access(uuid)` → owner + sales
  - `has_metrics_access(uuid)` → owner + traffic_manager
  - `has_meta_access(uuid)` (migre 007+)
- `team_members` vincula usuários a equipes, usado para atribuições.

## Meta Ads
- `ad_accounts`: contas conectadas (`external_id act_...`, `business_name`, `connected_by`).
- `ad_campaigns`: campanhas da conta (`external_id`, `objective`, `status`, datas, FK `ad_account_id`).
- `campaign_daily_insights`: métricas diárias (`spend`, `impressions`, `clicks`, `leads_count`, UNIQUE `campaign_id + date`).
- Views:
  - `business_kpis`: KPIs mensais (investimento, leads, clientes fechados, faturamento previsto/realizado, CPL, ROAS, conversão).
  - `campaign_financials`: agregado por campanha (investimento, leads, fechamentos, faturamento, ROAS, CPL, conversão).

## Metas e relatórios
- `client_goals` remodelada na migration `20251020_unified_goals_system.sql` com tipos flexíveis (faturamento, clientes, ROAS) e períodos.
- Views legadas `dashboard_kpis`, `monthly_revenue` permanecem para o dashboard antigo.

## Políticas RLS e segurança
- RLS em `leads`, `tasks`, `interactions`, `comments`, `attachments`, `checklist_items`, `labels`, `lead_labels` exige `has_crm_access`.
- `ad_accounts`, `ad_campaigns`, `campaign_daily_insights` expõem SELECT para `has_metrics_access`; mutações via Edge Functions com serviço.
- Views financeiras são consumidas através de RPCs (security definer) que validam `has_metrics_access` antes de retornar dados.
- Triggers preenchem contadores (`comments_count`, `attachments_count`, `interactions_count`, `tasks_count`) e datas de fechamento.

## Migrações futuras
- Revisar se novos campos (ex.: `deal_probability_reason`) serão necessários ao evoluir scoring.
- Caso surjam filtros adicionais (p.ex. por `next_follow_up_date`), avaliar criação de índices compostos específicos.
