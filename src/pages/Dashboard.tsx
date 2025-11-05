import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Target, Loader2, Users, BarChart3, GitBranch, Award, TrendingDown, RefreshCw } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { useDashboardSummary, useRevenueRecords, useMetaKPIs, usePipelineMetrics, usePipelineEvolution } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
import { DateRangeFilter } from "@/components/meta-ads/DateRangeFilter";
import { MetaAdsChart } from "@/components/meta-ads/MetaAdsChart";
import { useFilteredInsights, getLastNDaysDateRange, useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";
// Removed ConversionFunnel per request
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import { UnifiedROICards } from "@/components/dashboard/UnifiedROICards";
import { IntegratedConversionUnified } from "@/components/dashboard/IntegratedConversionUnified";
import { UnifiedMetricsChart } from "@/components/dashboard/UnifiedMetricsChart";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
import { AutoSyncStatus } from "@/components/meta-ads/AutoSyncStatus";
import { OrganizationSyncStatus } from "@/components/meta-ads/OrganizationSyncStatus";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: revenueRecords, isLoading: revenueLoading } = useRevenueRecords(undefined, new Date().getFullYear());
  const { toast } = useToast();

  // Meta Ads filters state - Padrão: últimos 30 dias
  const [metaFilters, setMetaFilters] = useState<FilterValues>({
    dateRange: getLastNDaysDateRange(30),
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const {
    hasActiveConnection: hasMetaConnection,
    isLoading: metaStatusLoading,
    isFetching: metaStatusFetching,
  } = useMetaConnectionStatus();

  const { activeAdAccounts, syncCampaigns, syncDailyInsights, refreshData } = useMetaAuth();
  const metaStatusPending = metaStatusLoading || metaStatusFetching;
  const metaQueriesEnabled = hasMetaConnection;

  // Fetch accounts and campaigns for filters
  const { data: accounts } = useAdAccounts({ enabled: metaQueriesEnabled });
  const { data: campaigns } = useAdCampaigns(metaFilters.accountId, { enabled: metaQueriesEnabled });

  // Sprint 2: Unified metrics (Meta Ads + CRM Revenue)
  const { data: unifiedMetrics, isLoading: unifiedLoading } = useUnifiedMetrics(
    {
      dateRange: metaFilters.dateRange,
      accountId: metaFilters.accountId,
      campaignId: metaFilters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  // Conversion Funnel removed

  // CRM pipeline evolution over time (some views may reference this)
  // Defining it here prevents ReferenceError if JSX references exist.
  const { data: pipelineEvolution, isLoading: pipelineLoading } = usePipelineEvolution(
    metaFilters.dateRange
  );

  // Sprint 2: Daily breakdown for temporal chart
  const { data: dailyBreakdown, isLoading: dailyLoading } = useUnifiedDailyBreakdown(
    {
      dateRange: metaFilters.dateRange,
      accountId: metaFilters.accountId,
      campaignId: metaFilters.campaignId,
    },
    { enabled: metaQueriesEnabled }
  );

  // Transform revenue records into chart data
  const chartData = useMemo(() => {
    if (!revenueRecords) return [];

    const monthOrder = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Group by month
    const grouped = revenueRecords.reduce((acc, record) => {
      if (!acc[record.month]) {
        acc[record.month] = {
          month: record.month,
          newUp: 0,
          clientes: 0,
          oportunidades: 0
        };
      }

      if (record.category === 'new_up') {
        acc[record.month].newUp += record.amount;
      } else if (record.category === 'clientes') {
        acc[record.month].clientes += record.amount;
      } else if (record.category === 'oportunidades') {
        acc[record.month].oportunidades += record.amount;
      }

      return acc;
    }, {} as Record<string, any>);

    // Sort by month order
    return monthOrder
      .filter(month => grouped[month])
      .map(month => grouped[month]);
  }, [revenueRecords]);

  const isLoading = summaryLoading || revenueLoading;

  // Handler para sincronizar dados Meta Ads
  const handleSyncInsights = async () => {
    if (!metaFilters.dateRange) {
      toast({
        title: "Período não selecionado",
        description: "Selecione um período para sincronizar os dados.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const accountsToSync = metaFilters.accountId
        ? [metaFilters.accountId]
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

      // Etapa 1: Sincronizar campanhas primeiro
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

      // Etapa 2: Sincronizar insights
      console.log('🔄 Syncing daily insights...');
      const result = await syncDailyInsights({
        since: metaFilters.dateRange.start,
        until: metaFilters.dateRange.end,
        accountIds: accountsToSync,
      });

      console.log('✅ Sync result:', result);

      // Refresh data
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com filtros integrados */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão completa de faturamento, oportunidades e Meta Ads</p>
        </div>

        {/* Filtros minimalistas inline */}
        {hasMetaConnection && (
          <div className="flex flex-wrap gap-2">
            <DateRangeFilter
              value={metaFilters.dateRange}
              onChange={(dateRange) => setMetaFilters({ ...metaFilters, dateRange })}
            />

            <Select
              value={metaFilters.accountId || 'all'}
              onValueChange={(value) => setMetaFilters({
                ...metaFilters,
                accountId: value === 'all' ? undefined : value,
                campaignId: undefined
              })}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.business_name || account.external_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {metaFilters.accountId && (
              <Select
                value={metaFilters.campaignId || 'all'}
                onValueChange={(value) => setMetaFilters({
                  ...metaFilters,
                  campaignId: value === 'all' ? undefined : value
                })}
              >
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="default"
              onClick={handleSyncInsights}
              disabled={isSyncing || !metaFilters.dateRange}
              className="gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
            </Button>
          </div>
        )}
      </div>

      {!metaStatusPending && !hasMetaConnection && (
        <Alert>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Conecte-se ao Meta Business Manager para visualizar métricas e funis de campanhas.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="/metricas">Configurar Meta Ads</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Faturamento Mensal */}
        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary ? `R$ ${((summary.faturamento_mensal || 0)).toLocaleString("pt-BR")}` : 'R$ 0'}
            </div>
            <p className="text-xs text-primary">Meta mensal</p>
          </CardContent>
        </Card>

        {/* Faturamento Anual */}
        <Card className="bg-gradient-to-br from-card to-secondary/20 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Anual
            </CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary ? `R$ ${((summary.faturamento_anual || 0) / 1000).toFixed(1)}k` : 'R$ 0'}
            </div>
            <p className="text-xs text-secondary">
              Meta: R$ {summary ? ((summary.faturamento_anual || 0) * 1.2 / 1000).toFixed(1) : '0'}k
            </p>
          </CardContent>
        </Card>

        {/* Oportunidades Ativas */}
        <Card className="bg-gradient-to-br from-card to-accent/10 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades Ativas
            </CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary?.oportunidades_ativas || 0}
            </div>
            <p className="text-xs text-accent">
              R$ {((summary?.pipeline_value || 0) / 1000).toFixed(0)}k em pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sprint 2: ROI Real - Métricas Unificadas (Meta Ads + CRM) */}
      {hasMetaConnection && (
        <UnifiedROICards metrics={unifiedMetrics} isLoading={unifiedLoading} />
      )}

      {/* Sprint 2: Gráfico Unificado de Evolução Temporal */}
      {hasMetaConnection && (
        <UnifiedMetricsChart data={dailyBreakdown} isLoading={dailyLoading} />
      )}

      {/* Funil de Conversão Integrado (Simplificado) */}
      {hasMetaConnection && (
          <IntegratedConversionUnified metrics={unifiedMetrics} isLoading={unifiedLoading} />
      )}

      {/* Visão unificada já inclui o funil completo + KPI principal */}

      {/* Status de Sincronização Automática */}
      {hasMetaConnection && (
        <div className="space-y-6">
          <AutoSyncStatus />
          <OrganizationSyncStatus />
        </div>
      )}
    </div>
  );
}
