/**
 * Página de Métricas focada em Gestor de Tráfego
 * Análise granular por Campanha > Conjunto > Criativo
 */

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { DateRangeFilter } from '@/components/meta-ads/DateRangeFilter';
import { MetaAdsKPICards } from '@/components/meta-ads/MetaAdsKPICards';
import { CreativeGrid } from '@/components/metrics/CreativeCard';
import { CampaignPerformanceTable } from '@/components/metrics/CampaignPerformanceTable';
import { MetaAdsConnectionCard } from '@/components/metrics/MetaAdsConnectionCard';
import { useMetaConnectionStatus } from '@/hooks/useMetaConnectionStatus';
import { useMetricsSummary, useAdAccounts, useAdCampaigns } from '@/hooks/useMetaMetrics';
import { useMetaAuth } from '@/hooks/useMetaAuth';
import {
  useAdSets,
  useAds,
  useAdSetMetrics,
  useAdMetrics,
  useCreativePerformance,
  useSyncAdSets,
  useSyncAds,
  useSyncAdSetInsights,
  useSyncAdInsights,
} from '@/hooks/useAdSetsAndAds';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function TrafficMetrics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState({
    start: '2020-01-01',
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAdSet, setSelectedAdSet] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'adsets' | 'creatives'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);

  // Meta auth utilities (to ensure campaigns are present)
  const { syncCampaigns } = useMetaAuth();

  // Handle successful connection
  const handleConnectionSuccess = () => {
    // Invalidate related queries to refresh connection status
    queryClient.invalidateQueries({ queryKey: ['metaConnectionStatus'] });
    queryClient.invalidateQueries({ queryKey: ['adAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['adCampaigns'] });
    toast({
      title: 'Conexão Estabelecida',
      description: 'Meta Business conectado com sucesso! Clique em Sincronizar para atualizar os dados.',
    });
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
    selectedAdSet === 'all' ? undefined : selectedAdSet,
    dateRange,
    { enabled: hasActiveConnection && activeTab === 'adsets' }
  );

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
      campaign_id: selectedCampaign === 'all' ? undefined : selectedCampaign,
      ad_set_id: selectedAdSet === 'all' ? undefined : selectedAdSet,
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

  // Handlers
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      // Step 0: Ensure campaigns are synced for selected scope
      const accountsToSync = selectedAccount === 'all'
        ? (accounts || []).map(a => a.id)
        : [selectedAccount];

      for (const accId of accountsToSync) {
        try {
          await syncCampaigns(accId);
        } catch (err) {
          console.warn('⚠️ Error syncing campaigns for account', accId, err);
        }
      }

      // Step 1: Sync ad sets
      await syncAdSets.mutateAsync({
        campaign_ids: selectedCampaign === 'all' ? undefined : [selectedCampaign],
      });

      // Step 2: Sync ads
      await syncAds.mutateAsync({
        campaign_ids: selectedCampaign === 'all' ? undefined : [selectedCampaign],
      });

      // Step 3: Sync ad set insights (metrics)
      await syncAdSetInsights.mutateAsync({
        since: dateRange.start,
        until: dateRange.end,
        ad_account_ids: selectedAccount === 'all' ? undefined : [selectedAccount],
        campaign_ids: selectedCampaign === 'all' ? undefined : [selectedCampaign],
      });

      // Step 4: Sync ad insights (metrics)
      await syncAdInsights.mutateAsync({
        since: dateRange.start,
        until: dateRange.end,
        ad_account_ids: selectedAccount === 'all' ? undefined : [selectedAccount],
        campaign_ids: selectedCampaign === 'all' ? undefined : [selectedCampaign],
      });

      toast({
        title: 'Sincronização Completa',
        description: 'Campanhas, conjuntos, criativos e métricas sincronizados com sucesso!',
      });
    } catch (error) {
      console.error('Sync error:', error);
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

        <MetaAdsConnectionCard onConnectionSuccess={handleConnectionSuccess} />
      </div>
    );
  }

  return (
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
        </TabsContent>

        {/* Tab: Criativos */}
        <TabsContent value="creatives">
          {adMetricsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : adMetrics && adMetrics.length > 0 ? (
            <CreativeGrid ads={adMetrics} showFullMetrics={true} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhum criativo encontrado</p>
              <Button variant="outline" className="mt-4" onClick={handleSyncAll}>
                Sincronizar Agora
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
