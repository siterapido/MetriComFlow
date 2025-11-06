/**
 * Página de Métricas - Foco em Conjuntos de Anúncios e Criativos
 * Design: shadcn-ui com design system InsightFy
 */

import { useState, useMemo } from "react";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, AlertCircle, BarChart3, Layers, Image as ImageIcon, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/meta-ads/DateRangeFilter";
import { AdSetPerformanceTable } from "@/components/metrics/AdSetPerformanceTable";
import { AdPerformanceTableV2 } from "@/components/metrics/AdPerformanceTableV2";
import { MetaAdsConnectionDialog } from "@/components/metrics/MetaAdsConnectionDialog";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import {
  useAdSets,
  useAdSetMetrics,
  useAdMetrics,
  useCreativePerformance,
  getLastNDays,
} from "@/hooks/useAdSetsAndAds";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useQueryClient } from "@tanstack/react-query";

export default function MetricsPageNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [dateRange, setDateRange] = useState(getLastNDays(30));
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedAdSet, setSelectedAdSet] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "adsets" | "creatives">("overview");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  // Hooks
  const { hasActiveConnection, isLoading: statusLoading } = useMetaConnectionStatus();
  const { syncCampaigns, syncDailyInsights } = useMetaAuth();
  const { data: accounts } = useAdAccounts({ enabled: hasActiveConnection });
  const { data: campaigns } = useAdCampaigns(
    selectedAccount === "all" ? undefined : selectedAccount,
    { enabled: hasActiveConnection }
  );
  const { data: adSets } = useAdSets(
    selectedCampaign === "all" ? undefined : selectedCampaign,
    { enabled: hasActiveConnection && selectedCampaign !== "all" }
  );

  // Metrics
  const { data: adSetMetrics, isLoading: adSetMetricsLoading } = useAdSetMetrics(
    {
      accountId: selectedAccount === "all" ? undefined : selectedAccount,
      campaignId: selectedCampaign === "all" ? undefined : selectedCampaign,
      adSetId: selectedAdSet === "all" ? undefined : selectedAdSet,
      dateRange,
    },
    { enabled: hasActiveConnection }
  );

  const { data: adMetrics, isLoading: adMetricsLoading } = useAdMetrics(
    {
      accountId: selectedAccount === "all" ? undefined : selectedAccount,
      campaignId: selectedCampaign === "all" ? undefined : selectedCampaign,
      adSetId: selectedAdSet === "all" ? undefined : selectedAdSet,
      dateRange,
    },
    { enabled: hasActiveConnection }
  );

  const { data: creativePerformance, isLoading: creativePerformanceLoading } = useCreativePerformance(
    dateRange,
    { enabled: hasActiveConnection && activeTab === "overview" }
  );

  // Computed values
  const aggregatedMetrics = useMemo(() => {
    if (!adSetMetrics || adSetMetrics.length === 0) {
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalLeads: 0,
        avgCPL: 0,
        avgCTR: 0,
        avgCPC: 0,
      };
    }

    const totals = adSetMetrics.reduce(
      (acc, metric) => ({
        spend: acc.spend + Number(metric.spend || 0),
        impressions: acc.impressions + Number(metric.impressions || 0),
        clicks: acc.clicks + Number(metric.clicks || 0),
        leads: acc.leads + Number(metric.leads_count || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, leads: 0 }
    );

    return {
      totalSpend: totals.spend,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalLeads: totals.leads,
      avgCPL: totals.leads > 0 ? totals.spend / totals.leads : 0,
      avgCTR: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCPC: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    };
  }, [adSetMetrics]);

  // Handlers
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const accountsToSync =
        selectedAccount === "all" ? (accounts || []).map((a) => a.id) : [selectedAccount];

      if (accountsToSync.length === 0) {
        toast({
          title: "Nenhuma conta ativa",
          description: "Você precisa ter pelo menos uma conta Meta Ads ativa.",
          variant: "destructive",
        });
        return;
      }

      // Sync campaigns, ad sets, and ads
      for (const accId of accountsToSync) {
        await syncCampaigns(accId);
      }

      // Sync metrics
      await syncDailyInsights({
        since: dateRange.from.toISOString().split("T")[0],
        until: dateRange.to.toISOString().split("T")[0],
        accountIds: accountsToSync,
      });

      await queryClient.invalidateQueries();

      toast({
        title: "Sincronização Concluída",
        description: "Todos os dados foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro na sincronização:", error);
      toast({
        title: "Erro na Sincronização",
        description: "Ocorreu um erro ao sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAccountsUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["metaConnectionStatus"] });
    queryClient.invalidateQueries({ queryKey: ["adAccounts"] });
    setShowConnectionDialog(false);
  };

  // Loading state
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No connection state
  if (!hasActiveConnection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Métricas de Anúncios</h1>
            <p className="text-muted-foreground">Análise detalhada de conjuntos de anúncios e criativos</p>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Conecte suas contas do Meta Ads</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Sincronize suas campanhas, conjuntos de anúncios e criativos para análise completa de performance.
                </p>
              </div>
              <Button onClick={() => setShowConnectionDialog(true)} className="gap-2">
                <Target className="w-4 h-4" />
                Conectar Meta Ads
              </Button>
            </div>
          </CardContent>
        </Card>

        <MetaAdsConnectionDialog
          open={showConnectionDialog}
          onOpenChange={setShowConnectionDialog}
          dateRange={dateRange}
          onAccountsUpdated={handleAccountsUpdated}
        />
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Métricas de Anúncios</h1>
            <p className="text-muted-foreground mt-1">Análise detalhada de conjuntos de anúncios e criativos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          <Select value={selectedAccount} onValueChange={(v) => {
            setSelectedAccount(v);
            setSelectedCampaign("all");
            setSelectedAdSet("all");
          }}>
            <SelectTrigger className="w-[200px] bg-card">
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

          <Select
            value={selectedCampaign}
            onValueChange={(v) => {
              setSelectedCampaign(v);
              setSelectedAdSet("all");
            }}
            disabled={selectedAccount === "all"}
          >
            <SelectTrigger className="w-[220px] bg-card">
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

          {selectedCampaign !== "all" && adSets && adSets.length > 0 && (
            <Select value={selectedAdSet} onValueChange={setSelectedAdSet}>
              <SelectTrigger className="w-[220px] bg-card">
                <SelectValue placeholder="Conjunto" />
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
          )}

          <Button
            variant="outline"
            size="default"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="pb-2">
            <CardDescription>Investimento Total</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatCurrency(aggregatedMetrics.totalSpend)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="pb-2">
            <CardDescription>Leads Gerados</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatNumber(aggregatedMetrics.totalLeads)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="pb-2">
            <CardDescription>CPL Médio</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatCurrency(aggregatedMetrics.avgCPL)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="pb-2">
            <CardDescription>CTR Médio</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {aggregatedMetrics.avgCTR.toFixed(2)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
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
          {creativePerformanceLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Criativos por Leads */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-success" />
                      Top 5 Criativos - Leads
                    </CardTitle>
                    <CardDescription>Criativos que mais geraram leads no período</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {creativePerformance?.topByLeads.slice(0, 5).map((ad, idx) => (
                      <div
                        key={ad.ad_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-accent/10 hover-lift"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-success/20 to-success/40 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-success">#{idx + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {ad.ad_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ad.creative_type || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-lg font-bold text-success">{ad.leads_count}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(ad.cpl)} CPL</p>
                        </div>
                      </div>
                    ))}
                    {(!creativePerformance?.topByLeads || creativePerformance.topByLeads.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Criativos por CTR */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Top 5 Criativos - CTR
                    </CardTitle>
                    <CardDescription>Criativos com melhor taxa de clique</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {creativePerformance?.topByCTR.slice(0, 5).map((ad, idx) => (
                      <div
                        key={ad.ad_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/50 to-accent/10 hover-lift"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {ad.ad_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(ad.clicks)} cliques
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-lg font-bold text-primary">{ad.ctr.toFixed(2)}%</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(ad.impressions)} imp.
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!creativePerformance?.topByCTR || creativePerformance.topByCTR.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Low Performers Alert */}
              {creativePerformance && creativePerformance.lowPerformers.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> {creativePerformance.lowPerformers.length} criativos com gasto acima de R$ 50 e zero leads. Considere pausar ou otimizar.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab: Conjuntos de Anúncios */}
        <TabsContent value="adsets" className="space-y-6">
          {selectedAccount === "all" ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Selecione uma conta de anúncios específica para visualizar os conjuntos de anúncios.
              </AlertDescription>
            </Alert>
          ) : (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Performance por Conjunto de Anúncios</CardTitle>
                <CardDescription>
                  Métricas detalhadas de todos os conjuntos no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdSetPerformanceTable
                  adAccountIds={[selectedAccount]}
                  campaignIds={
                    selectedCampaign === "all" ? undefined : selectedCampaign ? [selectedCampaign] : undefined
                  }
                  dateRange={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Criativos */}
        <TabsContent value="creatives" className="space-y-6">
          {selectedAccount === "all" ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Selecione uma conta de anúncios específica para visualizar os criativos.
              </AlertDescription>
            </Alert>
          ) : (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Performance por Criativo</CardTitle>
                <CardDescription>
                  Métricas detalhadas de todos os anúncios/criativos no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdPerformanceTableV2
                  adAccountIds={[selectedAccount]}
                  campaignIds={
                    selectedCampaign === "all" ? undefined : selectedCampaign ? [selectedCampaign] : undefined
                  }
                  dateRange={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Connection Dialog */}
      <MetaAdsConnectionDialog
        open={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
        dateRange={dateRange}
        onAccountsUpdated={handleAccountsUpdated}
      />
    </div>
  );
}
