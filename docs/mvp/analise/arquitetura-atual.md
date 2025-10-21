# Análise da Arquitetura Atual (Frontend)

Panorama do frontend React + Vite em fevereiro/2025, considerando as entregas recentes de CRM e integração com Meta Ads.

## Stack e organização
- Supabase client centralizado em `src/lib/supabase.ts` com tipagem gerada em `src/lib/database.types.ts`.
- Estado global com React Query (`QueryClientProvider` em `src/App.tsx`), AuthContext próprio (`src/context/AuthContext`) e rotas protegidas (`ProtectedRoute`).
- Componentização via shadcn (`src/components/ui`), layouts em `src/components/layout`, widgets de domínio em `src/components/{crm|meta-ads|metrics}`, e páginas em `src/pages`.
- Rotas principais:
  - `Dashboard.tsx`: mantém KPIs de faturamento legados (views `dashboard_kpis` e `monthly_revenue`).
  - `Leads.tsx`: Kanban comercial com drag-and-drop, checklists, comentários, interações e tarefas.
  - `LeadsLinear.tsx`: visão tabular com filtros avançados (status, prioridade, origem, responsável, campanha).
  - `MetaAdsConfig.tsx` e `MetricsPage.tsx`: configuração/OAuth, gestão de contas Meta, filtros por conta/campanha e visualizações de ROI (`CampaignTable`, `MetaAdsChart`, `MetaAdsKPICards`).
  - `Users.tsx` e `SetupAdmin.tsx`: onboarding e administração de perfis/convites.

## Hooks e serviços
- `useAuth` encapsula Supabase Auth (persistência de sessão, reset de senha, logout).
- `useLeads`, `useLabels`, `useInteractions`, `useTasks`, `useSalesReports` abastecem o CRM com React Query e canais Realtime para invalidação (`supabase.channel('realtime-leads')`, etc.).
- `useMetaAuth` orquestra conexões (Edge Functions `connect-ad-account`, `meta-auth`, `delete-user`), enquanto `useMetaMetrics` agrega dados de `campaign_daily_insights`, `campaign_financials` e da view `business_kpis`.
- `useClientGoals`/`useGoals` sustentam metas financeiras, e `useUserPermissions` consulta `profiles.user_type` (`owner`, `traffic_manager`, `sales`) para aplicar feature flags.

## Entidades e status operacionais
- Leads usam status: `novo_lead`, `qualificacao`, `proposta`, `negociacao`, `follow_up`, `aguardando_resposta`, `fechado_ganho`, `fechado_perdido`.
- Campos expostos na UI: `value` (contratos), `priority`, `lead_score`, `conversion_probability`, `product_interest`, `lead_source_detail`, datas de contato (`last_contact_date`, `next_follow_up_date`, `expected_close_date`) e atributos Meta (`source`, `campaign_id`, `external_lead_id`, `ad_id`, `adset_id`).
- Tarefas (`tasks`) e interações (`interactions`) já funcionam com filtros e contadores que alimentam boards e timeline.
- Métricas e tabelas usam `campaign_daily_insights` (tabela bruta), `campaign_financials` e `business_kpis`, além do legado `dashboard_kpis`.

## Fluxos com Meta Ads
- Tela `MetaAdsConfig` chama Edge Functions para conectar/desconectar contas, listar status das integrações e renovar dados.
- `MetricsPage` reutiliza os filtros (`MetaAdsFilters`) para carregar insights diários e KPIs com Recharts; formatação via `formatCurrency`/`formatNumber`.
- Hooks diferenciam papéis: owners e traffic managers veem métricas financeiras; `sales` é redirecionado ao CRM.

## Funções Edge disponíveis
- `create-admin`: provisiona primeiro owner com `SUPABASE_SERVICE_ROLE_KEY`.
- `meta-auth`: fluxo OAuth (gera state, processa callback, guarda tokens em secrets).
- `connect-ad-account`: valida `act_id` e upserta `ad_accounts`.
- `sync-daily-insights`: cron job (Supabase Scheduler) que persiste gastos, cliques e leads em `campaign_daily_insights`.
- `webhook-lead-ads`: endpoint assinado para eventos `leadgen`; deduplica pelo `external_lead_id` e cria leads com origem `meta_ads`.
- `delete-user`: remove usuários respeitando RLS e tabelas relacionadas.

## Observações
- O tipo `LeadStatus` em `useLeads` ainda precisa ser alinhado ao novo enum de banco (mantém valores antigos `novo`, `contato_inicial`, etc.).
- Página `Dashboard.tsx` segue ativa para métricas históricas, mas o fluxo recomendado para Meta Ads é `MetricsPage`.
- Projetos futuros devem reaproveitar hooks existentes em vez de duplicar consultas; qualquer nova tela precisa passar pelo gate de permissões (`useUserPermissions`) e pelos helpers de toasts/loading já padronizados.
