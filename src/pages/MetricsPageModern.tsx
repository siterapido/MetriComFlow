import { useEffect, useMemo, useState } from "react";
import { Loader2, Link2, RefreshCw, Download, CalendarDays, Target, TrendingUp, DollarSign, Activity, Users, MousePointerClick, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EngagementFunnel } from "@/components/metrics/meta/EngagementFunnel";
import { CampaignOverviewTable } from "@/components/metrics/meta/CampaignOverviewTable";
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
import { useClientGoals } from "@/hooks/useClientGoals";
import type { MetaCampaignOverviewRow, MetaPrimaryMetric, MetaEngagementStage, MetaInvestmentTimelinePoint } from "@/lib/metaMetrics";
import { formatDateTime, formatCurrency, formatNumber } from "@/lib/formatters";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedMetricCard, GlassCard, ModernTabTrigger, GoalsWidget } from "@/components/metrics/ModernMetricsUI";

export default function MetricsPageModern() {
  const [filters, setFilters] = useState<{ dateRange?: { start: string; end: string }; accountId?: string; campaignId?: string }>({
    dateRange: getLastNDaysDateRange(30),
  });
  const dateRangeDayPicker: DateRange | undefined = filters.dateRange
    ? { from: new Date(filters.dateRange.start), to: new Date(filters.dateRange.end) }
    : undefined;
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "campaigns" | "ads">("overview");
  const { toast } = useToast();

  const { hasActiveConnection, tokenExpiresAt, isLoading: statusLoading, isFetching: statusFetching } =
    useMetaConnectionStatus();

  const { activeAdAccounts, syncCampaigns, syncDailyInsights, refreshData } = useMetaAuth();
  const canManageMeta = useHasMetricsAccess();

  const metaQueriesEnabled = hasActiveConnection;
  const queryClient = useQueryClient();

  const { data: adAccounts, isLoading: adAccountsLoading } = useAdAccounts({ enabled: metaQueriesEnabled });
  const { data: campaigns } = useAdCampaigns(filters.accountId, { enabled: metaQueriesEnabled });

  // Goals hook
  const { data: goals, isLoading: goalsLoading } = useClientGoals();

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

  // Realtime subscription
  useEffect(() => {
    if (!hasActiveConnection) return;
    const chan = supabase
      .channel('realtime-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_daily_insights' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['unified-daily-breakdown'] });
        queryClient.invalidateQueries({ queryKey: ['metaCampaignOverview'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_set_daily_insights' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['unified-daily-breakdown'] });
        queryClient.invalidateQueries({ queryKey: ['metaCampaignOverview'] });
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(chan);
      } catch (error) {
        console.warn("Falha ao remover canal de métricas em tempo real", error);
      }
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
      return { isLoading, data: { primary: [], secondary: [], cost: [], funnel: [], updatedAt: null as string | null } };
    }

    const impressions = unifiedMetrics.meta_impressions ?? 0;
    const clicks = unifiedMetrics.meta_clicks ?? 0;
    const metaLeads = unifiedMetrics.meta_leads ?? 0;
    const crmLeads = unifiedMetrics.crm_total_leads ?? 0;
    const spend = unifiedMetrics.meta_spend ?? 0;

    const cpc = clicks > 0 ? spend / clicks : 0;
    const cplMeta = unifiedMetrics.meta_cpl ?? (metaLeads > 0 ? spend / metaLeads : null);
    const ctr = unifiedMetrics.meta_ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const roas = unifiedMetrics.roas ?? 0;

    // Changes
    const spendChange = calcChange(spend, prevMetrics?.meta_spend ?? 0);
    const crmLeadsChange = calcChange(crmLeads, prevMetrics?.crm_total_leads ?? 0);
    const roasChange = calcChange(roas, prevMetrics?.roas ?? 0);
    const cplChange = calcChange(cplMeta ?? 0, prevMetrics?.meta_cpl ?? 0);

    const primary: any[] = [
      { id: 'spend', label: 'Investimento', value: spend, formatter: 'currency', change: spendChange, icon: DollarSign, color: 'blue' },
      { id: 'crmLeads', label: 'Leads (CRM)', value: crmLeads, formatter: 'integer', change: crmLeadsChange, icon: Users, color: 'orange' },
      { id: 'roas', label: 'ROAS Geral', value: roas, formatter: 'decimal', suffix: 'x', change: roasChange, icon: TrendingUp, color: 'purple' },
      { id: 'cpl', label: 'Custo por Lead', value: cplMeta ?? 0, formatter: 'currency', change: cplChange, icon: Target, color: 'green', invertTrend: true },
    ];

    // Additional metrics for detailed view
    const secondary: any[] = [
      { id: 'impressions', label: 'Impressões', value: impressions, formatter: 'integer' },
      { id: 'clicks', label: 'Cliques', value: clicks, formatter: 'integer' },
      { id: 'ctr', label: 'CTR', value: ctr, formatter: 'percentage', suffix: '%' },
      { id: 'cpc', label: 'CPC', value: cpc, formatter: 'currency' },
    ]

    const funnel: MetaEngagementStage[] = [
      { id: 'impressions', label: 'Impressões', value: impressions },
      { id: 'clicks', label: 'Cliques', value: clicks },
      { id: 'metaLeads', label: 'Leads (Meta)', value: metaLeads },
      { id: 'crmLeads', label: 'Leads (CRM)', value: crmLeads },
      { id: 'closedWon', label: 'Vendas', value: unifiedMetrics.crm_fechados_ganho ?? 0 },
    ];

    const updatedAt = (dailyBreakdown && dailyBreakdown.length > 0)
      ? new Date(dailyBreakdown[dailyBreakdown.length - 1].date + 'T00:00:00Z').toISOString()
      : null;

    return {
      isLoading,
      data: {
        primary,
        secondary,
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

  const handleSyncInsights = async () => {
    if (!filters.dateRange) return;
    setIsSyncing(true);
    try {
      const accountsToSync = filters.accountId ? [filters.accountId] : activeAdAccounts.map(acc => acc.id);
      if (accountsToSync.length === 0) {
        toast({ title: "Nenhuma conta ativa", description: "Conecte uma conta Meta Ads.", variant: "destructive" });
        return;
      }

      // Parallel sync campaigns structure first
      await Promise.all(
        accountsToSync.map(accountId =>
          syncCampaigns(accountId).catch(err => console.warn(`Campaign sync failed for ${accountId}`, err))
        )
      );

      // Sync daily insights (Campaigns, Ad Sets, Ads)
      const result = await syncDailyInsights({
        since: filters.dateRange.start,
        until: filters.dateRange.end,
        accountIds: accountsToSync,
      });

      await refreshData();
      await queryClient.invalidateQueries();

      if (result.success) {
        toast({
          title: "Dados atualizados",
          description: `Sincronização concluída. ${result.recordsProcessed || 0} registros processados.`
        });
      } else {
        toast({
          title: "Sincronização Parcial",
          description: result.message,
          variant: "default"
        });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao atualizar", description: "Falha na comunicação com o servidor.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const hasData = useMemo(() => {
    if (!unifiedMetrics) return false;
    return (unifiedMetrics.meta_impressions ?? 0) > 0 || (unifiedMetrics.crm_total_leads ?? 0) > 0;
  }, [unifiedMetrics]);

  const isTokenExpired = useMemo(() => {
    if (!hasActiveConnection) return false;
    // We need to access tokenExpiresAt from the hook result, but it's not destructured yet
    // Let's assume we update the destructuring below
    return false;
  }, [hasActiveConnection]);

  if (statusPending) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
            <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-muted-foreground animate-pulse font-medium">Carregando inteligência...</p>
        </div>
      </div>
    );
  }

  // Check for expired token
  // We need to get tokenExpiresAt from the hook first.
  // Since I can't easily change the destructuring in the same ReplaceBlock without context, 
  // I will do it in two steps or use a larger block.
  // I'll use a larger block to update destructuring and the condition.


  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <Breadcrumb className="mb-2">
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
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Dashboard de Performance
          </h2>
          <p className="text-muted-foreground">
            Acompanhe seus KPIs principais, retorno sobre investimento e metas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card/30 p-2 rounded-2xl border border-white/5 backdrop-blur-sm"
        >
          {/* Filter Trigger */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filters.accountId || 'all'} onValueChange={(value) => setFilters({ ...filters, accountId: value === 'all' ? undefined : value, campaignId: undefined })}>
              <SelectTrigger className="w-full sm:w-[200px] border-white/10 bg-white/5 text-white hover:bg-white/10 focus:ring-0 h-10 rounded-xl">
                <SelectValue placeholder="Todas as Contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Contas</SelectItem>
                {adAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.business_name || account.external_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
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
                className="w-full sm:w-[240px] border-white/10 bg-white/5 text-white hover:bg-white/10 h-10 rounded-xl"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSyncInsights}
                  disabled={isSyncing || !filters.dateRange}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-white/10 bg-white/5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all rounded-xl shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sincronizar dados</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowConnectionDialog(true)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 transition-all rounded-xl shrink-0"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gerenciar conexões</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryQuery.data.primary.map((metric, idx) => (
          <AnimatedMetricCard
            key={metric.id}
            label={metric.label}
            value={
              metric.formatter === 'currency'
                ? formatCurrency(metric.value)
                : metric.formatter === 'decimal'
                  ? `${metric.value.toFixed(2)}${metric.suffix || ''}`
                  : formatNumber(metric.value)
            }
            trend={metric.change}
            trendLabel="vs. período anterior"
            icon={metric.icon}
            color={metric.color}
            delay={idx * 0.1}
          />
        ))}
        {/* If we have less than 4 primary metrics, we can fill with secondary or show Goals */}
        {summaryQuery.data.primary.length < 4 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GoalsWidget goals={goals ?? []} loading={goalsLoading} />
          </motion.div>
        )}
      </div>

      {!summaryQuery.isLoading && !hasData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-4 border-l-4 border-l-yellow-500 bg-yellow-500/5">
            <p className="text-yellow-200 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Não encontramos dados para o filtro selecionado. Tente ajustar o período ou a conta de anúncios.
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Tabs & Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "overview", label: "Visão Geral", icon: Activity },
            { id: "trends", label: "Tendências", icon: TrendingUp },
            { id: "campaigns", label: "Campanhas", icon: Target },
            { id: "ads", label: "Anúncios", icon: MousePointerClick },
          ].map((tab) => (
            <ModernTabTrigger
              key={tab.id}
              value={tab.id}
              label={tab.label}
              icon={tab.icon}
              isSelected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <div className="space-y-6">
                  <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />
                  <UnifiedDailyBreakdownChart data={dailyBreakData ?? []} isLoading={dailyLoadingState} />
                </div>
                <div className="space-y-6">
                  {/* Only show Goals Widget here if not in top grid, OR show secondary metrics */}
                  {summaryQuery.data.primary.length >= 4 && (
                    <div className="h-[200px]">
                      <GoalsWidget goals={goals ?? []} loading={goalsLoading} />
                    </div>
                  )}
                  <EngagementFunnel stages={summaryQuery.data?.funnel ?? []} isLoading={summaryQuery.isLoading} />

                  {/* Secondary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {summaryQuery.data.secondary.map((metric: any) => (
                      <GlassCard key={metric.id} className="p-4">
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className="text-lg font-semibold text-white mt-1">
                          {metric.formatter === 'currency'
                            ? formatCurrency(metric.value)
                            : metric.formatter === 'percentage'
                              ? `${metric.value.toFixed(2)}%`
                              : formatNumber(metric.value)
                          }
                        </p>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-6">
                <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />
                <UnifiedDailyBreakdownChart data={dailyBreakData ?? []} isLoading={dailyLoadingState} />
              </div>
            )}

            {activeTab === 'campaigns' && (
              <Card className="border-white/5 bg-card/30 backdrop-blur-xl">
                <CardContent className="p-6">
                  <CampaignOverviewTable data={filteredCampaigns} isLoading={campaignsLoading} />
                </CardContent>
              </Card>
            )}

            {activeTab === 'ads' && (
              <Card className="border-white/5 bg-card/30 backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-white">Performance de Anúncios</h3>
                      <p className="text-sm text-muted-foreground">Análise detalhada por criativo</p>
                    </div>
                    <Button
                      onClick={handleSyncInsights}
                      disabled={isSyncing}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-white/10 hover:bg-white/5"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
                    </Button>
                  </div>
                  <AdPerformanceTableV2
                    adAccountIds={filters.accountId ? [filters.accountId] : activeAccountIds}
                    campaignIds={filters.campaignId ? [filters.campaignId] : undefined}
                    dateRange={dateRangeDayPicker as any}
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

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
