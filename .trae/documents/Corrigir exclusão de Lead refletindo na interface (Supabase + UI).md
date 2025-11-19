## Diagnóstico
- A exclusão é feita por `useDeleteLead` em `src/hooks/useLeads.ts:480-539`, com atualização otimista e invalidação de `['leads']`.
- Em `LeadEditDialog` o botão “Excluir” usa `deleteLead.mutateAsync(lead.id)` (`src/components/leads/LeadEditDialog.tsx:238-255`).
- Vistas principais dos leads:
  - Kanban clássico: usa `useLeads` (`src/pages/Leads.tsx:82-88`).
  - Kanban horizontal: usa `useLeads` e passa `onDelete` ao `LeadCard` (`src/pages/LeadsLinear.tsx:48-53` e `361-366`). O `LeadCard` não consome `onDelete` (propriedade não utilizada) (`src/components/leads/LeadCard.tsx:54-61, 445-447`).
- Existe um hook `useLeadsByStatus` (`src/hooks/useLeads.ts:582-607`) usado em outras partes do pipeline, mas ele não tem assinatura de realtime e hoje não é invalidado após exclusão.

Conclusão: quando a UI estiver baseada em `useLeads`, a exclusão deveria refletir; porém, se alguma tela usa `useLeadsByStatus`, ela não é atualizada. Além disso, o `onDelete` do `LeadCard` é redundante e pode causar confusão. Também é importante garantir políticas RLS de Supabase para `DELETE`.

## Plano de Correção
1. Invalidação abrangente após exclusão
- Em `useDeleteLead.onSuccess`, além de `['leads']`, invalidar `['leads-by-status']`, `['leads-follow-up']` e `['pipeline-stats']` para cobrir todas as visões do pipeline.
- Em `onSettled`, fazer `refetchQueries` para essas mesmas chaves ativas.

2. Realtime para visão por status
- Adicionar assinatura Supabase em `useLeadsByStatus` (como já existe em `useLeads` em `src/hooks/useLeads.ts:84-95`) para invalidar `['leads-by-status']` em eventos `INSERT/UPDATE/DELETE` na tabela `leads`.

3. UI consistente no cartão
- Remover a prop `onDelete` não utilizada de `LeadCard` ou implementar uma ação de exclusão contextual que chame `useDeleteLead` — manteremos apenas o fluxo central via `LeadEditDialog` para evitar duplicidade.

4. Verificar RLS no Supabase
- Confirmar que a política `DELETE` em `public.leads` permite exclusão para usuários com `organization_id` correspondente e permissão (`permissions.canDeleteLeads`). Caso contrário, ajustar as políticas.

5. Validação
- Testar manualmente nas duas telas de leads (Kanban clássico e horizontal) para garantir que o cartão desapareça imediatamente após excluir.
- Adicionar teste de integração com React Query para verificar remoção otimista e posterior refetch.

## Resultado esperado
- Ao excluir um lead, ele é removido da UI instantaneamente e permanece removido após refetch/realtime, em todas as visões (por status, follow-up e métricas de pipeline).