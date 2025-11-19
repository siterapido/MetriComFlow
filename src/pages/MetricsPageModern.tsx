import { useEffect, useMemo, useState } from "react";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EngagementFunnel } from "@/components/metrics/meta/EngagementFunnel";
import { CampaignOverviewTable } from "@/components/metrics/meta/CampaignOverviewTable";
import { MetricsCardGroup } from "@/components/metrics/meta/MetricsCardGroup";
import { InvestmentTrendChart } from "@/components/metrics/meta/InvestmentTrendChart";
import { UnifiedDailyBreakdownChart } from "@/components/metrics/meta/UnifiedDailyBreakdownChart";
import { AdPerformanceTableV2 } from "@/components/metrics/AdPerformanceTableV2";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAdAccounts, useAdCampaigns, getLastNDaysDateRange } from "@/hooks/useMetaMetrics";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import { useHasMetricsAccess } from "@/hooks/useUserPermissions";
import { MetaAdsConnectionDialog } from "@/components/metrics/MetaAdsConnectionDialog";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
import { useMetaCampaignOverviewMetrics } from "@/hooks/useMetaCampaignMetrics";
import type { MetaCampaignOverviewRow, MetaPrimaryMetric, MetaEngagementStage, MetaInvestmentTimelinePoint } from "@/lib/metaMetrics";
import { formatDateTime } from "@/lib/formatters";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type CampaignFilter = "all" | string;

export default function MetricsPageModern() {
  const [filters, setFilters] = useState<{ dateRange?: { start: string; end: string }; accountId?: string; campaignId?: string }>({
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
  const queryClient = useQueryClient();

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

  // Assinatura realtime para atualizar métricas assim que novos insights forem gravados
  useEffect(() => {
    if (!hasActiveConnection) return;
    const chan = supabase
      .channel('realtime-metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ad_daily_insights' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['unified-daily-breakdown'] });
          queryClient.invalidateQueries({ queryKey: ['metaCampaignOverview'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ad_set_daily_insights' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['unified-daily-breakdown'] });
          queryClient.invalidateQueries({ queryKey: ['metaCampaignOverview'] });
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(chan); } catch {}
    };
  }, [hasActiveConnection, queryClient]);

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

    const cpc = clicks > 0 ? spend / clicks : 0;
    const cplMeta = unifiedMetrics.meta_cpl ?? (metaLeads > 0 ? spend / metaLeads : null);
    const ctr = unifiedMetrics.meta_ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0);

    const primary: MetaPrimaryMetric[] = [
      { id: 'impressions', label: 'Impressões', value: impressions, formatter: 'integer' },
      { id: 'clicks', label: 'Cliques', value: clicks, formatter: 'integer' },
      { id: 'linkClicks', label: 'Cliques no Link', value: unifiedMetrics.meta_link_clicks ?? 0, formatter: 'integer' },
      { id: 'postEngagement', label: 'Engajamento com Publicação', value: unifiedMetrics.meta_post_engagement ?? 0, formatter: 'integer' },
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
  const availableCampaigns = campaigns ?? [];

  const { data: dailyBreakData, isLoading: dailyLoadingState } = { data: dailyBreakdown, isLoading: dailyLoading };

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
      for (const accountId of accountsToSync) {
        try {
          await syncCampaigns(accountId);
        } catch {}
      }
      await syncDailyInsights({
        since: filters.dateRange.start,
        until: filters.dateRange.end,
        accountIds: accountsToSync,
      });
      await refreshData();
      await queryClient.invalidateQueries();
      toast({
        title: "Dados atualizados",
        description: "Os indicadores foram atualizados com sucesso.",
      });
    } catch {
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
          <p className="text-muted-foreground">Conecte sua conta Meta para visualizar as métricas.</p>
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Início</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Métricas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Relatório de Campanhas de Anúncios</h2>
            <p className="text-muted-foreground">KPIs, tendências e visão por campanhas do Meta Ads.</p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncInsights}
                  disabled={isSyncing || !filters.dateRange}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Atualizando' : 'Atualizar'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sincronizar métricas mais recentes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const rows: string[] = []
                    rows.push('Métrica,Valor')
                    const p = summaryQuery.data?.primary ?? []
                    const c = summaryQuery.data?.cost ?? []
                    p.forEach(m => rows.push(`${m.label},${m.value}`))
                    c.forEach(m => rows.push(`${m.label},${m.value}`))
                    rows.push('')
                    rows.push('Data,Investimento,CTR,Leads CRM')
                    (dailyBreakdown ?? []).forEach(d => {
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
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar dados do período selecionado</TooltipContent>
            </Tooltip>
            {canManageMeta && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnectionDialog(true)}
                className="gap-2"
              >
                <Link2 className="w-4 h-4" />
                Contas Meta
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Filtros</CardTitle>
          <CardDescription className="text-muted-foreground">Período, conta e campanha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
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
            </div>
            <Select value={filters.accountId || 'all'} onValueChange={(value) => setFilters({ ...filters, accountId: value === 'all' ? undefined : value, campaignId: undefined })}>
              <SelectTrigger className="w-full bg-card text-foreground">
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
              <SelectTrigger className="w-full bg-card text-foreground">
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
          </div>
        </CardContent>
      </Card>

      {!isLoading && !hasData && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Sem dados para o período selecionado. Ajuste os filtros para outro intervalo.</span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="ads">Anúncios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <MetricsCardGroup
            primary={summaryQuery.data?.primary ?? []}
            cost={summaryQuery.data?.cost ?? []}
            isLoading={summaryQuery.isLoading}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <UnifiedDailyBreakdownChart data={dailyBreakData ?? []} isLoading={dailyLoadingState} />
            <div className="space-y-6">
              <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />
              <EngagementFunnel stages={summaryQuery.data?.funnel ?? []} isLoading={summaryQuery.isLoading} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Data da última atualização: {summaryQuery.data?.updatedAt ? formatDateTime(summaryQuery.data.updatedAt) : "—"}
          </p>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Evolução do Investimento</CardTitle>
              <CardDescription className="text-muted-foreground">Investimento e CTR único por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Visão geral por campanha</CardTitle>
              <CardDescription className="text-muted-foreground">Impressões, cliques e custos por campanha ativa</CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignOverviewTable data={filteredCampaigns} isLoading={campaignsLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Desempenho dos Anúncios</CardTitle>
              <CardDescription className="text-muted-foreground">Métricas detalhadas por anúncio no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <AdPerformanceTableV2
                adAccountIds={filters.accountId ? [filters.accountId] : activeAccountIds}
                campaignIds={filters.campaignId ? [filters.campaignId] : undefined}
                dateRange={dateRangeDayPicker as any}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
  );
}