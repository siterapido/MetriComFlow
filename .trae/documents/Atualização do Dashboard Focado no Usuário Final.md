**Objetivo**

* Simplificar o dashboard para decisões do usuário final, mostrando apenas KPIs e tendências acionáveis.

* Remover qualquer referência a configurações internas, termos técnicos e status de backend.

**Escopo e Remoções**

* Remover blocos/links de configuração e status interno: `AutoSyncStatus`, `OrganizationSyncStatus`, prompts técnicos de conexão.

* Ocultar botões e mensagens administrativas (ex.: rotas/redirecionamentos para `meta-ads-config`).

* Não exibir logs, estados de processos, IDs técnicos ou mensagens de erros de backend.

**Conteúdo Prioritário**

* KPIs principais: `Investimento`, `Leads`, `CPL`, `Taxa de Conversão`, `ROAS`, `Receita` (quando houver CRM), `Ticket Médio`.

* Tendências diárias com comparação (média móvel, variação WoW) e destaques de alta/baixa performance.

* Visão por `Conta` e `Campanha`; evitar granularidade técnica (ad set/ad) no painel principal.

**Design e UX**

* Layout limpo com hierarquia: cards de KPIs em destaque no topo, gráfico de tendência central, tabelas resumidas abaixo.

* Responsividade via `ResponsiveContainer` (Recharts) e grid do sistema de UI (shadcn).

* Tipografia e espaçamentos consistentes; cores neutras com realces apenas para variações relevantes.

**Interações**

* Filtros simples: `Período` (Últimos 7/30 dias, Mês atual, Customizado), `Conta`, `Campanha`.

* Tooltips com explicações claras para métricas complexas (definições e fórmula amigável).

* Exportar relatório básico (CSV) do conjunto atual: KPIs agregados e série diária filtrada.

**Qualidade de Dados e Estado**

* Atualização próxima ao tempo real: manter canais Supabase para `leads` e `campaign_daily_insights`; oferecer botão `Atualizar` manual.

* Indicadores de carregamento: skeletons/spinners em cards, gráficos e tabelas enquanto `isFetching`.

* Tratamento de ausência de dados: estados vazios com mensagens úteis e orientação para ajustar filtros.

**Implementação Técnica (Arquivos)**

* `src/pages/Dashboard.tsx`:

  * Substituir blocos técnicos por KPIs essenciais e gráfico de tendência unificado (`useUnifiedMetrics`, `useUnifiedDailyBreakdown`).

  * Integrar filtros simples (período/conta/campanha) usando `MetaAdsFiltersV2`/`date-range-picker`.

  * Remover `AutoSyncStatus`/`OrganizationSyncStatus` e quaisquer mensagens administrativas.

* `src/pages/MetricsPage.tsx`:

  * Consolidar para visão focada em usuário: KPIs, tendência diária, tabela resumida por campanha.

  * Adicionar botão `Exportar CSV` do dataset atual (client-side ou via função Edge).

  * Padronizar tooltips em `MetricsCardGroup` e gráficos.

* `src/pages/TrafficMetrics.tsx`:

  * Manter como visão secundária; esconder por padrão no menu principal ou simplificar tabs para `overview`.

* Componentes:

  * `src/components/dashboard/*`, `src/components/meta-ads/*`:

    * Adicionar tooltips amigáveis nos cards (`MetaAdsKPICards`, `UnifiedROICards`, `MetricsCardGroup`).

    * Garantir responsividade em `*Chart.tsx` com containers flexíveis.

  * Filtros:

    * Reutilizar `MetaAdsFiltersV2` e `date-range-picker` (`src/components/ui/date-range-picker.tsx`) com presets simples.

  * Exportação:

    * Implementar utilitário `buildMetricsCsv(dataset)` e botão de download; opcionalmente, adicionar suporte `format=csv` na função `get-metrics` para export server-side.

**Dados e Hooks**

* Reutilizar `src/hooks/useUnifiedMetrics.ts` para KPIs integrados e série diária.

* Reutilizar `src/hooks/useDashboard.ts` e `src/hooks/useMetaMetrics.ts` para agregações e filtros.

* Manter canais Supabase de real-time; refetch com `react-query` e throttle para UX estável.

**Cópia e Linguagem**

* Substituir termos técnicos por linguagem clara:

  * "CPL" → manter sigla com tooltip;

  * "ROAS" → manter sigla com tooltip;

  * Evitar "ad set", "RLS", "sync", "edge".

* Mensagens de estados: orientadas à ação (ajuste filtros, conecte uma conta), sem jargão.

**Verificação**

* Testes manuais:

  * Diferentes períodos e seleção de conta/campanha; verificar KPIs e gráficos.

  * Estados sem dados e carregamento.

  * Exportação CSV contendo cabeçalhos amigáveis e dados consistentes com a tela.

* Validação de responsividade: breakpoints mobile, tablet, desktop.

* Real-time: criar/atualizar `leads` e `campaign_daily_insights` de teste e verificar atualização.

**Critérios de Aceite**

* Nenhuma referência a configurações internas, status de backend ou opções administrativas no dashboard.

* Apenas KPIs e visualizações diretamente úteis ao trabalho diário, com filtros simples e tooltips.

* Exportação básica funcional do conjunto filtrado.

* UX responsiva, clara e com estados de carregamento/sem dados elegantes.

