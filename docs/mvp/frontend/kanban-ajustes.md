# Ajustes do Kanban Comercial

Objetivo: garantir que o board em `src/pages/Leads.tsx` reflita o funil oficial, exiba os novos campos de CRM e mantenha paridade com o backend.

## Colunas e transições
- Ordem: `novo_lead` → `qualificacao` → `proposta` → `negociacao` → `follow_up` → `aguardando_resposta` → `fechado_ganho` / `fechado_perdido`.
- Transições para `fechado_ganho` devem preencher `closed_won_at` automaticamente.
- Transições para `fechado_perdido` exigem modal com captura obrigatória de `lost_reason` + preenchimento de `closed_lost_at`.
- Mudanças de coluna atualizam `lead_activity` (já suportado pela trigger); exibir timeline com a descrição amigável.

## Campos a surfacear no card
- Cabeçalho: título + valor (`value`) em destaque.
- Badges secundárias:
  - `priority` (mapear `low|medium|high|urgent` → cores).
  - `source` (exibir ícones para Meta Ads vs outros).
  - `campaign_id` (nome da campanha quando existir).
  - `lead_score` e `conversion_probability` quando > 0.
- Metadados: `next_follow_up_date`, `last_contact_date`, responsável (`assignee_id`), contadores (`comments_count`, `attachments_count`, `interactions_count`, `tasks_count`).

## UX complementar
- Modal de criação/edição deve expor `product_interest`, `lead_source_detail`, `expected_close_date`, `priority`, `lead_score`.
- Adicionar quick-actions no card: marcar follow-up conclúido (atualiza `last_contact_date`), criar tarefa rápida (`tasks`).
- Filtros: manter `search`, `source`, adicionar `priority` e `assignee_id` usando hooks já disponíveis em `useLeads`.
- Considerar toast específico quando lead for criado a partir do webhook (`source === 'meta_ads'`).

## Hooks e estado
- Atualizar `LeadStatus` em `useLeads.ts` para usar o mesmo conjunto de status do banco.
- Implementar `transitionLeadStatus` em `useLeads` para encapsular atualização + datas + motivo de perda.
- Garantir que o canal Realtime invalida `interactions` e `tasks` além de `leads`.
- Avaliar `useLeadIngestion` para assinar broadcast das Edge Functions (`webhook-lead-ads`) e inserir cards sem refresh.

## Acessibilidade e fallback
- Estados de loading/erro já padronizados (`Card` com `Loader2`). Expandir para mensagens específicas quando a sessão expirar (já iniciado em `Leads.tsx`).
- Suporte a teclado: permitir mover cards com atalhos (opcional de fase 2).
- Responsividade: manter layout single-column <768px, hide metadata por padrão e mostrar em modal.
