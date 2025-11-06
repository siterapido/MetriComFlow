import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AdSetPerformanceTable } from "@/components/metrics/AdSetPerformanceTable";
import { AdPerformanceTableV2 } from "@/components/metrics/AdPerformanceTableV2";
import { EngagementFunnel } from "@/components/metrics/meta/EngagementFunnel";
// import { CreativeInvestmentChart } from "@/components/metrics/meta/CreativeInvestmentChart";
import { CampaignOverviewTable } from "@/components/metrics/meta/CampaignOverviewTable";
// import { InvestmentByDayPie } from "@/components/metrics/meta/InvestmentByDayPie";
import { MetricsCardGroup } from "@/components/metrics/meta/MetricsCardGroup";
import { InvestmentTrendChart } from "@/components/metrics/meta/InvestmentTrendChart";
// import { CreativeGrid } from "@/components/metrics/meta/CreativeGrid";
import {
  useMetaCampaignOverview,
  // useMetaCreativeRanking,
  // useMetaInvestmentSlices,
  // useMetaInvestmentTimeline,
  // useMetaSummary,
} from "@/hooks/useMetaMetricsV2";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAdAccounts, useAdCampaigns, getLastNDaysDateRange } from "@/hooks/useMetaMetrics";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
import { useMetaCampaignOverviewMetrics } from "@/hooks/useMetaCampaignMetrics";
import type { MetaCampaignOverviewRow, MetaPrimaryMetric, MetaEngagementStage, MetaInvestmentTimelinePoint } from "@/lib/metaMetrics";
import { formatDateTime, formatCurrency } from "@/lib/formatters";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
import { RefreshCw } from "lucide-react";

type CampaignFilter = "all" | string;

export default function MetricsPage() {
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: getLastNDaysDateRange(30),
  });
  const dateRangeDayPicker: DateRange | undefined = filters.dateRange
    ? { from: new Date(filters.dateRange.start), to: new Date(filters.dateRange.end) }
    : undefined;
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const { hasActiveConnection, isLoading: statusLoading, isFetching: statusFetching } =
    useMetaConnectionStatus();
  
  const { activeAdAccounts, syncCampaigns, syncDailyInsights, refreshData } = useMetaAuth();

  const metaQueriesEnabled = hasActiveConnection;

  const { data: adAccounts, isLoading: adAccountsLoading } = useAdAccounts({ enabled: metaQueriesEnabled });
  const { data: campaigns } = useAdCampaigns(filters.accountId, { enabled: metaQueriesEnabled });

  const statusPending = statusLoading || statusFetching || adAccountsLoading;

  const { data: unifiedMetrics, isLoading: unifiedLoading } = useUnifiedMetrics(
    {
      dateRange: filters.dateRange,
      accountId: filters.accountId,
      campaignId: filters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  const { data: dailyBreakdown, isLoading: dailyLoading } = useUnifiedDailyBreakdown(
    {
      dateRange: filters.dateRange,
      accountId: filters.accountId,
      campaignId: filters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  // Calcula período anterior com mesmo tamanho para variações (% change)
  const prevDateRange = useMemo(() => {
    if (!filters.dateRange?.start || !filters.dateRange?.end) return undefined;
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
    const prevEnd = new Date(start.getTime() - msPerDay);
    const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * msPerDay);
    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0],
    };
  }, [filters.dateRange]);

  const { data: prevMetrics, isLoading: prevLoading } = useUnifiedMetrics(
    {
      dateRange: prevDateRange,
      accountId: filters.accountId,
      campaignId: filters.campaignId,
    },
    { enabled: metaQueriesEnabled && !!prevDateRange }
  );

  const summaryQuery = useMemo(() => {
    // Helper para calcular variação percentual segura
    const calcChange = (current?: number, previous?: number) => {
      if (current == null || previous == null || previous === 0) return undefined;
      const change = ((current - previous) / previous) * 100;
      return Number.isFinite(change) ? change : undefined;
    };

    const isLoading = unifiedLoading || prevLoading;
    if (!unifiedMetrics) {
      return { isLoading, data: { primary: [], cost: [], funnel: [], updatedAt: null as string | null } };
    }

    const impressions = unifiedMetrics.meta_impressions ?? 0;
    const clicks = unifiedMetrics.meta_clicks ?? 0;
    const metaLeads = unifiedMetrics.meta_leads ?? 0;
    const crmLeads = unifiedMetrics.crm_total_leads ?? 0;
    const spend = unifiedMetrics.meta_spend ?? 0;

    // Calcular métricas de custo derivadas
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cplMeta = unifiedMetrics.meta_cpl ?? (metaLeads > 0 ? spend / metaLeads : null);
    const ctr = unifiedMetrics.meta_ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0);

    // Variações vs período anterior
    const prevImpressions = prevMetrics?.meta_impressions ?? undefined;
    const prevClicks = prevMetrics?.meta_clicks ?? undefined;
    const prevCrmLeads = prevMetrics?.crm_total_leads ?? undefined;
    const prevSpend = prevMetrics?.meta_spend ?? undefined;
    const prevCpc = prevClicks && prevSpend ? prevSpend / prevClicks : undefined;
    const prevCplMeta = prevMetrics?.meta_cpl ?? (prevMetrics?.meta_leads && prevSpend ? prevSpend / prevMetrics.meta_leads : undefined);
    const prevCtr = prevMetrics?.meta_ctr ?? undefined;

    const primary: MetaPrimaryMetric[] = [
      { id: 'impressions', label: 'Impressões', value: impressions, formatter: 'integer' },
      { id: 'clicks', label: 'Cliques', value: clicks, formatter: 'integer' },
      // Exibir leads do CRM para refletir conversões reais
      { id: 'crmLeads', label: 'Leads (CRM)', value: crmLeads, formatter: 'integer' },
    ];

    const cost: MetaPrimaryMetric[] = [
      { id: 'cpc', label: 'Custo por Clique (CPC)', value: cpc, formatter: 'currency', currencyOptions: { currency: 'BRL', locale: 'pt-BR' } },
      { id: 'cpl', label: 'Custo por Lead (CPL - Meta)', value: cplMeta ?? 0, formatter: 'currency', currencyOptions: { currency: 'BRL', locale: 'pt-BR' } },
      { id: 'ctr', label: 'Taxa de Cliques (CTR)', value: ctr, formatter: 'percentage', suffix: '%' },
    ];

    const funnel: MetaEngagementStage[] = [
      { id: 'impressions', label: 'Impressões', value: impressions },
      { id: 'clicks', label: 'Cliques', value: clicks },
      { id: 'metaLeads', label: 'Leads (Meta)', value: metaLeads },
      { id: 'crmLeads', label: 'Leads (CRM)', value: crmLeads },
      { id: 'closedWon', label: 'Clientes (Fechados)', value: unifiedMetrics.crm_fechados_ganho ?? 0 },
    ];

    // Data da última atualização com base no último dia do breakdown
    const updatedAt = (dailyBreakdown && dailyBreakdown.length > 0)
      ? new Date(dailyBreakdown[dailyBreakdown.length - 1].date + 'T00:00:00Z').toISOString()
      : null;

    return {
      isLoading,
      data: {
        primary,
        cost,
        funnel,
        updatedAt,
      },
    };
  }, [unifiedMetrics, dailyBreakdown, unifiedLoading, prevMetrics, prevLoading]);

  const { data: campaignMetrics, isLoading: campaignsLoading } = useMetaCampaignOverviewMetrics(
    {
      dateRange: dateRangeDayPicker,
      accountId: filters.accountId,
      campaignId: filters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  // TODO: Refatorar os componentes abaixo para usar a nova fonte de dados unificada
  // ou criar novos hooks que usem os filtros e a lógica de sincronização.
  // const creativesQuery = { isLoading: true, data: [] };
  // const investmentSlicesQuery = { isLoading: true, data: [] };
  
  const investmentTimelineQuery = useMemo(() => {
    if (!dailyBreakdown) {
      return { isLoading: dailyLoading, data: [] as MetaInvestmentTimelinePoint[] };
    }

    const data: MetaInvestmentTimelinePoint[] = dailyBreakdown.map(item => ({
      date: item.date,
      investment: item.spend,
      uniqueCtr: item.ctr,
    }));

    return { isLoading: dailyLoading, data };
  }, [dailyBreakdown, dailyLoading]);

  const isLoading = statusPending || unifiedLoading || dailyLoading || campaignsLoading;

  const hasData = useMemo(() => {
    const metrics = [
      unifiedMetrics?.meta_impressions,
      unifiedMetrics?.meta_clicks,
      unifiedMetrics?.meta_spend,
      unifiedMetrics?.meta_leads,
      unifiedMetrics?.crm_total_leads,
    ].map((v) => Number(v ?? 0));
    const anyMetric = metrics.some((v) => v > 0);
    const hasBreakdown = (dailyBreakdown?.length ?? 0) > 0;
    return anyMetric || hasBreakdown;
  }, [unifiedMetrics, dailyBreakdown]);

  const availableCampaigns = campaigns ?? [];

  const filteredCampaigns = useMemo<MetaCampaignOverviewRow[]>(() => {
    if (!campaignMetrics) return [];

    return (campaignMetrics as any[]).map((metric) => ({
      id: metric.ad_id ?? metric.ad_set_id ?? metric.id,
      name: metric.ad_name ?? metric.ad_set_name ?? metric.name,
      impressions: Number(metric.impressions ?? 0),
      clicks: Number(metric.clicks ?? 0),
      spend: Number(metric.spend ?? 0),
      cpc: Number(metric.cpc ?? 0),
      cpm: Number(metric.cpm ?? 0),
      uniqueCtr: Number(metric.ctr ?? 0),
      uniqueCtrRate: Number(metric.unique_ctr_rate ?? 0),
    }));
  }, [campaignMetrics]);

  const handleSyncInsights = async () => {
    if (!filters.dateRange) {
      toast({
        title: "Período não selecionado",
        description: "Selecione um período para sincronizar os dados.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const accountsToSync = filters.accountId
        ? [filters.accountId]
        : activeAdAccounts.map(acc => acc.id);

      if (accountsToSync.length === 0) {
        toast({
          title: "Nenhuma conta ativa",
          description: "Você precisa ter pelo menos uma conta Meta Ads ativa para sincronizar.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      console.log('🔄 Syncing campaigns for accounts:', accountsToSync);
      let totalCampaigns = 0;

      for (const accountId of accountsToSync) {
        try {
          const campaignResult = await syncCampaigns(accountId);
          console.log(`✅ Campaigns synced for account ${accountId}:`, campaignResult);
          totalCampaigns += campaignResult.campaignsCount || 0;
        } catch (error) {
          console.warn(`⚠️ Error syncing campaigns for account ${accountId}:`, error);
        }
      }

      console.log('🔄 Syncing daily insights...');
      const result = await syncDailyInsights({
        since: filters.dateRange.start,
        until: filters.dateRange.end,
        accountIds: accountsToSync,
      });

      console.log('✅ Sync result:', result);

      await refreshData();

      toast({
        title: "Dados sincronizados!",
        description: `${totalCampaigns} campanhas e ${(result?.recordsProcessed ?? 0)} registros de métricas atualizados.`,
      });
    } catch (error) {
      console.error('❌ Error syncing insights:', error);
      toast({
        title: "Erro ao sincronizar",
        description: error instanceof Error ? error.message : "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (statusPending) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasActiveConnection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Métricas Meta Ads</h1>
          <p className="text-muted-foreground">
            Visualize as métricas das campanhas após conectar sua conta Meta.
          </p>
        </div>
        <Alert>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Conecte-se ao Meta Business Manager para acompanhar os indicadores de anúncios.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="/metricas">Abrir métricas Meta Ads</a>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatório de Campanhas de Anúncios - Meta</h1>
          <p className="text-muted-foreground">Painel consolidado das métricas chave de engajamento e custo.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangePicker
            date={dateRangeDayPicker}
            onDateChange={(dateRange) => {
              if (!dateRange?.from || !dateRange?.to) {
                setFilters({ ...filters, dateRange: undefined });
                return;
              }
              setFilters({
                ...filters,
                dateRange: {
                  start: format(dateRange.from, "yyyy-MM-dd"),
                  end: format(dateRange.to, "yyyy-MM-dd"),
                },
              });
            }}
          />
          <Select value={filters.accountId || 'all'} onValueChange={(value) => setFilters({ ...filters, accountId: value === 'all' ? undefined : value, campaignId: undefined })}>
            <SelectTrigger className="w-[240px] bg-card text-foreground">
              <SelectValue placeholder="Selecione a conta de anúncios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {adAccounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.business_name || account.external_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.campaignId || 'all'}
            onValueChange={(value: string) => setFilters({ ...filters, campaignId: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-[240px] bg-card text-foreground">
              <SelectValue placeholder="Selecione a campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {availableCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="default"
            onClick={handleSyncInsights}
            disabled={isSyncing || !filters.dateRange}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>
      </div>
    </div>

      {!isLoading && !hasData && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Sem dados para o período selecionado.</span>
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncInsights}
              disabled={isSyncing || !filters.dateRange}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {filters.accountId && dateRangeDayPicker?.from && dateRangeDayPicker?.to && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Conjunto de Anúncios</CardTitle>
            </CardHeader>
            <CardContent>
              <AdSetPerformanceTable
                adAccountIds={[filters.accountId]}
                campaignIds={filters.campaignId === "all" ? undefined : (filters.campaignId ? [filters.campaignId] : undefined)}
                dateRange={dateRangeDayPicker}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Anúncio</CardTitle>
            </CardHeader>
            <CardContent>
              <AdPerformanceTableV2
                adAccountIds={[filters.accountId]}
                campaignIds={filters.campaignId === "all" ? undefined : (filters.campaignId ? [filters.campaignId] : undefined)}
                dateRange={dateRangeDayPicker}
              />
            </CardContent>
          </Card>
        </>
      )}

      <MetricsCardGroup
        primary={summaryQuery.data?.primary ?? []}
        cost={summaryQuery.data?.cost ?? []}
        isLoading={summaryQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EngagementFunnel stages={summaryQuery.data?.funnel ?? []} isLoading={summaryQuery.isLoading} />
        {/* <CreativeInvestmentChart data={creativesQuery.data ?? []} isLoading={creativesQuery.isLoading} /> */}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Visão geral por campanha</CardTitle>
            <CardDescription className="text-muted-foreground">
              Impressões, cliques e custos por campanha ativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignOverviewTable data={filteredCampaigns} isLoading={campaignsLoading} />
          </CardContent>
        </Card>
        {/* <InvestmentByDayPie data={investmentSlicesQuery.data ?? []} isLoading={investmentSlicesQuery.isLoading} /> */}
      </div>

      <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />

      {/* <CreativeGrid creatives={creativesQuery.data ?? []} isLoading={creativesQuery.isLoading} /> */}

      <p className="text-xs text-muted-foreground">
        Data da última atualização:{" "}
        {summaryQuery.data?.updatedAt ? formatDateTime(summaryQuery.data.updatedAt) : "—"}
      </p>
    </div>
  );
}
