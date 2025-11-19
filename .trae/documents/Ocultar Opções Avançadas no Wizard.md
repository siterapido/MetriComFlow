## Objetivo
- Deixar as opções avançadas ocultas por padrão na Etapa 1 e exibir somente quando o usuário clicar em “Mostrar mais opções”.

## Mudanças
- `src/components/leads/LeadsImportDialog.tsx`:
  - Adicionar estado `showAdvanced` (boolean) com valor inicial `false`.
  - Botão “Mostrar mais opções” quando oculto e “Ocultar opções” quando visível.
  - Renderizar a seção de opções avançadas apenas quando `showAdvanced` for `true`.

## Verificação
- Ao abrir o diálogo, apenas os quatro campos mínimos aparecem.
- Clicar em “Mostrar mais opções” expande os campos adicionais.
- O estado se mantém ao navegar entre etapas (não perde mapeamentos).

Confirma aplicar essas alterações agora?