# Métricas Meta Ads – Área de Relatórios

Este documento descreve a nova experiência da página `MetricsPage`, reproduzindo a visão de métricas Meta Ads inspirada no dashboard Looker Studio compartilhado com a equipe.

## Estrutura do Front-end

- **Serviço tipado** `src/lib/metaMetrics.ts` consolida contratos (`MetaSummary`, `MetaCreativePerformance`, etc.). No momento os dados são mockados para desenvolvimento, mas a assinatura é assíncrona para permitir a troca por Supabase ou API quando disponível.
- **Hooks React Query** em `src/hooks/useMetaMetricsV2.ts` padronizam o consumo desses contratos e aceitam filtros (`period`, `campaignId`, `dateRange`).
- **Componentes visuais dedicados** ficam em `src/components/metrics/meta/`:
  - `MetricsCardGroup` → cartões de métricas principais/custo.
  - `EngagementFunnel` → funil de engajamento (salvar, compartilhar, comentar).
  - `CreativeInvestmentChart` → gráfico combinado (impressões vs. unique CTR).
  - `CampaignOverviewTable` → tabela detalhada por campanha.
  - `InvestmentByDayPie` → pizza de investimento por dia.
  - `InvestmentTrendChart` → série temporal de investimento e unique CTR.
- **Página** `src/pages/MetricsPage.tsx` integra filtros (período, campanha), gere estados de loading e mantém o gate quando a conta Meta não está conectada.

## Como trocar os mocks por dados reais

1. Substituir as funções `fetchMetaSummary`, `fetchCreativeRanking`, `fetchCampaignOverview`, `fetchInvestmentTimeline` e `fetchInvestmentSlices` para ler da fonte oficial (Supabase, API REST ou data warehouse).
2. Respeitar a forma do contrato exposto pelo serviço para evitar refatorações na UI.
3. Preencher os filtros (`period`, `campaignId`, `dateRange`) no lado do serviço para filtrar ainda no backend.
4. Remover/ajustar os `delay` artificiais após integração.

## Próximos passos sugeridos

1. Implementar métricas adicionais no serviço (ROAS, CPA, Taxa de Conversão das mensagens) conforme recomendado no relatório.
2. Habilitar comparação com período anterior nos cartões (já previsto no layout antigo via `MetaAdsKPICards`).
3. Acrescentar automações: alerta de custo por lead acima do target e envio programado de PDF/Slack ao termino da atualização diária.
4. Expandir o contexto `MetaMetricsFilters` para contemplar device (`desktop`, `mobile`) e replicar a navegação por tabs do Looker Studio quando os dados estiverem disponíveis.

## Observações

- O carimbo “Data da última atualização” usa `formatDateTime` e lê o valor do serviço; garanta que o backend exponha esse timestamp.
- O gate de conexão (`useMetaConnectionStatus`) continua exigindo que o usuário conecte a conta Meta antes de renderizar os dados.
- Rodar `npm run lint` antes de abrir PR; os novos componentes seguem o padrão do projeto (Tailwind layout → spacing → cor).
