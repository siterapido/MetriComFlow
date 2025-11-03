import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, DollarSign, Target, Loader2, Users, BarChart3, GitBranch, Award, TrendingDown, RefreshCw } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { useDashboardSummary, useRevenueRecords, useMetaKPIs, usePipelineMetrics, usePipelineEvolution, useCombinedFunnelData } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
import { DateRangeFilter } from "@/components/meta-ads/DateRangeFilter";
import { MetaAdsChart } from "@/components/meta-ads/MetaAdsChart";
import { useFilteredInsights, getLastNDaysDateRange, useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import { UnifiedROICards } from "@/components/dashboard/UnifiedROICards";
import { MetaToRevenueFunnel } from "@/components/dashboard/MetaToRevenueFunnel";
import { UnifiedMetricsChart } from "@/components/dashboard/UnifiedMetricsChart";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: revenueRecords, isLoading: revenueLoading } = useRevenueRecords(undefined, new Date().getFullYear());
  const { toast } = useToast();

  // Meta Ads filters state - Default to "All Time" (desde 2020)
  const [metaFilters, setMetaFilters] = useState<FilterValues>({
    dateRange: { start: '2020-01-01', end: new Date().toISOString().split('T')[0] },
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
        ad_account_ids: accountsToSync,
      });

      console.log('✅ Sync result:', result);

      // Refresh data
      await refreshData();

      toast({
        title: "Dados sincronizados!",
        description: `${totalCampaigns} campanhas e ${result.summary.totalDbUpserts} registros de métricas atualizados.`,
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

      {/* Sprint 2: Funil Completo Meta → Receita */}
      {hasMetaConnection && (
        <MetaToRevenueFunnel metrics={unifiedMetrics} isLoading={unifiedLoading} />
      )}

      {/* Evolução do Pipeline */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Evolução do Pipeline</h2>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Movimentações ao Longo do Tempo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Acompanhe a evolução do pipeline e fechamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pipelineEvolution && pipelineEvolution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={pipelineEvolution}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2DA7FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2DA7FF" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('pt-BR');
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_active"
                    stroke="#2DA7FF"
                    fillOpacity={1}
                    fill="url(#colorActive)"
                    name="Pipeline Ativo"
                  />
                  <Area
                    type="monotone"
                    dataKey="fechado_ganho"
                    stroke="#16A34A"
                    fillOpacity={1}
                    fill="url(#colorWon)"
                    name="Fechados (Ganho)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p>Sem dados de evolução no período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
