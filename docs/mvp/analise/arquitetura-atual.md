# Análise da Arquitetura Atual (Frontend)

Esta análise resume como o frontend está estruturado hoje e como ele se conecta ao Supabase.

Principais pontos:
- Cliente Supabase inicializado em `src/lib/supabase.ts`, com types gerados em `src/lib/database.types.ts`.
- Autenticação com persistência de sessão (localStorage), helpers de signup/signin/reset.
- Páginas principais:
  - `src/pages/Dashboard.tsx`: exibe KPIs e gráficos de faturamento usando views `dashboard_kpis` e `monthly_revenue` via hooks `useDashboardKPIs`, `useRevenueRecords`.
  - `src/pages/Leads.tsx`: Kanban de leads com colunas `todo`, `doing`, `done`, drag-and-drop (`@hello-pangea/dnd`), labels, checklist, anexos, contador de comentários/anexos e histórico de movimentações via `lead_activity`.
  - `src/pages/Metas.tsx`: exibe metas (`client_goals`) e evolução de faturamento.
  - `src/pages/SetupAdmin.tsx`: assistente para criar administrador (ligado à função Edge `create-admin`).
- Hooks de dados:
  - `useLeads`: CRUD em `leads` + relação `lead_labels` e `checklist_items`, ordenação via `position`.
  - `useLabels`: CRUD de `labels` e ligação com leads (`lead_labels`).
  - `useDashboard`: consulta a `dashboard_kpis`, `monthly_revenue` e `revenue_records`.
  - `useClientGoals`: CRUD de `client_goals`.
- UI moderna com Tailwind + componentes (shadcn/ui).

Observações:
- O Kanban atual usa status genéricos (`todo`, `doing`, `done`) e o campo `value` como numérico. Para o MVP de vendas, precisaremos alinhar os status aos estágios comerciais e tratar `value` como "Valor do Contrato".
- O Dashboard atual foca em faturamento consolidado (new_up/clientes/oportunidades) e pipeline, sem vínculo direto com campanhas de Meta Ads.
- Não há integração com Meta Ads ainda.

Implicações para o MVP:
- Ajustar os status e card fields do `Leads` para refletir o funil comercial.
- Adicionar páginas/visões para integração e relatórios por campanha.
- Adaptar hooks para novas views/tabelas (campanhas, insights e origem dos leads).

# Funções Edge

- `supabase/functions/create-admin/index.ts`: cria o primeiro admin usando Service Role; lê `PROJECT_URL`/`SUPABASE_URL` e `SERVICE_ROLE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` via secrets. Importante configurar via `supabase secrets` (não armazenar Service Role em .env do frontend).