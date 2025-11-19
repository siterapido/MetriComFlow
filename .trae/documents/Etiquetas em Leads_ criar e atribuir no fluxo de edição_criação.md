## Visão Geral
- Objetivo: permitir criar novas etiquetas (labels) e atribuí-las aos leads diretamente nos modais de “Editar Lead” e “Novo Lead”, além de selecionar/remover etiquetas existentes.
- Contexto atual: já existe relação N:N `lead_labels` e listagem/atribuição via UI, mas não há criação inline de etiquetas dentro desses modais.

## Banco de Dados
- Tabelas existentes: `labels` e `lead_labels` com escopo por `organization_id`.
- RLS: políticas já escopam por organização; nenhuma alteração necessária.
- Referências: migrações criam índices e FKs; funcionamento OK.

## Hooks (Backend client)
- Reutilizar hooks existentes:
  - `useLabels` para listar etiquetas por organização (`src/hooks/useLabels.ts:12`).
  - `useCreateLabel` para criar etiqueta (`src/hooks/useLabels.ts:37`).
  - `useAddLabelToLead` e `useRemoveLabelFromLead` para vincular/desvincular (`src/hooks/useLabels.ts:68`, `src/hooks/useLabels.ts:106`).

## Alterações de UI
- `LeadEditDialog.tsx`:
  - Inserir bloco “Nova etiqueta” abaixo da seção de etiquetas (`src/components/leads/LeadEditDialog.tsx:451`):
    - Campo `Input` para nome da etiqueta e `Button` “Criar etiqueta”.
    - Ao criar, usar `useCreateLabel.mutateAsync({ name })`; na `onSuccess`, invalidar `labels` e adicionar a nova etiqueta em `selectedLabels`.
    - Prevenir duplicatas pelo nome (case-insensitive). Feedback via `toast`.
  - Manter o grid de badges para selecionar/remover; já presente.
- `NewLeadModal.tsx`:
  - Inserir bloco idêntico “Nova etiqueta” na área de etiquetas (`src/components/leads/NewLeadModal.tsx:426`).
  - Após criar, adicionar a nova etiqueta a `selectedLabels` para criar o lead já etiquetado.

## Validações e UX
- Validação: nome obrigatório, comprimento razoável (ex.: 1–40 chars), impedir duplicatas por nome dentro da organização.
- Estado: desabilitar botão durante criação, mostrar `Loader2` quando aguarda.
- Feedback: `toast` de sucesso/erro; tratar mensagens de RLS/permissão.
- Seleção automática: ao criar, a etiqueta recém-criada deve aparecer e ficar selecionada.

## Segurança & Multi-tenant
- `useCreateLabel` já injeta `organization_id` ativo (`src/hooks/useLabels.ts:45–48`).
- Atribuição/desatribuição em `lead_labels` valida que o lead pertence à organização (`src/hooks/useLabels.ts:76–85`).

## QA & Critérios de Aceite
- Criar etiqueta no modal “Editar Lead” e vê-la selecionada imediatamente.
- Criar etiqueta no modal “Novo Lead” e após salvar, o lead surge com a etiqueta.
- Reabrir o lead: as etiquetas persistem e podem ser removidas/novas adicionadas.
- RLS: usuários fora da organização não conseguem criar/atribuir etiquetas nessa organização.

## Implementação Técnica
- Pontos de inserção:
  - `LeadEditDialog.tsx`: abaixo da lista de badges de etiquetas (`src/components/leads/LeadEditDialog.tsx:451–474`).
  - `NewLeadModal.tsx`: abaixo da lista de badges de etiquetas (`src/components/leads/NewLeadModal.tsx:426–451`).
- Integrações:
  - Importar `useCreateLabel` em ambos.
  - Gerenciar estado local para `newLabelName`, `isCreatingLabel` e atualização de `selectedLabels`.

## Plano de Teste Manual
- Fluxo de criação: criar 2 etiquetas com nomes distintos; verificar deduplicação por nome.
- Fluxo de atribuição: selecionar múltiplas etiquetas, salvar, reabrir lead.
- Multi-tenant: alternar organização ativa e verificar isolamento das etiquetas.

Confirma que podemos executar essas alterações? Após aprovação, implemento as mudanças nas duas telas e valido com teste manual.