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
- Registrar em Supabase Secrets: META_PAGE_ACCESS_TOKEN, META_ADS_ACCESS_TOKEN (user/system), META_AD_ACCOUNT_ID (act_...), SUPABASE_SERVICE_ROLE_KEY.
- Validar que tokens não trafegam no frontend; logs sem dados sensíveis.

Banco de Dados
- Portar migracoes-propostas.sql para migrations do Supabase CLI (branch de desenvolvimento):
  - Atualizar enum de status em leads.
  - Adicionar campos: source, closed_won_at, closed_lost_at, lost_reason, external_lead_id, ad_id, adset_id, campaign_id.
  - Índices: idx_leads_campaign; índice único parcial em external_lead_id (WHERE external_lead_id IS NOT NULL).
- Criar/validar tabelas:
  - ad_accounts (RLS habilitado; policies SELECT admin/manager).
  - ad_campaigns (índice ad_account_id; RLS habilitado).
  - campaign_daily_insights (índice (campaign_id, date); RLS habilitado).
- Views e RPCs:
  - business_kpis e campaign_financials.
  - Criar RPCs (security definer) para filtros por período e validação de role.
- Triggers/Auditoria:
  - Preencher closed_won_at/closed_lost_at ao transicionar status.
  - Registrar lead_activity nas mudanças de status.

Edge Functions (Integração Meta Ads)
- Conexão inicial:
  - Endpoint para receber act_id, validar GET /{act_id}?fields=name,account_status e armazenar em ad_accounts + secrets.
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
  - Exibir source, campanha (nome), external_lead_id, datas de fechamento.
  - Modal de lost_reason na transição para venda_perdida.
  - Criação automática de cards em novo_lead via eventos do webhook.
  - Hooks: useLeads (transitionLeadStatus), useLeadIngestion (eventos em tempo real).
- Relatórios por campanha:
  - Tabela com filtros de período, ordenação por ROAS, export CSV.
  - Data source: campaign_financials e business_kpis; consistência de timezone/granularidade.
  - Fallback: usar SUM(campaign_daily_insights.leads_count) quando não houver webhook ativo.
- Admin (Configuração):
  - Tela para conectar conta (act_id) e acionar importação de campanhas.

Segurança e RLS
- Validar policies: SELECT restrito em ad_accounts/ad_campaigns/campaign_daily_insights; inserts/updates via Edge.
- Expor métricas financeiras via RPC com checagem de role; ocultar para role user.
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