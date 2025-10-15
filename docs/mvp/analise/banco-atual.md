# Análise do Banco de Dados Atual (Supabase/Postgres)

Principais tabelas e views (conforme `supabase/migrations/001_initial_schema.sql` e types em `src/lib/database.types.ts`):

Tabelas
- `profiles` (extends `auth.users`): role (`admin`, `manager`, `user`), nome, email. RLS ativada e triggers para atualização.
- `team_members`: membros da equipe vinculados a `profiles`. RLS com políticas de leitura e gestão por admins/managers.
- `leads`: cards do Kanban com `status` (`todo`, `doing`, `done`), `value` (numérico), `due_date`, `assignee_*`, contadores e `position`. Trigger para `lead_activity` ao mover status.
- `labels`, `lead_labels`: rótulos e associação many-to-many. RLS básica.
- `checklist_items`: checklist por lead. RLS básica.
- `comments`: comentários por lead com contagem em `leads`. RLS por usuário.
- `attachments`: anexos por lead com contagem em `leads`. RLS por usuário.
- `lead_activity`: histórico de movimentações (moved, updated, etc.).
- `client_goals`: metas por cliente com campos gerados (percentage/status) e período. RLS e índices.
- `revenue_records`: registros de receita por categoria (`new_up`, `clientes`, `oportunidades`), com data/mês/ano e vínculo opcional a lead/goal. Índices e RLS.
- `stopped_sales`: vendas paradas com last activity e dias parado.

Views
- `dashboard_kpis`: calcula faturamento mensal/anual (via `revenue_records`), oportunidades ativas (`leads` != `done`), e valor em pipeline.
- `monthly_revenue`: agregação mensal por categoria.

RLS/Policies
- Políticas de leitura exigem `auth.uid()` (migração 002 endureceu SELECT).
- Proteções de mudança de `role` em `profiles` restritas ao `service_role` (migração 003).

Pontos de atenção para o MVP
- Status dos leads não refletem a jornada comercial exigida (Novo Lead, Em Negociação, Proposta Enviada, Venda Ganha/Venda Perdida).
- Não há tabelas para campanhas/insights de Meta Ads, nem vínculo entre leads e campanhas.
- KPIs atuais são focados em receitas genéricas; precisamos calcular ROAS, CPL e métricas por campanha.
- Políticas RLS para leitura/escrita precisam refletir papéis (Admin vê tudo; Vendedor vê apenas leads próprios/atribuídos; métricas financeiras consolidadas restritas ao Admin).