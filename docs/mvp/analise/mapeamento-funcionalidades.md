# Mapeamento: Implementado vs. Próximos Ajustes (MVP)

Objetivo: comparar o escopo do MVP de "Painel Comercial + Meta Ads" com o que já está entregue no código e destacar lacunas residuais.

## Páginas e fluxos
- **Dashboard (`src/pages/Dashboard.tsx`)**  
  Mantém KPIs financeiros legados (receita consolidada). O fluxo Meta Ads migrou para `MetricsPage.tsx`; somente ajustes menores de copy/internacionalização são pendentes.
- **MetricsPage (`src/pages/MetricsPage.tsx`)**  
  Já exibe investimenti, leads, faturamento, CPL e ROAS por campanha com filtros de conta/campanha/período. Falta alinhar tooltips e export CSV.
- **MetaAdsConfig (`src/pages/MetaAdsConfig.tsx`)**  
  Integração completa: conexão via OAuth, ativação/desativação de contas, refresh manual. Próximos passos: expor status dos webhooks e última execução do cron.
- **Leads (`src/pages/Leads.tsx`)**  
  Kanban com drag-and-drop usando status `novo_lead`, `qualificacao`, `proposta`, `negociacao`, `fechado_ganho`, `fechado_perdido`. Campos avançados exibidos parcialmente; ainda precisamos mostrar prioridades, follow-up e motivo de perda nos cards.
- **LeadsLinear (`src/pages/LeadsLinear.tsx`)**  
  Lista filtrável por status, origem, prioridade, responsável e campanha já integrada a `useLeads`.
- **Metas (`src/pages/Metas.tsx` / `MetasNew.tsx`)**  
  Suporta criação de metas por categoria; migração `20251020_unified_goals_system.sql` já consolida metas anuais/mensais. Falta amarrar metas de ROAS com dados de Meta Ads.
- **Users & SetupAdmin**  
  Fluxos de onboarding e gestão de perfis usam `user_type` (`owner`, `traffic_manager`, `sales`) com guards (`useUserPermissions`).

## Hooks e serviços
- Implementados: `useLeads`, `useMetaMetrics`, `useMetaAuth`, `useSalesReports`, `useInteractions`, `useTasks`. Todos invalidam cache via canais Realtime.
- Pendências: alinhar o tipo `LeadStatus` em `useLeads` ao enum real e documentar convenções de prioridades/origens para não divergir das migrations.

## Backend / Supabase
- Migrações `006`–`010` + `20251020` já adicionaram:
  - Status e campos avançados em `leads`.
  - Tabelas `tasks`, `interactions`, `ad_accounts`, `ad_campaigns`, `campaign_daily_insights`.
- Views `business_kpis`, `campaign_financials`.
  - Funções de permissão (`has_crm_access`, `has_metrics_access`, `has_meta_access`) e políticas alinhadas.
- Falta: revisar índices se novas consultas pesadas surgirem (ex.: filtros por `next_follow_up_date`) e garantir que o cron `sync-daily-insights` está registrado no Scheduler.

## Lacunas prioritárias
1. **Experiência do Kanban**: expor prioridade, próximo follow-up e motivo de perda; modal de transição com captura obrigatória de `lost_reason`.
2. **Relatórios**: adicionar export CSV/Excel e badges de status de atualização nas páginas `MetricsPage` e `MetaAdsConfig`.
3. **Metas + Métricas**: conectar metas de ROAS/Clientes às views da Meta Ads para permitir tracking direto.
4. **Documentação**: alinhar exemplos de `.env` e scripts com `scripts/sync-envs.sh` (já reflete chaves Meta), além de registrar como monitorar Edge Functions no Supabase.
