# Importação de Leads - Desabilitada Temporariamente

A funcionalidade de importação de leads foi desabilitada temporariamente para refatoração posterior.

## Arquivos Afetados

### Frontend
- `src/components/leads/LeadsImportDialog.tsx` - Componente de diálogo de importação (mantido, mas não usado)
- `src/hooks/useLeadImports.ts` - Hook de importação (mantido, mas não usado)
- `src/pages/LeadImports.tsx` - Página de listagem de importações (mantido, mas não usado)
- `src/pages/LeadImportDetails.tsx` - Página de detalhes de importação (mantido, mas não usado)

### Backend
- `supabase/functions/import-leads/index.ts` - Edge function de importação (mantida, mas não chamada)
- `supabase/functions/undo-lead-import/index.ts` - Edge function para desfazer importação (mantida, mas não chamada)

## O que foi removido/comentado

1. **Botões de importação** removidos de:
   - `src/pages/Leads.tsx`
   - `src/pages/LeadsLinear.tsx`

2. **Rotas desabilitadas** em `src/App.tsx`:
   - `/leads/importacoes`
   - `/leads/importacoes/:batchId`

3. **Componentes comentados**:
   - `LeadsImportDialog` removido do JSX das páginas de leads

## Como restaurar

1. Descomentar os imports em `src/pages/Leads.tsx` e `src/pages/LeadsLinear.tsx`
2. Descomentar o estado `isImportOpen` nas páginas
3. Descomentar os botões de importação
4. Descomentar o componente `LeadsImportDialog` no JSX
5. Descomentar as rotas em `src/App.tsx`
6. Adicionar de volta o ícone `Upload` nos imports do lucide-react

## Notas

- Todos os arquivos foram mantidos para facilitar a restauração
- A edge function `import-leads` ainda existe e pode ser chamada diretamente se necessário
- As tabelas do banco de dados (`lead_import_batches`, `lead_import_rows`, `lead_import_mappings`) foram mantidas


