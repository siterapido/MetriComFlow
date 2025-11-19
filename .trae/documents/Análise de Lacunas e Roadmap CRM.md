# Plano Focado: Entidades e Relacionamentos do CRM

## Objetivo

Implementar empresas/contas como entidade própria com múltiplos contatos, separar negócios (deals) de leads e criar pipelines/estágios configuráveis por equipe/produto.

## Escopo por Fase

### Fase 1: Modelagem e Segurança (Banco de Dados)

1. Tabelas

   * `companies`: `id`, `name`, `domain`, `phone`, `address`, `owner_id`, `created_at`, `updated_at`.

   * `contacts`: `id`, `company_id`, `full_name`, `email`, `phone`, `role`, `owner_id`, `created_at` (opcional; alternativa: continuar usando `leads` como contato inicial e evoluir depois).

   * `deal_pipelines`: `id`, `name`, `team_id` (ou organização), `active`.

   * `deal_stages`: `id`, `pipeline_id`, `name`, `position`, `probability`.

   * `deals`: `id`, `company_id`, `contact_id` (ou `lead_id` opcional), `title`, `value`, `stage_id`, `owner_id`, `expected_close_date`, `status` (`open/won/lost`), `source`, `lost_reason`, `created_at`, `updated_at`.

2. RLS e permissões

   * Políticas alinhadas a `has_crm_access` e `is_owner` com escopo por organização/equipe.

   * Funções auxiliares: verificação de pertencimento da entidade à organização do usuário.

3. Migrações e índices

   * Índices por `owner_id`, `company_id`, `stage_id`, `expected_close_date`.

   * Chaves estrangeiras com `ON DELETE SET NULL` para evitar cascatas indesejadas.

### Fase 2: Hooks e UI

1. Hooks

   * `useCompanies`, `useContacts`, `useDealPipelines`, `useDeals`: tipos, filtros (pipeline, estágio, owner, período), CRUD.

2. UI

   * Kanban de `deals` por pipeline com DnD e atualização de `stage_id`/`probability`.

   * Editor de pipelines/estágios (criar/editar/reordenar, probabilidade por estágio).

   * Páginas de detalhes de empresa (lista de contatos, deals, interações, tarefas) e de deal (timeline, tarefas, valor, forecast).

3. Integrações internas

   * Reuso de `interactions` e `tasks` vinculando a `deal_id` e `company_id`.

   * Atualização de dashboards para incluir KPIs de deals (valor por etapa, win rate, ciclo médio).

### Fase 3: Migração de Dados e Consolidação

1. Backfill

   * Criar `companies` a partir de `leads.company` quando presente.

   * Associar `contacts`/`leads` às `companies` criadas.

   * Gerar `deals` iniciais com base em `leads.status` (mapear etapas equivalentes) e `pipeline` padrão.

2. Consolidação

   * Ajustar relatórios para separar funil de `leads` (marketing) do funil de `deals` (vendas) e oferecer visão unificada.

   * Regras de sincronização entre alteração de `lead.status` e `deal.stage` quando ambos existirem (parametrizável).

## Decisões de Design

* Separação clara: `leads` continuam como fonte/qualificação; `deals` representam oportunidades monetizáveis.

* Multi-pipeline: permitir pipelines por equipe/produto com estágios e probabilidades independentes.

* Flexibilidade: `contact_id` opcional em `deals` para suportar tanto `contacts` quanto leads durante transição.

## Impacto em Módulos Existentes

* `interactions` e `tasks`: adicionar chaves opcionais `company_id` e `deal_id` para vinculação contextual.

* KPIs/Dashboards: novas views `deal_metrics`, `deal_forecast`, `deal_stage_conversion` e adaptação do dashboard principal.

* Permissões: reuso de funções de acesso CRM; políticas específicas para pipelines e estágios.

## Métricas de Sucesso

* Adoção: % deals criados vs leads qualificados; uso do editor de pipelines.

* Performance: win rate por pipeline/estágio, ciclo de vendas, valor médio de deal.

* Qualidade: consistência de links entre empresas, contatos, deals, interações e tarefas.

## Próximo Passo

* Após aprovação, detalho as migrações SQL e esqueleto de hooks/UI da Fase 2 para iniciar a implementação com PRs incrementais.

