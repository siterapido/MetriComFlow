## Visão Geral
- Expandir a importação existente (src/components/leads/LeadsImportDialog.tsx:289) com mapeamento inteligente, auditoria completa e opção de desfazer.
- Manter stack atual: React + Vite + shadcn-ui + TanStack Query, Supabase (RLS, triggers) e Edge Functions.
- Reutilizar padrões de validação com zod no frontend e validação consistente no backend.

## Backend: Esquema & Storage
- Criar tabelas:
  - lead_import_batches: id, organization_id, user_id, source_file_name, source_file_url, source_file_hash, sheet_name, mapping_json, started_at, completed_at, row_count, imported_count, skipped_count, error_count.
  - lead_import_rows: id, batch_id, original_values (jsonb), normalized_values (jsonb), status ('imported'|'skipped'), errors (text[]), lead_id (uuid nullable), created_at.
  - lead_import_mappings: id, organization_id, user_id, name, mapping_json, usage_count, last_used_at, created_at.
- RLS: leitura/escrita restrita por organization_id e usuário autenticado.
- Índices: batches (organization_id, started_at desc), rows (batch_id, status), mappings (organization_id, usage_count desc).
- Storage: bucket privado `lead-imports` para guardar arquivo fonte; gerar URL assinada para visualização/relatório.

## Edge Functions
- import-leads:
  - Entrada: batch metadata (source_file_*), `mapping_json`, `rows` já lidos (opcional), `organization_id`.
  - Se `rows` não vierem, função lê do arquivo no bucket (CSV/XLSX/ODS). Caso contrário, usa os `rows` do cliente.
  - Normaliza e valida com schema alinhado ao frontend; aplica regras de negócio (status válidos, contrato, datas, percentuais 0–100).
  - Insere em `public.leads` em transação; grava `lead_import_rows` com `normalized_values`, `status`, `errors` e `lead_id` quando aplicável.
  - Retorna relatório: totals, erros por coluna/linha, ids dos leads.
- undo-lead-import:
  - Entrada: `batch_id` e `organization_id`.
  - Regras: só desfaz se nenhuma atividade posterior ao insert existir (verifica `lead_activity`); remove leads do lote e marca `lead_import_rows.status='skipped'` com motivo `"undo"`.
  - Retorna contagem de itens desfeitos e bloqueios (leads com alterações posteriores).

## Validação & Regras de Negócio
- Frontend: manter zod + react-hook-form; consolidar normalizações existentes (números/datas/alias) já usadas em src/components/leads/LeadsImportDialog.tsx:188–234, 236–267, 269–283.
- Backend: schema zod equivalente (Deno) para `LeadImportPayload` (campos usados em src/hooks/useLeads.ts:31–57) e enums (status/prioridade/origem/contrato).
- Aplicar triggers atuais de auditoria em leads:
  - Inserções/updates/deletes registrados em lead_activity (supabase/migrations/20251109100500_lead_activity_triggers.sql:27–69).
- Ajustes de regra: setar automaticamente `closed_won_at` se status `fechado_ganho` (paridade com useUpdateLead em src/hooks/useLeads.ts:387–395).

## Rastreamento & Auditoria
- Cada lote (`lead_import_batches`) referencia arquivo, mapeamento, usuário e hora.
- Cada linha (`lead_import_rows`) guarda original + normalizado, status, erros, e `lead_id`.
- Integrar com `lead_activity` para criação/deleção automática via triggers.
- Expor histórico de importações por organização, com filtros e detalhes do lote.

## Frontend: UX de Importação
- Atualizar dialog:
  - Suporte a `.ods` além de `.csv/.xlsx/.xls` (src/components/leads/LeadsImportDialog.tsx:612–613).
  - Mapeamento inteligente: já detecta cabeçalhos (LeadsImportDialog.tsx:358–365) e sugere colunas por padrão (LeadsImportDialog.tsx:391–409); acrescentar salvar/aplicar mapeamentos:
    - Botão "Salvar mapeamento"; dropdown "Mapeamentos salvos" (priorizar por `usage_count`).
  - Pré-visualização: manter tabela atual (LeadsImportDialog.tsx:777–796) e estatísticas (LeadsImportDialog.tsx:766–773).
  - Pós-importação: exibir relatório com totais, erros por linha/coluna, links para arquivo fonte e página do lote.
  - Desfazer: botão "Desfazer" para `batch_id`, chamando função `undo-lead-import`.
- Nova página "Histórico de Importações": lista de `lead_import_batches` com filtros (período, usuário), status e acesso aos detalhes.

## Integração Com Arquitetura Existente
- Reutilizar `useActiveOrganization` para escopo (src/components/leads/LeadsImportDialog.tsx:290, src/hooks/useLeads.ts:81–121).
- Invalidar queries relevantes após import/undo: `['leads']`, `['dashboard-summary']`, `['pipeline-metrics']`, etc. (src/hooks/useLeads.ts:360–375).
- UI consistente com shadcn-ui (dialog, select, table, badge) já usados.

## Entregáveis
- Migrations SQL: criação das 3 tabelas, RLS e índices; bucket `lead-imports` e policies.
- 2 Edge Functions: `import-leads` e `undo-lead-import` com validação, transações e relatórios.
- Atualizações de UI:
  - LeadsImportDialog: salvar/aplicar mapeamentos, aceitar ODS, relatório pós-importação e ação de desfazer.
  - Página de histórico e detalhes do lote.

## Testes & Verificação
- Unit: parsing e normalização (número, data, alias de status/prioridade/origem/contrato).
- Integração: import de planilhas de exemplo (CSV/XLSX/ODS) com mapeamentos variados; verificação de inserção em `leads`, logs em `lead_activity`, e registros em `lead_import_*`.
- Regressão: garantir que `useImportLeads` continue funcionando para casos simples ou migrar o fluxo para chamar `import-leads` com relatório.
- Undo: testar bloqueio quando há atividades posteriores; garantir remoção segura e atualização das métricas.

## Segurança & RLS
- Policies limitando acesso por `organization_id` e `auth.uid()`.
- Bucket privado com URLs assinadas; sem exposição de arquivos fora do escopo.
- Sanitização no servidor e cliente; sem logging de dados sensíveis.

## Próximos Passos
- Implementar migrations e Edge Functions.
- Atualizar LeadsImportDialog e adicionar páginas de histórico/detalhes.
- Validar end-to-end com arquivos reais e ajustar mensagens de erro/relatório conforme feedback.