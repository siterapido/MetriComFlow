# Redesign da Aba Metas – InsightFy

Este documento consolida a análise de usabilidade atual, as propostas de navegação, o design visual, os componentes interativos, diretrizes de responsividade, prototipação de alta fidelidade e padrões de design para garantir consistência e evolução sustentável do módulo de Metas.

## 1) Análise de Usabilidade Atual

- Densidade de informação: cartões e formulários concentram muitos campos próximos, com respiros (spacings) inconsistentes em mobile.
- Seleção de métricas: dropdown genérico gera dúvida sobre o que cada KPI representa e quando aplicar filtros de Meta Ads.
- Criação/edição de metas: fluxo linear, porém sem feedbacks de “próximo passo” e sem pré-visualização do impacto (ex.: unidade, exemplo de cálculo, período sugerido).
- Visualização do progresso: falta contexto sobre tendência (melhorando / estável / piorando) e separação clara por categorias (CRM, Meta, Receita, Custom).
- Responsividade: alguns grids de duas colunas em telas pequenas comprimem campos, dificultando a leitura e o toque.

## 2) Novo Fluxo de Navegação e Interação

- Estrutura por abas: Ativas, Concluídas, Todas.
- Agrupamento por categoria: CRM, Meta Ads, Receita, Personalizadas, com subtítulos e contadores.
- Ações em massa: “Atualizar todas” recalcula o progresso para metas conectadas a fontes automáticas.
- Fluxo de criação/edição:
  1. Selecionar o KPI no Seletor Visual (com busca, ícones e descrições).
  2. Definir alvo (metas monetárias, percentuais ou absolutas com unidade visível).
  3. Selecionar período (presets e intervalo customizado).
  4. Aplicar filtros (quando aplicável: conta/campanha Meta, categoria de receita).
  5. Rever e salvar (resumo com unidade e exemplo de cálculo).

## 3) Design Visual Atualizado

- Cores: usar tokens do Design System
  - background, card, border, muted-foreground, foreground.
  - Estados: success, warning, destructive para status “Excelente/Em dia/Atrasado/Crítico”.
- Tipografia:
  - Títulos: font-bold com tracking-tight (ex.: text-3xl na página, text-xl em seções).
  - Corpo: tamanhos coerentes (text-sm para labels/ajudas, text-base para campos).
- Hierarquia visual:
  - Cabeçalhos de seção com ícone + título + badge de quantidade.
  - Cards com títulos curtos, subtítulo/descrição reduzida e KPIs de destaque (valor alvo, progresso, tendência).
  - Botões primários claros e botões de ação secundários consistentes (ícone + rótulo).

## 4) Componentes Interativos

1) Seletor Visual de KPI (GUIA: NOVO_SELETOR_KPIS.md)
   - Busca inteligente por nome e sinônimos.
   - Cartões por KPI com ícone, label, descrição e categoria.
   - Responsivo em grid com 1–3 colunas (mobile → desktop).

2) Cartão de Meta (GoalCard)
   - Cabeçalho com ícone e cor associados ao tipo.
   - Progresso com barra ou anel e valor percentual.
   - Indicador de tendência (↑ está melhorando, → estável, ↓ piorando) quando houver histórico.
   - Ações: editar, excluir, recalcular.

3) Formulário de Meta (GoalFormDialog / NewGoalModal)
   - Layout responsivo (1 coluna no mobile; 2 colunas do sm/md em diante).
   - Campo alvo com unidade contextual (R$, %, número), placeholders de exemplo e step adequado.
   - Período com presets e calendário em popover com bg-card e border-border.
   - Filtros condicionais por tipo de KPI (Meta Ads, Receita).

4) Visualizações de Dados
   - Sparklines por meta (últimos 7/30 dias) para tendência.
   - Mini-cards de sumário (Total, Ativas, Concluídas, Progresso Médio).

## 5) Responsividade

- Grids mobile-first: 1 coluna no mobile, 2 colunas a partir de sm/md; 3 colunas em lg/xl quando houver espaço.
- Diálogos: max-h-[90vh] + overflow-y-auto; padding escalonado (p-4 sm:p-6 lg:p-8).
- Popovers/Selects: bg-card + border-border, largura mínima adequada, rolagem interna quando necessário.

## 6) Protótipos de Alta Fidelidade (em código)

- Página MetasNew (src/pages/MetasNew.tsx): layout com abas, cards categorizados e sumário.
- GoalFormDialog (src/components/goals/GoalFormDialog.tsx): formulário completo com seletor KPI visual.
- NewGoalModal (src/components/goals/NewGoalModal.tsx): modal legado otimizado para responsividade/spacing.

Sugestões de avanço:
- Tornar MetasNew a rota padrão de “/metas” após validação.
- Conectar histórico para sparklines e tendência.

## 7) Padrões de Design para Consistência

- Tokens obrigatórios: bg-card, border-border, text-foreground, text-muted-foreground.
- Densidade: espaçamentos uniformes (gap-4/6), títulos curtos, descrições sucintas.
- Estados: badges e cores de status padronizadas para “Excelente/Em dia/Atrasado/Crítico”.
- Acessibilidade: contraste AA, foco visível, rótulos claros e áreas de toque adequadas.

---

Checklist de Implementação

1. Validar MetasNew e GoalFormDialog com stakeholders.
2. Ativar MetasNew como padrão da rota /metas.
3. Unificar estilos dos diálogos (max-h, overflow, padding, tokens de cor/borda).
4. Adicionar sparklines/tendências.
5. Documentar exemplos de uso (storybook/docs internos).