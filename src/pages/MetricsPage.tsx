import { useMemo, useState } from "react";
import { Loader2, Link2, RefreshCw, Download, CalendarDays } from "lucide-react";
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
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
 
import { EngagementFunnel } from "@/components/metrics/meta/EngagementFunnel";
// import { CreativeInvestmentChart } from "@/components/metrics/meta/CreativeInvestmentChart";
import { CampaignOverviewTable } from "@/components/metrics/meta/CampaignOverviewTable";
// import { InvestmentByDayPie } from "@/components/metrics/meta/InvestmentByDayPie";
import { MetricsCardGroup } from "@/components/metrics/meta/MetricsCardGroup";
import { InvestmentTrendChart } from "@/components/metrics/meta/InvestmentTrendChart";
import { UnifiedDailyBreakdownChart } from "@/components/metrics/meta/UnifiedDailyBreakdownChart";
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
import { useHasMetricsAccess } from "@/hooks/useUserPermissions";
import { MetaAdsConnectionDialog } from "@/components/metrics/MetaAdsConnectionDialog";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
import { useAdSetWeeklyMetrics } from "@/hooks/useAdSetWeeklyMetrics";
import { AdSetWeeklyCards } from "@/components/metrics/AdSetWeeklyCards";
import { AdSetWeeklyTrendChart } from "@/components/metrics/AdSetWeeklyTrendChart";
import { AdSetWeeklyComparisonTable } from "@/components/metrics/AdSetWeeklyComparisonTable";
import { useMetaCampaignOverviewMetrics } from "@/hooks/useMetaCampaignMetrics";
import type { MetaCampaignOverviewRow, MetaPrimaryMetric, MetaEngagementStage, MetaInvestmentTimelinePoint } from "@/lib/metaMetrics";
import { formatDateTime, formatCurrency } from "@/lib/formatters";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
 

type CampaignFilter = "all" | string;

export default function MetricsPage() {
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: getLastNDaysDateRange(30),
  });
  const dateRangeDayPicker: DateRange | undefined = filters.dateRange
    ? { from: new Date(filters.dateRange.start), to: new Date(filters.dateRange.end) }
    : undefined;
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const { toast } = useToast();

  const { hasActiveConnection, isLoading: statusLoading, isFetching: statusFetching } =
    useMetaConnectionStatus();
  
  const { activeAdAccounts, syncCampaigns, syncDailyInsights, refreshData } = useMetaAuth();
  const canManageMeta = useHasMetricsAccess();

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

  const adSetWeeklyMetrics = useAdSetWeeklyMetrics(
    {
      accountId: filters.accountId,
      campaignId: filters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  const adSetWeeklySummary = useMemo(() => {
    const data = adSetWeeklyMetrics.data;
    if (!data || data.weeks.length === 0) return null;
    const weeks = data.weeks;
    const latest = weeks[weeks.length - 1];
    const total = data.totalByWeek[latest];
    if (!total) return null;
    const prev = weeks.length > 1 ? weeks[weeks.length - 2] : undefined;
    const rows = Object.entries(data.byAdSet)
      .map(([id, arr]) => {
        const name = arr[0]?.ad_set_name ?? "—";
        const curAgg = arr.find((a) => a.week === latest);
        const prevAgg = prev ? arr.find((a) => a.week === prev) : undefined;
        return {
          ad_set_id: id,
          ad_set_name: name,
          current: curAgg
            ? { spend: curAgg.spend, leads_count: curAgg.leads_count, cpl: curAgg.cpl, ctr: curAgg.ctr }
            : { spend: 0, leads_count: 0, cpl: 0, ctr: 0 },
          previous: prevAgg
            ? { spend: prevAgg.spend, leads_count: prevAgg.leads_count, cpl: prevAgg.cpl, ctr: prevAgg.ctr }
            : undefined,
        };
      })
      .sort((a, b) => b.current.spend - a.current.spend);

    const trendData = weeks.map((wk) => ({
      week: wk,
      ...(data.totalByWeek[wk] || { spend: 0, leads_count: 0, ctr: 0, cpl: 0 }),
    }));

    return {
      total,
      trendData,
      rows,
      wow: data.wowDelta,
    };
  }, [adSetWeeklyMetrics.data]);

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
      { id: 'linkClicks', label: 'Cliques no Link', value: unifiedMetrics.meta_link_clicks ?? 0, formatter: 'integer' },
      { id: 'postEngagement', label: 'Engajamento com Publicação', value: unifiedMetrics.meta_post_engagement ?? 0, formatter: 'integer' },
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

  const activeAccountIds = activeAdAccounts.map((account) => account.id);
  const tableAdAccountIds = filters.accountId ? [filters.accountId] : activeAccountIds;
  const campaignFilterIds = filters.campaignId ? [filters.campaignId] : undefined;
  const showPerformanceTables =
    tableAdAccountIds.length > 0 && !!dateRangeDayPicker?.from && !!dateRangeDayPicker?.to;

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
        title: "Dados atualizados",
        description: "Os indicadores foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('❌ Error syncing insights:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados no momento.",
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
            {canManageMeta && (
              <Button variant="default" size="sm" className="gap-2" onClick={() => setShowConnectionDialog(true)}>
                <Link2 className="w-4 h-4" />
                Conectar Meta Ads
              </Button>
            )}
          </AlertDescription>
        </Alert>
        <MetaAdsConnectionDialog
          open={showConnectionDialog}
          onOpenChange={setShowConnectionDialog}
          dateRange={filters.dateRange}
          onAccountsUpdated={() => {
            setShowConnectionDialog(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatório de Campanhas de Anúncios - Meta</h1>
          <p className="text-muted-foreground">Painel com KPIs e tendências para decisão diária.</p>
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
            {isSyncing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          {canManageMeta && (
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowConnectionDialog(true)}
              className="gap-2"
            >
              <Link2 className="w-4 h-4" />
              Contas Meta
            </Button>
          )}
          <Button
            variant="default"
            size="default"
            onClick={() => {
              const rows: string[] = []
              rows.push('Métrica,Valor')
              const p = summaryQuery.data?.primary ?? []
              const c = summaryQuery.data?.cost ?? []
              p.forEach(m => rows.push(`${m.label},${m.value}`))
              c.forEach(m => rows.push(`${m.label},${m.value}`))
              rows.push('')
              rows.push('Data,Investimento,CTR,Leads CRM');
              const breakdown = dailyBreakdown ?? [];
              breakdown.forEach(d => {
                const ctr = typeof d.ctr === 'number' ? d.ctr : Number(d.ctr ?? 0)
                const leads = typeof d.crm_leads === 'number' ? d.crm_leads : Number(d.crm_leads ?? 0)
                rows.push(`${d.date},${d.spend},${ctr},${leads}`)
              })
              const csv = rows.join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              const start = filters.dateRange?.start ?? 'inicio'
              const end = filters.dateRange?.end ?? 'fim'
              a.href = url
              a.download = `metricas-meta-${start}_a_${end}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="gap-2"
          >
            Exportar CSV
          </Button>
          <MetaAdsConnectionDialog
            open={showConnectionDialog}
            onOpenChange={setShowConnectionDialog}
            dateRange={filters.dateRange}
            onAccountsUpdated={async () => {
              setShowConnectionDialog(false);
              await refreshData();
            }}
          />
      </div>
    </div>

      {!isLoading && !hasData && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Sem dados para o período selecionado. Ajuste os filtros para outro intervalo.</span>
          </AlertDescription>
        </Alert>
      )}

      

      <MetricsCardGroup
        primary={summaryQuery.data?.primary ?? []}
        cost={summaryQuery.data?.cost ?? []}
        isLoading={summaryQuery.isLoading}
      />

      {/* Conjuntos (4 Semanas) */}
      {adSetWeeklySummary && (
        <div className="space-y-4">
          <AdSetWeeklyCards
            total={{
              spend: adSetWeeklySummary.total.spend,
              leads_count: adSetWeeklySummary.total.leads_count,
              ctr: adSetWeeklySummary.total.ctr,
              cpl: adSetWeeklySummary.total.cpl,
            }}
            wow={adSetWeeklySummary.wow}
          />
          <AdSetWeeklyTrendChart data={adSetWeeklySummary.trendData} />
          <AdSetWeeklyComparisonTable rows={adSetWeeklySummary.rows} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <UnifiedDailyBreakdownChart data={dailyBreakdown ?? []} isLoading={dailyLoading} />
        <div className="space-y-6">
          <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />
          <EngagementFunnel stages={summaryQuery.data?.funnel ?? []} isLoading={summaryQuery.isLoading} />
        </div>
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

      {/* <CreativeGrid creatives={creativesQuery.data ?? []} isLoading={creativesQuery.isLoading} /> */}

      <p className="text-xs text-muted-foreground">
        Data da última atualização:{" "}
        {summaryQuery.data?.updatedAt ? formatDateTime(summaryQuery.data.updatedAt) : "—"}
      </p>
    </div>
  );
}
