# Ajustes no Kanban (Gestão de Vendas)

Colunas do Funil
- `novo_lead` → `em_negociacao` → `proposta_enviada` → `venda_ganha` | `venda_perdida`

Campos no Card
- Valor do Contrato (R$): obrigatório/sempre visível e editável.
- Origem: `source` (meta_ads/manual).
- Campanha: `campaign_id` (se meta_ads), exibir nome da campanha.
- Fechamento: `closed_won_at`/`closed_lost_at` e `lost_reason` (capturar ao mover para coluna final).

Comportamentos
- Ao mover para `venda_ganha`: preencher `closed_won_at` (now).
- Ao mover para `venda_perdida`: abrir modal para `lost_reason` e preencher `closed_lost_at`.
- Ao criar lead via Meta Ads: criar automaticamente card em `novo_lead` com `source='meta_ads'` e campanha atribuída.
  - Origem: Webhook `leadgen` (Página assinada) → Edge Function persiste e emite evento para frontend.
  - Detalhes adicionais podem ser obtidos via `GET /{LEAD_ID}?fields=field_data,created_time` se necessário.
  - Deduplicação: usar `external_lead_id` (ID do lead no Meta) para evitar duplicados.

Permissões
- Vendedor: pode editar `status` e `value` nos leads próprios/atribuídos.
- Admin: pode alterar tudo.

Hooks
- `useLeads`: adicionar métodos `transitionLeadStatus` (preenche datas/razões) e suporte a novos campos.
 - `useLeadIngestion`: receber eventos de criação automática (via subscription/socket) e hidratar o Kanban.