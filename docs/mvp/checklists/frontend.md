# Checklist de Frontend (Kanban, Relatórios e Admin)

Objetivo: implementar UI/UX para Kanban de Leads, Relatórios por campanha e tela Admin de configuração da conta Meta.

Referências
- docs/mvp/frontend/kanban-ajustes.md
- docs/mvp/relatorios/por-campanha.md
- docs/mvp/metricas/calculos.md

Kanban de Leads
- Exibir novos campos: source, campanha (nome), external_lead_id, closed_won_at, closed_lost_at, lost_reason.
- Transições de status: novo_lead → em_negociacao → proposta_enviada → venda_ganha / venda_perdida.
- Modal obrigatório para lost_reason ao mover para venda_perdida.
- Deduplicação: garantir que cards com mesmo external_lead_id não se duplicam.
- Atualização em tempo real: useLeadIngestion (via realtime/broadcast das Edge Functions).

Hooks e Estado
- Atualizar useLeads com transitionLeadStatus e suporte aos novos campos.
- Criar useLeadIngestion para eventos do webhook.
- Garantir formatação, timezone e consistência com backend.

Relatórios por Campanha
- Tabela com filtros de período; ordenação por ROAS; export CSV.
- Data source: campaign_financials e business_kpis.
- Fallback: usar SUM(campaign_daily_insights.leads_count) se webhooks não estiverem ativos.
- Consistência de período entre Insights e Leads; timezone.

Tela Admin (Configuração)
- Conectar conta (act_id) e acionar importação de campanhas.
- Mostrar estado da integração (tokens ok, assinatura de página, última coleta de insights).
- Nunca expor tokens; operações via backend/Edge.

Qualidade e Acessibilidade
- Estados de carregamento, vazio e erro; toasts/notificações.
- A11y básico e navegação por teclado nas principais interações.

Critérios de Aceite
- Kanban cria/atualiza cards automaticamente com leads Meta.
- Relatórios mostram investimento, leads, vendas, faturamento e ROAS.
- Tela Admin permite conectar conta e visualizar status sem expor segredos.