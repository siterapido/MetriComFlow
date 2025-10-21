# MVP: Painel de Controle Comercial + Meta Ads

Este diretório consolida as decisões técnicas e funcionais do MVP que conecta investimento em Meta Ads aos resultados comerciais do CRM Metricom Flow.

Escopo validado:
- Conectar gastos de campanha ao pipeline de vendas (leads, negociações, faturamento, ROAS).
- CRM Kanban com jornada expandida do lead e ferramentas de follow-up (tarefas, interações, checklists).
- Relatórios e métricas consolidados por campanha/conta de anúncios.
- Governança de usuários (owner, traffic_manager, sales) com RLS e rotas protegidas.

Pastas e referências principais:
- `analise/` — estado atual do frontend e do banco (atualizado para 2025-02).
- `base-de-dados/` — modelo relacional final, campos novos em `leads` e tabelas de Meta Ads, além do histórico de migrações.
- `checklists/` — listas de verificação por área (frontend, integrações, QA, DevOps).
- `frontend/` — guias de UI/UX para Kanban comercial e fluxos associados.
- `integracoes/` — integrações com a Graph API (OAuth, webhooks, insights).
- `metricas/` e `relatorios/` — fórmulas de negócio, views e expectativas das telas.
- `seguranca/` — políticas de RLS, uso de secrets e requisitos de compliance.

Ordem sugerida de leitura:
1. `analise/arquitetura-atual.md` e `analise/banco-atual.md` para entender o estado de base.
2. `base-de-dados/modelo-de-dados.md` e `base-de-dados/migracoes-propostas.sql` para ver o alvo do schema.
3. `integracoes/meta-ads.md` para entender fluxos de conexão, ingestão e cron jobs.
4. `frontend/kanban-ajustes.md`, `relatorios/por-campanha.md` e `metricas/calculos.md` para alinhar UX + métricas.
5. `seguranca/permissoes-e-rls.md` e `seguranca/segredos-e-config.md` para garantir o hardening.
6. `checklists/implementacao-mvp.md` para o plano integrado e rastreio de execução.
