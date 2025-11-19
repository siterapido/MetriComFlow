## Objetivo
- Reescrever a copy da landing para enfatizar benefícios e conversão.
- Incluir visualizações (gráficos) que reforçam resultados de funil/ROI.
- Preservar padrões de UI/UX existentes (shadcn/ui + Tailwind + Recharts).

## Arquitetura Atual
- Página principal: `src/pages/Index.tsx`.
- Design system: `src/components/ui/*` (shadcn/ui), tema Tailwind em `tailwind.config.ts` e `src/index.css`.
- Gráficos: Recharts com vitrines em `Hero` e `DataVizShowcase`.

## Alterações Principais
- Corrigir CTAs com typo “Contrar” → “Contratar” em:
  - `src/pages/Index.tsx:65`, `src/pages/Index.tsx:106`, `src/pages/Index.tsx:493`.
- Hero (benefícios + conversão):
  - Atualizar headline/subheadline em `src/pages/Index.tsx:95–101` com foco em resultados (leads qualificados, previsibilidade de receita, clareza de ROI).
  - Adicionar lista breve de benefícios (3–4 bullets) abaixo do parágrafo para escaneabilidade.
  - Manter CTAs e tracking `dataLayer` (`lp_hero_cta_click`).
- Seção “Benefícios” dedicada:
  - Nova seção após `Features()` com 3 colunas, copy orientada a resultados (menos esforço operacional, aumento de MQL, decisão rápida, previsibilidade de metas).
  - Utilizar `Card`/`Button` e utilitários `.gradient-card`, `.accent-ring` para consistência visual.
- DataVizShowcase (gráficos focados em conversão):
  - Substituir/expandir exemplos para:
    - Funil de conversão (BarChart: visitas → leads → MQL → vendas).
    - Tendência de ROI/CPA (ComposedChart ou Line + Bar) com tooltip/legend consistentes.
  - Seguir tema (cores via CSS vars) e layout responsivo atual (`ResponsiveContainer`).
- Social proof e microcopy:
  - Reforçar prova social breve (`src/pages/Index.tsx:141–149`) mantendo placeholders/estilo.
  - Microcopy sob CTAs: manter “Sem cartão de crédito para começar” (`src/pages/Index.tsx:556`) e reforçar velocidade de onboarding (`src/pages/Index.tsx:113`).
- Pricing teaser: ajustar copy para conversão em `src/pages/Index.tsx:353–360` (clareza + ação).

## Visual e UX
- Preservar classes utilitárias (`mesh-gradient`, `bg-grid`, `gradient-text`, `gradient-card`).
- Usar componentes shadcn/ui existentes (`Button`, `Card`, `Accordion`, `Tabs`).
- Garantir contraste e hierarquia tipográfica (sem alterar tema base).

## Rastreamento
- Manter `useTracker()` e eventos existentes.
- Adicionar eventos apenas quando novos CTAs forem introduzidos (se aplicável), seguindo o padrão `lp_*`.

## Verificação
- Rodar em desenvolvimento e validar:
  - Responsividade (mobile/desktop) nas novas seções e gráficos.
  - Estilo de tooltips/legendas e integração com tema.
  - Navegação de âncoras (`#como-funciona`, `#recursos`, `#faq`, `#planos`).
  - Eventos `dataLayer` sem erros no console.

## Entregáveis
- Atualização de `src/pages/Index.tsx` com:
  - Hero revisado (copy + bullets).
  - Nova seção “Benefícios”.
  - DataVizShowcase com gráficos de funil e ROI/CPA.
  - CTAs corrigidos e microcopy de conversão.
- Sem mudanças em design system, mantendo a UI/UX atual.