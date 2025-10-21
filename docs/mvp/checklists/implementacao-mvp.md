# Checklist de Implementação do MVP (Commercial Control Panel via Meta Ads)

Objetivo: consolidar tarefas de desenvolvimento para implementar o MVP end-to-end com integração Meta Ads (Insights + Lead Ads), banco de dados, frontend (Kanban e Relatórios), segurança e métricas.

Referências:
- Integração Meta Ads: docs/mvp/integracoes/meta-ads.md
- Modelo e Migrações: docs/mvp/base-de-dados/modelo-de-dados.md, docs/mvp/base-de-dados/migracoes-propostas.sql
- Métricas: docs/mvp/metricas/calculos.md
- Segurança: docs/mvp/seguranca/permissoes-e-rls.md, docs/mvp/seguranca/segredos-e-config.md
- Frontend Kanban: docs/mvp/frontend/kanban-ajustes.md
- Relatórios: docs/mvp/relatorios/por-campanha.md

Checklist Geral (por área)

Setup/Segredos
- Registrar em Supabase Secrets: `META_CLIENT_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_PAGE_ACCESS_TOKEN`, `META_SYSTEM_USER_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.
- Validar que tokens não trafegam no frontend; logs sem dados sensíveis; atualizar `scripts/sync-envs.sh`.

Banco de Dados
- Aplicar migrations oficiais (`supabase/migrations/*.sql`) e, se necessário, portar complementos de `docs/mvp/base-de-dados/migracoes-propostas.sql` (branch de desenvolvimento):
  - Atualizar constraint de `source` para contemplar novos canais (meta_ads, manual, google_ads, whatsapp, indicacao, site, telefone, email, evento).
  - Garantir enum de status completo (`novo_lead`, `qualificacao`, `proposta`, `negociacao`, `follow_up`, `aguardando_resposta`, `fechado_ganho`, `fechado_perdido`).
  - Criar índices de follow-up (`idx_leads_next_follow_up_date`, `idx_leads_assignee_priority`).
- Criar/validar tabelas:
  - `tasks`, `interactions`, `ad_accounts`, `ad_campaigns`, `campaign_daily_insights` (todas já em migrations 008-010).
- Views e RPCs:
  - `business_kpis` e `campaign_financials`; caso precise de filtros adicionais, criar RPCs (security definer) que aproveitem `campaign_daily_insights`.
- Triggers/Auditoria:
  - Preencher closed_won_at/closed_lost_at e atualizar counters (`comments_count`, `attachments_count`, `interactions_count`, `tasks_count`).
  - Registrar lead_activity nas mudanças de status.

Edge Functions (Integração Meta Ads)
- Conexão inicial:
  - `meta-auth`: OAuth + storage de tokens em secrets (state e verify).
  - `connect-ad-account`: receber `act_id`, validar `GET /act_{id}?fields=id,name,business_name`, registrar conta e iniciar importação de campanhas.
- Importar campanhas:
  - GET /{act_id}/campaigns?fields=name,status,objective,start_time,stop_time&effective_status=['ACTIVE','PAUSED'].
  - Upsert em ad_campaigns (external_id).
- Insights (cron diário):
  - GET /act_{ad_account_id}/insights?level=campaign&fields=spend,impressions,clicks,actions&time_increment=1&date_preset=today.
  - Mapear actions[action_type='lead'] → leads_count; upsert em campaign_daily_insights.
  - Suportar time_range para retrocoleta, paginação e rate limit/backoff.
- Webhook Leadgen:
  - Assinar Página: POST /{page_id}/subscribed_apps?subscribed_fields=leadgen com PAGE_ACCESS_TOKEN.
  - meta-leads-webhook: verificar X-Hub-Signature, verify token; persistir external_lead_id, ad_id, adset_id, campaign_id, created_time, field_data.
  - Deduplicar por external_lead_id; opcional GET /{LEAD_ID}?fields=field_data,created_time.

Frontend
- Kanban:
  - Exibir source, campanha (nome), priority, lead_score, datas de follow-up/fechamento, external_lead_id.
  - Modal de lost_reason na transição para `fechado_perdido`.
  - Criação automática de cards em `novo_lead` via webhook; mostrar badge “Lead Meta”.
  - Hooks: alinhar `LeadStatus` em `useLeads`, implementar `transitionLeadStatus` e `useLeadIngestion`.
- Relatórios por campanha:
  - Tabela com filtros (conta, campanha, período), ordenação por ROAS/Faturamento, export CSV.
  - Data source: `campaign_financials` (agregado) + `campaign_daily_insights` (dados brutos) para consistência de timezone/granularidade.
  - Fallback: usar SUM(campaign_daily_insights.leads_count) quando não houver webhook ativo.
- Admin (Configuração):
  - Tela para conectar conta, renomear, ativar/desativar, exibir status dos tokens/webhooks e disparar refresh.

Segurança e RLS
- Validar policies: SELECT restrito em `ad_accounts`/`ad_campaigns`/`campaign_daily_insights` (somente `has_metrics_access`); mutações via Edge.
- Expor métricas financeiras via RPC com checagem de role; ocultar para `sales`.
- Confirmar escopos e tokens: ads_read, pages_manage_ads, leads_retrieval; PAGE_ACCESS_TOKEN e User/System User token.
- App Review: preparar política de privacidade e testers; planejar submissão.

Testes e Monitoramento
- Webhook: payload de exemplo, verificação de assinatura, deduplicação.
- Insights: execução diária e mapeamento de leads_count.
- Métricas: CPL/ROAS com proteção de divisão por zero.
- Triggers: preenchimento de datas e razões.
- RLS: validar restrições para role user.
- Observabilidade: logs sanitizados, alertas de expiração de token, backoff em erros.

DevOps
- Supabase CLI: aplicar migrations em branch, gerar tipos TypeScript.
- Cron de meta-insights-sync: agendar horário em UTC, documentar janela e timezone.

Dados e Mapeamentos
- Garantir relação ad_id/adset_id → campaign_id na ingestão de leads.
- Opcional: armazenar form_id para cenários de polling.

Critérios de Aceite
- Dados de Insights e Leads persistidos corretamente e sem duplicações.
- Kanban atualiza automaticamente com leads Meta.
- Relatórios mostram investimento, leads, vendas, faturamento e ROAS com filtros.
- Segurança: tokens protegidos; RLS impede acesso indevido; políticas documentadas.
- Testes de integração e unidade aprovados.
