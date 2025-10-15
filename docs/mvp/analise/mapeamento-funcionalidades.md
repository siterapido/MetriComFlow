# Mapeamento: Funcionalidades Existentes vs. Módulos do MVP

Objetivo: alinhar o que já existe no frontend/backend com as necessidades do MVP "Painel de Controle Comercial via Meta Ads" e listar adaptações.

## Páginas atuais

- Dashboard (`src/pages/Dashboard.tsx`)
  - Hoje: KPIs (Receita Mensal/Anual, Oportunidades Ativas) + gráficos "New Up" e "Client Revenue" via `useDashboard`/`useRevenueRecords`.
  - MVP: deve exibir métricas de negócio conectadas a Meta Ads: Investimento Total, Leads Gerados, CPL, Clientes Fechados, Faturamento Realizado, Faturamento Previsto e ROAS.
  - Ação: adicionar hook `useBusinessKPIs` consultando view `business_kpis`; atualizar cards e layout para novas métricas.

- Metas (`src/pages/Metas.tsx`)
  - Hoje: CRUD de metas em `client_goals` + gráficos de evolução/ distribuição.
  - MVP: manter, e adicionar suporte à meta de ROAS (tipo de meta ou campo específico). Integração com cálculo atual de `business_kpis.roas`.
  - Ação: estender modelo `client_goals` com tipos (ex.: `revenue`, `roas`, `new_customers`) ou usar `category/target_type` para distinguir.

- Leads / Kanban (`src/pages/Leads.tsx`)
  - Hoje: colunas baseadas em `status` (`todo`, `doing`, `done`), com valor, prazo, checklist, comentários, anexos.
  - MVP: funil comercial com colunas: `novo_lead` → `em_negociacao` → `proposta_enviada` → `venda_ganha` | `venda_perdida`. Campo chave: "Valor do Contrato (R$)".
  - Ação: atualizar enum de `status`, exibir/editar `value` sempre; criar `closed_won_at`/`closed_lost_at` e `lost_reason` na mudança de coluna; adicionar `source` e `campaign_id` no lead.

- Setup Admin (`src/pages/SetupAdmin.tsx`)
  - Hoje: criação de admin via Edge Function `create-admin` com `service_role`.
  - MVP: manter; após admin criado, exibir fluxo de conexão da conta Meta Ads (ver Integrações).

## Hooks atuais

- `useDashboard.ts`: obter `dashboard_kpis`, `monthly_revenue`, `revenue_records`.
  - Ação: criar `useBusinessKPIs` e `useCampaignFinancials` para consumir `business_kpis` e `campaign_financials`.

- `useLeads.ts`: CRUD de leads, labels e checklist.
  - Ação: suportar novos campos (`source`, `campaign_id`, `closed_*`, `lost_reason`) e novos `status`; endpoint específico para transição que preencha datas/razões.

- `useClientGoals.ts`: CRUD de metas.
  - Ação: permitir metas de ROAS e novos tipos; ligar aos cálculos de `business_kpis`.

- `useLabels.ts`: rótulos
  - Ação: manter; opcionalmente usar labels para classificar leads por origem.

## Novos módulos do MVP

- Dashboard de Performance Comercial
  - Implementar visual baseado em `business_kpis` com cards e gráfico simples.

- Gestão de Vendas (CRM Kanban)
  - Atualizar colunas e lógica de transições; criar cards automaticamente ao receber leads de Meta Ads.

- Metas de Negócio
  - Estender metas para ROAS e clientes; manter visual atual.

- Relatórios de Faturamento por Campanha
  - Nova página com tabela agregada por campanha usando `campaign_financials` e filtros de período.

- Gestão de Equipe
  - Usar `profiles` + `team_members` existentes; reforçar RLS e permissão de acesso.

## Impactos no Frontend

- Rotas: adicionar rota "Relatórios" (por campanha) e "Configurações > Meta Ads".
- Estado/UI: adaptar componentes Kanban às novas colunas; componentes de cartão com campo "Valor do Contrato" sempre visível.
- Hooks: novos hooks para views; ajustes nos existentes para novos campos.
- Proteção de rotas: Admin pode ver métricas financeiras; Vendedor restrito ao Kanban.