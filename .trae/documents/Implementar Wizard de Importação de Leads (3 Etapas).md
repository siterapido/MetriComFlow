## Visão Geral
- Refatorar o diálogo atual para um wizard com três etapas claras, validado em tempo real e com pré-visualização antes da importação. Manter compatibilidade com o schema atual sem exigir migrations adicionais.

## Etapa 1 — Básica (padrão)
- Campos mínimos a mapear: `nome`, `email`, `telefone`, `origem`.
- UI:
  - Cabeçalho com progresso: “Etapa 1 de 3”.
  - Layout limpo: apenas 4 selects de mapeamento.
  - Botão “Mostrar mais opções” (Accordion/Collapsible) que expande campos adicionais já existentes (status, valor, prioridade, datas, contrato, produto, campanha, IDs externos).
- Validação (zod + react-hook-form):
  - `nome` obrigatório (mapeado para `title`).
  - `email` com validação de formato.
  - `telefone` com validação BR (utilitários existentes).
  - `origem` obrigatória quando sem default.

## Etapa 2 — Origem (Meta Ads)
- UI:
  - Progresso: “Etapa 2 de 3”.
  - Toggle “Lead veio de Meta Ads”.
  - Campos:
    - `${campaign_id}` (ID campanha)
    - `${adset_id}` e `${adset_name}`
    - `${ad_id}` e `${ad_name}`
- Dados:
  - IDs são priorizados para relacionamento existente.
  - `adset_name` e `ad_name` (opcionais) enriquecem `lead_source_detail` ou comentário estruturado sem alterar schema.

## Etapa 3 — Pré-visualização e Importar
- UI:
  - Progresso: “Etapa 3 de 3”.
  - Tabela com amostra das primeiras linhas e contagens (detectadas/prontas/ignoradas/erros).
  - Ações:
    - “Importar” (modo `full`).
    - “Importar e avançar” (modo `basic_only` para gravar mínimos e abrir drawer de edição rápida).

## Backend — Edge Function
- `supabase/functions/import-leads/index.ts`:
  - Adicionar parâmetro `mode`: `basic_only` | `full`.
  - No `basic_only`: enviar apenas mínimos (nome→title; email/telefone armazenados diretamente se houver colunas; caso contrário, adicionar no `lead_source_detail` / `description` com prefixos estruturados).
  - Se `adset_name`/`ad_name` forem enviados, concatenar em `lead_source_detail` (ex.: `adset: X; ad: Y`).
  - Validar mínimos e manter normalização atual (números, datas, percentuais, aliases).

## Frontend — Implementação
- Refatorar `src/components/leads/LeadsImportDialog.tsx` em wizard:
  - Estado de etapa (`step=1|2|3`), barra de progresso (Stepper), Accordion para “Mostrar mais opções”.
  - Form control com `react-hook-form` + `zodResolver` por etapa.
  - Botões “Próximo/Voltar”; “Importar/Importar e avançar”.
- Hooks:
  - Extender `useImportLeadsWithReport` para aceitar `mode`.
  - Reusar `useLeadImportMappings` para salvar/aplicar mapeamentos (
    - foco nos mínimos e extras quando expandido).
- Drawer de edição rápida (pós-importação): componente leve para complementar status/valor, prioridade, datas.

## Verificação
- Unit: zod mínimos, validação de e-mail/telefone, alias de origem.
- Integração: CSV/XLSX/ODS com casos mínimos e completos; `basic_only` vs `full`.
- UI: navegação entre etapas, pré-visualização e relatório, fluxo “Importar e avançar”.

## Entregáveis
- Wizard 3 etapas em `LeadsImportDialog` com progresso e validação.
- Edge Function com `mode` e enriquecimento de `lead_source_detail`.
- Drawer de edição rápida pós-importação com resumo e ação editar.

## Observações
- Nenhuma migration adicional necessária; compatível com o schema atual.
- Futuro (opcional): adicionar colunas `name/email/phone` em `leads` para evitar o uso de `description/lead_source_detail`.

Confirma prosseguir com essa implementação para que as alterações fiquem visíveis no diálogo?