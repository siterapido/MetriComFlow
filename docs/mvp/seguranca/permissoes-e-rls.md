# Papéis, Permissões e RLS

Modelo de controle vigente após as migrations `009_user_types_and_permissions.sql` e `010_crm_essential_features.sql`.

## Papéis (`profiles.user_type`)
- `owner`: acesso completo (CRM, métricas, administração, exclusão).
- `traffic_manager`: acesso a métricas Meta Ads, configurações de contas/campanhas, sem CRUD em leads.
- `sales`: acesso ao CRM (leads, tarefas, interações, checklists) limitado aos dados que a RLS permitir.

Funções auxiliares disponibilizadas:
- `is_owner(user_id uuid)`
- `has_crm_access(user_id uuid)` → owner + sales
- `has_metrics_access(user_id uuid)` → owner + traffic_manager
- `has_meta_access(user_id uuid)` → owner + traffic_manager (migrations 010)
- `has_task_access(user_id uuid)` → owner + sales

## Políticas por tabela
- `leads`, `tasks`, `interactions`, `comments`, `attachments`, `checklist_items`, `labels`, `lead_labels`
  - SELECT/INSERT/UPDATE exigem `has_crm_access(auth.uid())`.
  - DELETE reservado a `is_owner(auth.uid())` (quando aplicável).
  - Triggers mantém `lead_activity`, contadores e datas de fechamento.
- `ad_accounts`, `ad_campaigns`, `campaign_daily_insights`
  - SELECT exige `has_metrics_access(auth.uid())`.
  - INSERT/UPDATE/DELETE não são liberados por RLS (Edge Functions usam Service Role).
- Views financeiras (`business_kpis`, `campaign_financials`)
  - Consumidas via RPCs (security definer) que invocam `has_metrics_access` antes de retornar dados.
- `tasks`/`interactions`
  - Políticas específicas permitem que criador ou responsável atualize registros (`has_crm_access` + `assigned_to = auth.uid()` ou `created_by = auth.uid()`).

## Enforcement no frontend
- `useUserPermissions` verifica `user_type` para:
  - Ocultar métricas financeiras de `sales`.
  - Restringir acesso às rotas `MetaAdsConfig`, `MetricsPage` para quem não possui `has_metrics_access`.
  - Forçar redirecionamento de `sales` para o CRM.
- Componentes sensíveis (cards financeiros, botões de sync) verificam permissões antes de renderizar.

## Integração Meta Ads
- Escopos necessários: `ads_read`, `pages_manage_ads`, `leads_retrieval`.
- Tokens em uso:
  - `META_PAGE_ACCESS_TOKEN` para assinatura de webhooks (`POST /{page_id}/subscribed_apps?subscribed_fields=leadgen`).
  - `META_SYSTEM_USER_TOKEN` (ou user token equivalente) para insights (`/{campaign_id}/insights`, `act_{ad_account_id}/insights`).
- Nenhum token é exposto ao cliente; Edge Functions (`meta-auth`, `connect-ad-account`, `sync-daily-insights`, `webhook-lead-ads`) usam `SUPABASE_SERVICE_ROLE_KEY` e secrets.
- App Review obrigatório para produção (`leads_retrieval`, `pages_manage_ads`). Em modo dev, apenas testers listados recebem webhooks.

## Auditoria e LGPD
- `lead_activity` mantém trilha de status/atribuições (user, from → to, motivo).
- Dados de leads importados armazenam somente campos essenciais (`field_data` sanitizado).
- Logs omitem PII e tokens; `scripts/sync-envs.sh` documenta quais chaves existem sem expor valores.
