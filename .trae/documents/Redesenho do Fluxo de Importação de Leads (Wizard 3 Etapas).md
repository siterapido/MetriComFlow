## Objetivo
- Simplificar e tornar mais guiada a importação de planilhas de leads com um wizard em 3 etapas, focando mínimos campos essenciais, origem Meta Ads e confirmação/edição pós-importação.

## Arquitetura de UI (React + shadcn-ui)
- Atualizar `LeadsImportDialog` para um wizard com Stepper:
  - Etapa 1: Básica (padrão)
    - Campos mínimos a mapear: `nome`, `email`, `telefone`, `origem`.
    - Layout limpo com os quatro mapeamentos visíveis e botão "Mostrar mais opções" que expande campos extras (status, valor, prioridade, datas, contrato, produto, campanha/IDs etc.).
    - Validação em tempo real com `zod` + `react-hook-form` (e-mail válido, telefone BR, origem obrigatória quando não definida por padrão).
  - Etapa 2: Origem (Meta Ads)
    - Toggle: "Lead veio de Meta Ads".
    - Se ativo: seções para mapear `campaign_id` (ID campanha), `adset_id` + `adset_name`, `ad_id` + `ad_name`.
    - Observação: `adset_name` e `ad_name` serão opcionais; se informados, usados para exibir e enriquecer o lead (armazenar em `lead_source_detail` ou como comentário, sem quebrar schema atual). IDs prevalecem para relacionamento.
  - Etapa 3: Pré-visualização e Importar
    - Tabela com amostra das primeiras linhas e resumo (detectadas/prontas/ignoradas/erros).
    - Ações: "Importar" e "Importar e avançar" (importa básicos e abre painel de edição rápida).
    - Indicar progresso visual: "Etapa 1 de 3", "Etapa 2 de 3", etc.

## Validação e Normalização
- Frontend:
  - `zod` schema para mínimos: `nome` obrigatório (ou mapeado para `title`), `email` válido, `telefone` válido (utilitários BR existentes), `origem` obrigatória.
  - Campos adicionais seguem normalização existente (números, datas, percentuais, enums, aliases).
- Backend:
  - Extender Edge Function `import-leads` para aceitar modo: `basic_only` ou `full`.
    - `basic_only`: insere somente mínimos (mapeia `nome` para `title` quando table não tiver `name`), `email`/`phone` se o schema suportar; caso não, salvar como `description`/`lead_source_detail` de forma estruturada.
    - `full`: mantém comportamento atual (insere tudo que vier), mas aplica validação adicional dos mínimos.
  - Caso `adset_name`/`ad_name` sejam enviados, registrar como metadados (ex.: `lead_source_detail="adset: X; ad: Y"`).

## Pós-importação (UX)
- Feedback:
  - Toast e cartão de sucesso com contagem importada/ignoradas/erros.
  - Botão "Editar rapidamente" que abre um drawer com edição inline para o lote (campos complementares).
- Histórico:
  - Continuar registrando em `lead_import_batches` e `lead_import_rows`; exibir nomes de ad set/ad quando presentes no detalhe.

## Compatibilidade de Dados
- Sem quebra de schema:
  - Mapear `nome` → `title` quando `leads.name` não existir.
  - `email`/`telefone`:
    - Se o schema atual contiver `email`/`phone`, inserir diretamente.
    - Se não, salvar em `description` com prefixos estruturados (ex.: `email:`, `phone:`) ou em `lead_source_detail`.
- Opcional futuro (não bloqueante):
  - Adicionar colunas `name`, `email`, `phone` em `leads` via migration, se desejado. Nesta entrega, mantemos compatível.

## Alterações Técnicas Planejadas
- UI:
  - `src/components/leads/LeadsImportDialog.tsx`: refatorar para wizard com Stepper, novo estado de etapas, validação incremental, botão "Mostrar mais opções".
  - Componentes auxiliares: `BasicStep`, `MetaAdsStep`, `PreviewStep` (organização interna).
- Hooks:
  - Reusar `useLeadImportMappings` para salvar/aplicar mapeamentos, focando nos mínimos.
  - `useImportLeadsWithReport`: adicionar `mode` (`basic_only`|`full`) no body.
- Edge Function:
  - `supabase/functions/import-leads/index.ts`: aceitar `mode`, enriquecer `lead_source_detail` com `adset_name`/`ad_name` quando presentes, reforçar mínimos.

## Fluxo do Usuário
1. Seleciona arquivo e vê mapeamento dos 4 mínimos.
2. Opcionalmente marca "Meta Ads" e preenche IDs e nomes.
3. Pré-visualiza e escolhe "Importar" ou "Importar e avançar".
4. Vê confirmação, resumo e opção de edição rápida.

## Testes e Verificação
- Unit: validação `zod` dos mínimos, normalização de telefone/e-mail, alias origem.
- Integração: CSV/XLSX/ODS com colunas diversas; validar `basic_only` vs `full`.
- UI: navegação entre etapas, progresso, pré-visualização e relatório.

## Entregáveis
- UI wizard implementado no diálogo de importação.
- Edge Function com `mode` e suporte a nomes Meta Ads.
- Mensageria pós-importação e edição rápida.

Confirma prosseguir com essa implementação? A abordagem não quebra o schema atual e permite evoluir para campos dedicados (`name/email/phone`) em uma fase posterior se necessário.