/**
 * Página de Métricas focada em Gestor de Tráfego
 * Análise granular por Campanha > Conjunto > Criativo
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target,
  Layers,
  Image as ImageIcon,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye,
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Link2,
} from 'lucide-react';
import { DateRangeFilter } from '@/components/meta-ads/DateRangeFilter';
import { MetaAdsKPICards } from '@/components/meta-ads/MetaAdsKPICards';
import { CreativeGrid } from '@/components/metrics/CreativeCard';
import { CampaignPerformanceTable } from '@/components/metrics/CampaignPerformanceTable';
import { MetaAdsConnectionDialog } from '@/components/metrics/MetaAdsConnectionDialog';
import { useMetaConnectionStatus } from '@/hooks/useMetaConnectionStatus';
import { useMetricsSummary, useAdAccounts, useAdCampaigns } from '@/hooks/useMetaMetrics';
import { useMetaAuth } from '@/hooks/useMetaAuth';
import { useHasMetricsAccess } from '@/hooks/useUserPermissions';
import {
  useAdSets,
  useSyncAdSets,
  useSyncAdSetInsights,
  useAdSetMetrics,
  useAds,
  useSyncAds,
  useSyncAdInsights,
  useAdMetrics,
  useCreativePerformance,
  getLastNDays,
} from "@/hooks/useAdSetsAndAds";
import { AdPerformanceTableV2 } from "@/components/metrics/AdPerformanceTableV2";
import { AdSetPerformanceTable } from "@/components/metrics/AdSetPerformanceTable";
import { AdSetWeeklyCards } from "@/components/metrics/AdSetWeeklyCards";
import { AdSetWeeklyTrendChart } from "@/components/metrics/AdSetWeeklyTrendChart";
import { AdSetWeeklyComparisonTable } from "@/components/metrics/AdSetWeeklyComparisonTable";
import { useAdSetWeeklyMetrics } from "@/hooks/useAdSetWeeklyMetrics";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

export default function TrafficMetrics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Limite oficial da Meta Ads Insights API: máximo de 37 meses de histórico
  const [dateRange, setDateRange] = useState(getLastNDays(30));
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAdSet, setSelectedAdSet] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'adsets' | 'creatives'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  // Meta auth utilities (to ensure campaigns are present)
  const { syncCampaigns, syncDailyInsights } = useMetaAuth();
  const canManageMeta = useHasMetricsAccess();

  const invalidateMetaQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['metaConnectionStatus'] });
    queryClient.invalidateQueries({ queryKey: ['adAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['adCampaigns'] });
  };

  const handleAccountsUpdatedFromDialog = () => {
    invalidateMetaQueries();
    setShowConnectionDialog(false);
  };

  // Meta Connection Status
  const { hasActiveConnection, isLoading: statusLoading } = useMetaConnectionStatus();

  // Filters
  const { data: accounts } = useAdAccounts({ enabled: hasActiveConnection });
  const { data: campaigns } = useAdCampaigns(
    selectedAccount === 'all' ? undefined : selectedAccount,
    { enabled: hasActiveConnection }
  );

  // Summary metrics
  const { data: summary, isLoading: summaryLoading } = useMetricsSummary(
    {
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
      campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
      dateRange,
    },
    { enabled: hasActiveConnection }
  );

  // Ad Sets
  const { data: adSets } = useAdSets(
    selectedCampaign === 'all' ? undefined : selectedCampaign,
    { enabled: hasActiveConnection && activeTab === 'adsets' }
  );

  const { data: adSetMetrics, isLoading: adSetMetricsLoading } = useAdSetMetrics(
    {
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
      campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
      adSetId: selectedAdSet === 'all' ? undefined : selectedAdSet,
      dateRange,
    },
    { enabled: hasActiveConnection && activeTab === 'adsets' }
  );

  const adSetWeeklyMetrics = useAdSetWeeklyMetrics(
    {
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
      campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
      adSetIds: selectedAdSet === 'all' ? undefined : [selectedAdSet],
    },
    { enabled: hasActiveConnection && activeTab === 'adsets' }
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
        const name = arr[0]?.ad_set_name ?? '—';
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
      rows,
      trendData,
      wow: data.wowDelta,
    };
  }, [adSetWeeklyMetrics.data]);

  // Ads (Criativos)
  const { data: ads } = useAds(
    {
      campaign_id: selectedCampaign === 'all' ? undefined : selectedCampaign,
      ad_set_id: selectedAdSet === 'all' ? undefined : selectedAdSet,
    },
    { enabled: hasActiveConnection && activeTab === 'creatives' }
  );

  const { data: adMetrics, isLoading: adMetricsLoading } = useAdMetrics(
    {
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
      campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
      adSetId: selectedAdSet === 'all' ? undefined : selectedAdSet,
      dateRange,
    },
    { enabled: hasActiveConnection && activeTab === 'creatives' }
  );

  const { data: creativePerformance } = useCreativePerformance(dateRange, {
    enabled: hasActiveConnection && activeTab === 'overview',
  });

  // Mutations
  const syncAdSets = useSyncAdSets();
  const syncAds = useSyncAds();
  const syncAdSetInsights = useSyncAdSetInsights();
  const syncAdInsights = useSyncAdInsights();

  // Realtime subscriptions for ad and ad set insights
  useEffect(() => {
    if (!hasActiveConnection) return;
    const chan = supabase
      .channel('realtime-ads-insights')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ad_daily_insights' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ad-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ad_set_daily_insights' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['metrics'] });
          queryClient.invalidateQueries({ queryKey: ['ad-set-metrics'] });
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(chan);
      } catch (error) {
        console.warn("Falha ao remover canal realtime de métricas", error);
      }
    };
  }, [hasActiveConnection, queryClient]);

  // Handlers
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const accountsToSync = selectedAccount === 'all'
        ? (accounts || []).map(a => a.id)
        : [selectedAccount];

      for (const accId of accountsToSync) {
        try {
          // A função syncCampaigns agora lida com a sincronização completa
          // de campanhas, conjuntos de anúncios e anúncios.
          await syncCampaigns(accId);
        } catch (err) {
          console.warn('⚠️ Error syncing account', accId, err);
        }
      }

      // Sincronizar métricas diárias para o período e contas selecionadas
      try {
        await syncDailyInsights({
          since: dateRange.start,
          until: dateRange.end,
          accountIds: accountsToSync,
        });
        // Invalidar todas as queries relevantes para forçar a atualização dos dados
        await queryClient.invalidateQueries();
      } catch (err) {
        console.warn('⚠️ Error syncing daily insights', err);
      }

      toast({
        title: 'Sincronização Concluída',
        description: 'Os dados do Meta Ads foram atualizados com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      console.error('❌ Falha geral na sincronização:', error);
      toast({
        title: 'Erro na Sincronização',
        description: 'Ocorreu um erro ao sincronizar os dados. Verifique o console para mais detalhes.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasActiveConnection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Métricas de Tráfego</h1>
            <p className="text-muted-foreground">Análise detalhada de campanhas, conjuntos e criativos</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Conecte suas contas do Meta Ads</h2>
              <p className="text-sm text-muted-foreground">
                Escolha as contas publicitárias diretamente daqui e sincronize campanhas, conjuntos e criativos
                sem sair da aba de métricas.
              </p>
            </div>

            {canManageMeta && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setShowConnectionDialog(true)}
                  className="gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Conectar Meta Ads
                </Button>
              </div>
            )}

            <Alert>
              <AlertDescription>
                <strong>Importante:</strong> ao finalizar a conexão, todos os dados de campanhas, conjuntos e criativos
                ficam disponíveis automaticamente para análise nesta página.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <MetaAdsConnectionDialog
          open={showConnectionDialog}
          onOpenChange={setShowConnectionDialog}
          dateRange={dateRange}
          onAccountsUpdated={handleAccountsUpdatedFromDialog}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header com Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Métricas de Tráfego</h1>
            <p className="text-muted-foreground">Análise granular por campanha, conjunto e criativo</p>
          </div>
        </div>

        {/* Filtros Inline */}
        <div className="flex flex-wrap gap-2">
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

          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Conta" />
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

          {selectedAccount !== 'all' && (
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Campanha" />
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
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <MetaAdsKPICards summary={summary} isLoading={summaryLoading} highlightCAC={true} />

      {/* Tabs de Análise */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Target className="w-4 h-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-2">
            <Layers className="w-4 h-4" />
            Conjuntos
          </TabsTrigger>
          <TabsTrigger value="creatives" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Criativos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Criativos por Leads */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Top 5 Criativos - Leads
                </CardTitle>
                <CardDescription>Criativos que mais geraram leads</CardDescription>
              </CardHeader>
              <CardContent>
                {creativePerformance?.topByLeads.slice(0, 5).map((ad, idx) => (
                  <div
                    key={ad.ad_id}
                    className="flex items-center justify-between p-3 mb-2 rounded-lg bg-gradient-to-r from-muted/50 to-accent/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-success/20 to-success/40 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-success">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {ad.ad_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ad.creative_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">{ad.leads_count}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(ad.cpl)} CPL
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Criativos por CTR */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MousePointerClick className="w-5 h-5 text-primary" />
                  Top 5 Criativos - CTR
                </CardTitle>
                <CardDescription>Criativos com melhor taxa de clique</CardDescription>
              </CardHeader>
              <CardContent>
                {creativePerformance?.topByCTR.slice(0, 5).map((ad, idx) => (
                  <div
                    key={ad.ad_id}
                    className="flex items-center justify-between p-3 mb-2 rounded-lg bg-gradient-to-r from-muted/50 to-accent/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {ad.ad_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(ad.clicks)} cliques
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{ad.ctr.toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(ad.impressions)} imp.
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Low Performers Alert */}
          {creativePerformance && creativePerformance.lowPerformers.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> {creativePerformance.lowPerformers.length} criativos com
                gasto acima de R$ 50 e zero leads. Considere pausar ou otimizar.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tab: Campanhas */}
        <TabsContent value="campaigns">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Performance por Campanha</CardTitle>
              <CardDescription>Métricas detalhadas de todas as campanhas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignPerformanceTable
                accountId={selectedAccount === 'all' ? undefined : selectedAccount}
                campaignId={selectedCampaign === 'all' ? undefined : selectedCampaign}
                dateRange={dateRange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Conjuntos de Anúncios */}
        <TabsContent value="adsets" className="space-y-6">
          {/* Filtro de Conjunto */}
          {adSets && adSets.length > 0 && (
            <div className="flex justify-end">
              <Select value={selectedAdSet} onValueChange={setSelectedAdSet}>
                <SelectTrigger className="w-[250px] bg-background">
                  <SelectValue placeholder="Filtrar conjunto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os conjuntos</SelectItem>
                  {adSets.map((adSet) => (
                    <SelectItem key={adSet.id} value={adSet.id}>
                      {adSet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Widgets Semanais (4 semanas) */}
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

          {/* Grid de Métricas de Conjuntos */}
          {adSetMetricsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : adSetMetrics && adSetMetrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adSetMetrics.map((metric) => (
                <Card key={metric.ad_set_id} className="bg-gradient-to-br from-card to-accent/20 border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-foreground line-clamp-2">
                      {metric.ad_set_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                        <div className="text-lg font-bold text-foreground">
                          {formatNumber(metric.leads_count)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CPL</div>
                        <div className="text-lg font-bold text-foreground">
                          {formatCurrency(metric.cpl)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                      <div>
                        <div className="text-muted-foreground">Gasto</div>
                        <div className="font-medium text-foreground">
                          {formatCurrency(metric.spend)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">CTR</div>
                        <div className="font-medium text-foreground">
                          {metric.ctr.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">CPC</div>
                        <div className="font-medium text-foreground">
                          {formatCurrency(metric.cpc)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhum conjunto de anúncios encontrado</p>
              <Button variant="outline" className="mt-4" onClick={handleSyncAll}>
                Sincronizar Agora
              </Button>
            </div>
          )}

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Detalhes de Conjuntos</CardTitle>
              <CardDescription>Informações completas e métricas com filtros, ordenação e paginação</CardDescription>
            </CardHeader>
            <CardContent>
              <AdSetPerformanceTable
                adAccountIds={
                  selectedAccount === 'all'
                    ? (accounts?.map((a) => a.id) ?? [])
                    : [selectedAccount]
                }
                campaignIds={
                  selectedCampaign === 'all' ? undefined : [selectedCampaign]
                }
                dateRange={dateRange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Criativos */}
        <TabsContent value="creatives">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Performance por Criativo</CardTitle>
              <CardDescription>Métricas detalhadas de todos os criativos no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <AdPerformanceTableV2
                adAccountIds={
                  selectedAccount === 'all'
                    ? (accounts?.map((a) => a.id) ?? [])
                    : [selectedAccount]
                }
                campaignIds={
                  selectedCampaign === 'all' ? undefined : [selectedCampaign]
                }
                adSetIds={
                  selectedAdSet === 'all' ? undefined : [selectedAdSet]
                }
                dateRange={dateRange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      <MetaAdsConnectionDialog
        open={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
        dateRange={dateRange}
        onAccountsUpdated={handleAccountsUpdatedFromDialog}
      />
    </>
  );
}
