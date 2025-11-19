## Diagnóstico Rápido
- Formulários públicos criam leads sem `organization_id`: `supabase/functions/submit-lead-form/index.ts:546-550` (não usa org do formulário).
- Exclusão de lead sem escopo de organização: `src/hooks/useLeads.ts:487-491` (falta `.eq('organization_id', org.id)`).
- Consultas sem escopo multi-tenant:
  - Por status: `src/hooks/useLeads.ts:565-571`.
  - Estatísticas: `src/hooks/useLeads.ts:591-594`.
- Interações e Tarefas sem organização no cliente; faltam filtros/coluna:
  - Interações: `src/hooks/useInteractions.ts:16-34, 124-131, 162-166`.
  - Tarefas: `src/hooks/useTasks.ts:20-55, 102-115, 227-229`.
- Logs temporários em produção: `src/hooks/useLeads.ts:419, 438, 465`.
- Testes do CRM quase inexistentes (há apenas `FormRenderer`).

## Prioridades Imediatas
- Garantir multi-tenant: propagar `organization_id` em todas as entidades e consultas (Leads, Tasks, Interactions, Imports).
- Corrigir policies RLS e a policy truncada de `lead_import_batches`.
- Ajustar Edge Functions para atribuir org corretamente nas inserções.
- Cobrir fluxos críticos com testes (criar/atualizar/mover lead, interações, tarefas, formulários).

## Ações de Banco (Supabase)
- Adicionar coluna `organization_id` e índices em `tasks` e `interactions`; atualizar FKs úteis.
- RLS: alinhar `SELECT/INSERT/UPDATE/DELETE` de `tasks` e `interactions` ao membership ativo da organização (`organization_memberships`).
- Corrigir policy de `lead_import_batches` (USING/With Check com organização e acesso CRM).
- Índices recomendados:
  - `leads`: (`organization_id`, `assignee_id`), (`organization_id`, `priority`, `next_follow_up_date`).
  - `comments`/`attachments`: (`lead_id`, `created_at DESC`).
  - `tasks`: (`assigned_to`, `status`).

## Ações de Backend (Edge Functions)
- `submit-lead-form`:
  - Incluir `organization_id` do `lead_forms` na carga do lead.
  - Carregar `lead_forms.organization_id` e validar `is_active` + escopo org.
- Revisar funções de ingest (Meta Lead Ads) para garantir org em todos os inserts.
- Reduzir logs e padronizar mensagens; estruturar eventos já registrados.

## Ações de Frontend (Hooks/Páginas)
- Leads:
  - `useDeleteLead`: adicionar `.eq('organization_id', org.id)` — `src/hooks/useLeads.ts:487-491`.
  - `useLeadsByStatus`: filtrar por `organization_id` — `src/hooks/useLeads.ts:565-571`.
  - `usePipelineStats`: filtrar por `organization_id` — `src/hooks/useLeads.ts:591-594`.
  - Substituir `console.log` por `logDebug` — `src/hooks/useLeads.ts:419, 438, 465`.
- Interactions/Tasks:
  - Após adicionar `organization_id` no banco, ajustar inserts e queries para sempre escopar por organização.
  - `useMyTasks`: substituir dependência de `team_members` por membership atual da organização quando aplicável.
- Formulários:
  - Manter fallback legado, mas garantir que a criação vincule à organização ativa em todos os caminhos.

## Testes e Verificação
- Adicionar testes de unidade e integração:
  - Leads: criação/atualização/exclusão, drag-and-drop de pipeline, filtros de campanha/origem.
  - Interações: criar/atualizar/excluir e atualização de `lead.last_contact_date` via trigger.
  - Tarefas: criar/atualizar/excluir e sincronização com interações (auto-complete / follow-up).
  - Formulários: validação de campos obrigatórios e submissão -> criação de lead com org.
- Rodar suites existentes e garantir zero `skip/todo`.

## Telemetria e UX
- Unificar logs com `logDebug` e níveis; remover `console.*` visíveis.
- Trocar early returns (`null/0`) por estados de carregamento/vazio onde fizer sentido.
- Mensagens de erro consistentes e acionáveis (autenticação, escopo org, políticas RLS).

## Entregáveis
- Migrations aplicadas e políticas RLS validadas.
- Edge Functions ajustadas com org.
- Hooks atualizados e sem logs temporários.
- Testes cobrindo fluxos principais do CRM.

Confirma as prioridades acima? Posso iniciar pelas correções multi-tenant (DB + client + Edge) e em seguida criar a suíte de testes do CRM.