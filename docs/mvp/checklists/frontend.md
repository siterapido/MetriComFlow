# Checklist de Frontend (Kanban, Relatórios e Admin)

Objetivo: implementar UI/UX para Kanban de Leads, Relatórios por campanha e tela Admin de configuração da conta Meta.

Referências
- docs/mvp/frontend/kanban-ajustes.md
- docs/mvp/relatorios/por-campanha.md
- docs/mvp/metricas/calculos.md

Kanban de Leads
- Exibir campos: source, campanha (nome), priority, lead_score, next_follow_up_date, external_lead_id, closed_won_at, closed_lost_at, lost_reason.
- Transições: `novo_lead → qualificacao → proposta → negociacao → follow_up → aguardando_resposta → fechado_ganho` / `fechado_perdido`.
- Modal obrigatório para `lost_reason` ao mover para `fechado_perdido`; toast de sucesso para `fechado_ganho`.
- Deduplicação: manter checagem de `external_lead_id` ao inserir (exibir badge “Lead Meta”).
- Atualização em tempo real: usar canal Realtime já criado (`realtime-leads`) e planejar `useLeadIngestion` para eventos Webhook.

Hooks e Estado
- Atualizar useLeads com transitionLeadStatus e suporte aos novos campos.
- Criar useLeadIngestion para eventos do webhook.
- Garantir formatação, timezone e consistência com backend.

Relatórios por Campanha
- `MetricsPage` deve suportar filtros (conta, campanha, período), ordenação customizável (ROAS/Faturamento) e export CSV.
- Fonte de dados: `campaign_financials`; fallback `SUM(campaign_daily_insights.leads_count)` quando leads não vinculados.
- Garantir alinhamento de timezone/período entre insights e leads (helpers `getLastNDaysDateRange`).

Tela Admin (Configuração)
- Fluxo Meta (`MetaAdsConfig`) precisa listar conexões, contas ativas/inativas, última sincronização e status dos webhooks.
- Acionar manualmente `sync-daily-insights` (refresh) e gerenciamento de apelidos das contas.
- Nunca expor tokens; todas as chamadas passam por Edge Functions.

Qualidade e Acessibilidade
- Estados de carregamento, vazio e erro; toasts/notificações.
- A11y básico e navegação por teclado nas principais interações.

Critérios de Aceite
- Kanban cria/atualiza cards automaticamente com leads Meta.
- Relatórios mostram investimento, leads, vendas, faturamento e ROAS.
- Tela Admin permite conectar conta e visualizar status sem expor segredos.
