# MVP: Painel de Controle Comercial via Meta Ads

Este diretório contém o planejamento técnico e funcional para evoluir o sistema atual para um MVP focado em donos de empresas, conectando investimento em Meta Ads ao resultado comercial e de vendas.

Escopo do MVP:
- Conectar marketing ao caixa da empresa (métricas de negócio: leads, vendas, faturamento, ROAS).
- CRM Kanban com jornada do lead: Novo Lead → Em Negociação → Proposta Enviada → Venda Ganha/Venda Perdida.
- Metas de negócio (faturamento, ROAS, novos clientes) e acompanhamento em tempo real.
- Relatórios por campanha (Investimento, Leads, Vendas, Faturamento, ROAS).
- Gestão de equipe com papéis e permissões (Admin, Vendedor).

Estrutura da documentação:
- analise/ — visão do sistema e banco atuais
- base-de-dados/ — modelo de dados proposto e migrações
- especificacoes/ — especificações dos módulos do MVP
- integracoes/ — integração com Meta Ads
- seguranca/ — RLS, permissões e segredos/ambiente
- plano/ — roadmap, backlog e marcos

Leituras recomendadas:
1) analise/arquitetura-atual.md
2) analise/banco-atual.md
3) base-de-dados/modelo-de-dados.md
4) especificacoes/dashboard.md, crm-kanban.md, relatorios-por-campanha.md
5) integracoes/meta-ads.md
6) seguranca/rls-e-permissoes.md e seguranca/segredos-e-ambiente.md
7) plano/roadmap.md e plano/backlog.md