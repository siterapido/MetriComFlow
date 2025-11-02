import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Facebook,
  CheckCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  Info,
  Loader2,
  Shield,
  Users,
  BarChart3,
  Target,
  Bug,
  PieChart,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import AdAccountsManager from "@/components/meta-ads/AdAccountsManager";
import AddAdAccountModal from "@/components/meta-ads/AddAdAccountModal";
import { AvailableAccountsDialog } from "@/components/meta-ads/AvailableAccountsDialog";
import { CampaignTable } from "@/components/metrics/CampaignTable";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFilters";
import { DateRangeFilter } from "@/components/meta-ads/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetaAdsChart } from "@/components/meta-ads/MetaAdsChart";
import { MetaAdsKPICards } from "@/components/meta-ads/MetaAdsKPICards";
import { FunnelsSection } from "@/components/meta-ads/FunnelsSection";
import { CreativePerformanceChart } from "@/components/meta-ads/CreativePerformanceChart";
import { DailyInvestmentChart } from "@/components/meta-ads/DailyInvestmentChart";
import { MetricsEvolutionChart } from "@/components/meta-ads/MetricsEvolutionChart";
import { ROIAnalysisChart } from "@/components/meta-ads/ROIAnalysisChart";
import { ConversionTimeFunnel } from "@/components/meta-ads/ConversionTimeFunnel";
import { AudienceDistribution } from "@/components/meta-ads/AudienceDistribution";
import { CostQualityChart } from "@/components/meta-ads/CostQualityChart";
import { CampaignScorecard } from "@/components/meta-ads/CampaignScorecard";
import { useFilteredInsights, useMetricsSummary, useCampaignFinancialsFiltered, useAdAccounts, useAdCampaigns, getLastNDaysDateRange, useConversionFunnel, useConversionTimeFunnel } from "@/hooks/useMetaMetrics";
import { formatCurrency } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/useUserSettings";

export default function MetaAdsConfig() {
  // Meta Auth state
  const {
    connections,
    activeAdAccounts,
    inactiveAdAccounts,
    availableAccounts,
    loading: authLoading,
    connecting,
    loadingAvailableAccounts,
    connectMetaBusiness,
    disconnectMetaBusiness,
    addAdAccount,
    deactivateAdAccount,
    activateAdAccount,
    renameAdAccount,
    listAvailableAccounts,
    syncCampaigns,
    syncDailyInsights,
    refreshData,
    hasActiveConnection,
    totalAdAccounts,
    oauthError
  } = useMetaAuth();

  const { toast } = useToast();
  const { data: settings } = useUserSettings();
  const preferredPeriod = settings?.metrics.defaultDateRange ?? "90";
  const currencyOptions = useMemo(() => {
    const currency = settings?.metrics.preferredCurrency ?? "BRL";
    const locale = currency === "USD" ? "en-US" : "pt-BR";
    return { currency, locale };
  }, [settings?.metrics.preferredCurrency]);
  const highlightCAC = settings?.metrics.highlightCAC ?? true;
  const showForecastCards = settings?.metrics.showForecastCards ?? true;

  // Config dialog states
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAvailableAccountsDialog, setShowAvailableAccountsDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Metrics filters - Default to "All Time"
  const [filters, setFilters] = useState<FilterValues>(() => ({
    period: 'all_time',
    dateRange: { start: '2020-01-01', end: new Date().toISOString().split('T')[0] },
  }));

  // Fetch metrics data
  const { data: metaInsights, isLoading: insightsLoading } = useFilteredInsights(filters);
  const { data: metaSummary, isLoading: summaryLoading } = useMetricsSummary(filters);
  const { data: campaignFinancials, isLoading: financialsLoading } = useCampaignFinancialsFiltered({
    accountId: filters.accountId,
    campaignId: filters.campaignId,
    dateRange: filters.dateRange,
  });
  const { data: conversionFunnel, isLoading: funnelLoading } = useConversionFunnel({
    accountId: filters.accountId,
    campaignId: filters.campaignId,
    dateRange: filters.dateRange,
  });
  const { data: conversionTimeFunnel, isLoading: timeLoading } = useConversionTimeFunnel({
    accountId: filters.accountId,
    campaignId: filters.campaignId,
    dateRange: filters.dateRange,
  });
  const { data: accounts } = useAdAccounts();
  const { data: accountCampaigns } = useAdCampaigns(filters.accountId);

  const isLoading = summaryLoading || financialsLoading || insightsLoading;

  useEffect(() => {
    const nextPeriod = settings?.metrics.defaultDateRange ?? "90";
    setFilters((prev) => {
      if (prev.period === nextPeriod) return prev;
      return {
        ...prev,
        period: nextPeriod,
        dateRange: getLastNDaysDateRange(Number(nextPeriod)),
      };
    });
  }, [settings?.metrics.defaultDateRange]);

  // Debug info
  const debugInfo = {
    metaAppId: import.meta.env.VITE_META_APP_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    redirectUri: import.meta.env.VITE_META_REDIRECT_URI || `${window.location.origin}/meta-ads-config`,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    environment: import.meta.env.MODE,
  };

  // Show OAuth errors via toast when present
  useEffect(() => {
    if (oauthError) {
      toast({
        title: 'Erro de OAuth',
        description: oauthError,
        variant: 'destructive',
      });
    }
  }, [oauthError]);

  // Handler functions for config
  const handleConnectMeta = async () => {
    try {
      setShowAuthModal(true);
      await connectMetaBusiness();
    } catch (error) {
      console.error('Error connecting to Meta:', error);
      toast({
        title: "Erro na Conexão",
        description: "Não foi possível conectar com o Meta Business. Verifique suas credenciais.",
        variant: "destructive",
      });
      setShowAuthModal(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectMetaBusiness(connectionId);
      toast({
        title: "Desconectado",
        description: "Conexão com Meta Business removida com sucesso.",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a conexão.",
        variant: "destructive",
      });
    }
  };

  const handleAddAccount = async (accountData: {
    external_id: string;
    business_name: string;
    provider?: string;
  }) => {
    try {
      await addAdAccount(accountData);
      toast({
        title: "Conta Adicionada",
        description: `${accountData.business_name} foi adicionada com sucesso.`,
      });
    } catch (error) {
      console.error('Error adding account:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar a conta.";
      toast({
        title: "Erro ao Adicionar Conta",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeactivateAccount = async (accountId: string) => {
    try {
      await deactivateAdAccount(accountId);
      toast({
        title: "Conta Desativada",
        description: "A conta publicitária foi desativada com sucesso.",
      });
    } catch (error) {
      console.error('Error deactivating account:', error);
      toast({
        title: "Erro ao Desativar Conta",
        description: "Não foi possível desativar a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  const handleReactivateAccount = async (accountId: string) => {
    try {
      await activateAdAccount(accountId);
      toast({
        title: "Conta Reativada",
        description: "A conta publicitária foi reativada com sucesso.",
      });
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast({
        title: "Erro ao Reativar Conta",
        description: "Não foi possível reativar a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  const handleRenameAccount = async (accountId: string, newName: string) => {
    try {
      await renameAdAccount(accountId, newName);
      toast({
        title: "Conta Renomeada",
        description: "O nome da conta foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error renaming account:', error);
      toast({
        title: "Erro ao Renomear Conta",
        description: "Não foi possível renomear a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  const handleDiscoverAccounts = async () => {
    try {
      await listAvailableAccounts();
      setShowAvailableAccountsDialog(true);
    } catch (error) {
      console.error('Error discovering accounts:', error);
      toast({
        title: "Erro ao Buscar Contas",
        description: "Não foi possível buscar as contas disponíveis no Meta Ads.",
        variant: "destructive",
      });
    }
  };

  const handleConnectAvailableAccount = async (accountData: {
    external_id: string;
    business_name: string;
  }) => {
    await handleAddAccount(accountData);
  };

  const handleSyncInsights = async () => {
    if (!filters.dateRange) {
      toast({
        title: "Período não selecionado",
        description: "Por favor, selecione um período para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);

      // Step 1: Sync campaigns first (if no campaigns exist)
      const accountsToSync = filters.accountId ? [filters.accountId] : activeAdAccounts.map(a => a.id);

      toast({
        title: "Sincronizando Campanhas",
        description: `Buscando campanhas de ${accountsToSync.length} conta(s)...`,
      });

      let totalCampaigns = 0;
      for (const accountId of accountsToSync) {
        try {
          const campaignResult = await syncCampaigns(accountId);
          totalCampaigns += campaignResult.campaignsCount || 0;
          console.log(`✅ Synced ${campaignResult.campaignsCount} campaigns for account ${accountId}`);
        } catch (campaignError) {
          console.warn(`⚠️ Error syncing campaigns for account ${accountId}:`, campaignError);
          // Continue with other accounts even if one fails
        }
      }

      if (totalCampaigns > 0) {
        toast({
          title: "Campanhas Sincronizadas",
          description: `${totalCampaigns} campanha(s) encontrada(s). Agora sincronizando métricas...`,
        });
      } else {
        toast({
          title: "Atenção",
          description: "Nenhuma campanha encontrada nas contas. Verifique se as contas têm campanhas ativas no Meta Ads.",
          variant: "destructive",
        });
      }

      // Step 2: Sync insights for the date range
      toast({
        title: "Sincronizando Métricas",
        description: "Baixando dados de performance...",
      });

      const result = await syncDailyInsights({
        since: filters.dateRange.start,
        until: filters.dateRange.end,
        accountIds: filters.accountId ? [filters.accountId] : undefined,
      });

      toast({
        title: "Sincronização Concluída",
        description: `${totalCampaigns} campanhas e métricas atualizadas!`,
      });

      // Refresh data after sync
      await refreshData();

    } catch (error) {
      console.error('Error syncing data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      toast({
        title: "Erro na Sincronização",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Prepare chart data
  const filteredCampaignFinancials = useMemo(() => {
    return campaignFinancials || [];
  }, [campaignFinancials]);

  const campaignInvestmentData = useMemo(() => {
    if (!filteredCampaignFinancials) return [];
    return filteredCampaignFinancials
      .filter(c => c.investimento > 0)
      .slice(0, 10)
      .map(c => ({
        name: c.campaign_name.length > 25 ? c.campaign_name.substring(0, 25) + '...' : c.campaign_name,
        Investimento: c.investimento,
        Faturamento: c.faturamento,
      }));
  }, [filteredCampaignFinancials]);

  const campaignDistributionData = useMemo(() => {
    if (!filteredCampaignFinancials) return [];
    const total = filteredCampaignFinancials.reduce((sum, c) => sum + c.investimento, 0);
    return filteredCampaignFinancials
      .filter(c => c.investimento > 0)
      .slice(0, 5)
      .map(c => ({
        name: c.campaign_name,
        value: c.investimento,
        percentage: total > 0 ? ((c.investimento / total) * 100).toFixed(1) : '0.0',
      }));
  }, [filteredCampaignFinancials]);

  // Conversion funnel data from CRM
  const conversionFunnelData = useMemo(() => {
    return conversionFunnel || {
      novo: 0,
      contato_inicial: 0,
      qualificado: 0,
      proposta: 0,
      negociacao: 0,
      fechado_ganho: 0,
    };
  }, [conversionFunnel]);

  // Engagement funnel data from Meta Ads metrics
  const engagementFunnelData = useMemo(() => {
    return {
      impressions: metaSummary?.current.impressions || 0,
      clicks: metaSummary?.current.clicks || 0,
      leads: metaSummary?.current.leads || 0,
    };
  }, [metaSummary]);

  // Prepare creative performance data (top campaigns by CTR and impressions)
  const creativePerformanceData = useMemo(() => {
    if (!filteredCampaignFinancials) return [];
    return filteredCampaignFinancials
      .filter(c => c.impressions > 0)
      .slice(0, 8)
      .map(c => ({
        name: c.campaign_name.length > 20 ? c.campaign_name.substring(0, 20) + '...' : c.campaign_name,
        ctr: c.ctr,
        impressions: c.impressions,
      }));
  }, [filteredCampaignFinancials]);

  // Prepare daily investment breakdown
  const dailyInvestmentData = useMemo(() => {
    if (!metaInsights || metaInsights.length === 0) return [];

    const total = metaInsights.reduce((sum, day) => sum + (day.spend || 0), 0);
    const sortedDays = [...metaInsights]
      .sort((a, b) => (b.spend || 0) - (a.spend || 0))
      .slice(0, 10);

    return sortedDays.map(day => ({
      date: day.date,
      value: day.spend || 0,
      percentage: total > 0 ? (((day.spend || 0) / total) * 100).toFixed(1) : '0.0',
    }));
  }, [metaInsights]);

  // Prepare metrics evolution data
  const metricsEvolutionData = useMemo(() => {
    if (!metaInsights || metaInsights.length === 0) return [];

    return metaInsights.map(day => ({
      date: day.date,
      cpl: day.cpl || 0,
      ctr: day.ctr || 0,
      conversion_rate: day.leads_count > 0 && day.clicks > 0 ? (day.leads_count / day.clicks) * 100 : 0,
      roas: 0, // TODO: Calculate from CRM data
    }));
  }, [metaInsights]);

  // Prepare ROI analysis data
  const roiAnalysisData = useMemo(() => {
    if (!filteredCampaignFinancials) return [];
    return filteredCampaignFinancials
      .filter(c => c.investimento > 0)
      .slice(0, 15)
      .map(c => ({
        campaign_name: c.campaign_name,
        investimento: c.investimento,
        faturamento: c.faturamento,
        leads: c.leads_gerados,
        roas: c.roas || 0,
      }));
  }, [filteredCampaignFinancials]);

  // Prepare cost vs quality data
  const costQualityData = useMemo(() => {
    if (!filteredCampaignFinancials) return [];
    return filteredCampaignFinancials
      .filter(c => c.leads_gerados > 0)
      .map(c => ({
        campaign_name: c.campaign_name,
        cpl: c.cpl || 0,
        conversion_rate: c.taxa_conversao,
        leads: c.leads_gerados,
      }));
  }, [filteredCampaignFinancials]);

  // Prepare audience distribution (real data from Meta API would be displayed here)
  // Currently empty as demographic data is not yet available from Meta Insights API
  const audienceData = useMemo(() => ({
    byAge: [],
    byGender: [],
    byDevice: [],
    byLocation: [],
  }), []);

  const COLORS = ['#2DA7FF', '#0D9DFF', '#0B7FCC', '#096199', '#074366'];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com filtros integrados */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <Facebook className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Métricas</h1>
            <p className="text-muted-foreground">Performance e análise de campanhas</p>
          </div>
        </div>

        {/* Filtros minimalistas inline + botões */}
        <div className="flex flex-wrap gap-2 items-center">
          {hasActiveConnection && (
            <>
              <DateRangeFilter
                value={filters.dateRange}
                onChange={(dateRange) => setFilters({ ...filters, dateRange })}
              />

              <Select
                value={filters.accountId || 'all'}
                onValueChange={(value) => setFilters({
                  ...filters,
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

              {filters.accountId && (
                <Select
                  value={filters.campaignId || 'all'}
                  onValueChange={(value) => setFilters({
                    ...filters,
                    campaignId: value === 'all' ? undefined : value
                  })}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {accountCampaigns?.map((campaign) => (
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
                disabled={isSyncing || !filters.dateRange}
                className="gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Atualizar Dados'}
              </Button>
            </>
          )}

        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
              {!hasActiveConnection && (
                <Badge variant="destructive" className="ml-2">
                  Não conectado
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-primary" />
                Configurações Meta Business
              </DialogTitle>
              <DialogDescription>
                Gerencie sua integração com o Meta Business Manager
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {oauthError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{oauthError}</AlertDescription>
                </Alert>
              )}

              {/* Connection Status */}
              <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">Meta Business Manager</h3>
                        <p className="text-sm text-muted-foreground">
                          {hasActiveConnection ? 'Conectado' : 'Não conectado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasActiveConnection ? (
                        <>
                          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-success">Ativo</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                          <span className="text-sm font-medium text-muted-foreground">Inativo</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!hasActiveConnection ? (
                    <Button
                      onClick={handleConnectMeta}
                      disabled={connecting}
                      className="gap-2 bg-primary hover:bg-primary/90 w-full"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Facebook className="w-4 h-4" />
                          Conectar com Meta Business
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-success font-medium">Conectado com sucesso</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Connected Accounts */}
              {hasActiveConnection && connections.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Users className="w-5 h-5 text-primary" />
                      Conexões Ativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {connections.map((connection) => (
                      <div key={connection.id} className="flex items-center justify-between p-4 border-border rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Facebook className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{connection.meta_user_name}</p>
                            <p className="text-sm text-muted-foreground">{connection.meta_user_email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          Desconectar
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Ad Accounts */}
              {hasActiveConnection && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-foreground">Contas Publicitárias</CardTitle>
                        <CardDescription>Gerencie suas contas do Meta Ads</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDiscoverAccounts}
                          disabled={loadingAvailableAccounts}
                          className="gap-2"
                        >
                          {loadingAvailableAccounts ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-4 h-4" />
                              Descobrir Contas
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowAddAccountModal(true)}
                          className="gap-2"
                        >
                          <Target className="w-4 h-4" />
                          Adicionar Manualmente
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeAdAccounts.length > 0 ? (
                      <div className="space-y-2">
                        {activeAdAccounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-3 border-border rounded-lg bg-muted">
                            <div>
                              <p className="font-medium text-foreground">{account.business_name}</p>
                              <p className="text-xs text-muted-foreground">{account.external_id}</p>
                            </div>
                            <Badge className="bg-success text-success-foreground">Ativa</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma conta publicitária conectada
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Debug Info */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Bug className="w-4 h-4 text-warning" />
                      Informações de Debug
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDebug(!showDebug)}
                    >
                      {showDebug ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </CardHeader>
                {showDebug && (
                  <CardContent className="space-y-3">
                    <div className="text-xs font-mono bg-muted p-3 rounded space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Meta App ID:</span>
                        <span className="font-semibold text-foreground">{debugInfo.metaAppId || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Environment:</span>
                        <span className="font-semibold text-foreground">{debugInfo.environment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contas:</span>
                        <span className="font-semibold text-foreground">{totalAdAccounts}</span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Show message if not connected */}
      {!hasActiveConnection && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Conecte-se ao Meta Business Manager para visualizar suas métricas.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfigDialog(true)}
              className="ml-4"
            >
              Conectar Agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Content - Only show if connected */}
      {hasActiveConnection && (
        <>
          {/* Filtered KPI Cards */}
          <MetaAdsKPICards
            summary={metaSummary}
            isLoading={summaryLoading}
            currencyOptions={currencyOptions}
            highlightCAC={highlightCAC}
          />

          {/* Funnels Section */}
          <FunnelsSection
            engagementData={engagementFunnelData}
            conversionData={conversionFunnelData}
            isLoadingEngagement={summaryLoading}
            isLoadingConversion={funnelLoading}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creative Performance Chart */}
            <CreativePerformanceChart
              data={creativePerformanceData}
              isLoading={financialsLoading}
            />

            {/* Daily Investment Breakdown */}
            <DailyInvestmentChart
              data={dailyInvestmentData}
              isLoading={insightsLoading}
            />

            {/* Campaign Performance */}
            {campaignInvestmentData.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Performance por Campanha</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Top 10 campanhas por investimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={campaignInvestmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={150} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#F9FAFB"
                        }}
                        formatter={(value: any) => [formatCurrency(value), '']}
                      />
                      <Legend />
                      <Bar dataKey="Investimento" fill="#2DA7FF" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Faturamento" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Historical Metrics Chart - Full Width */}
          <MetaAdsChart
            data={metaInsights || []}
            isLoading={insightsLoading}
            currencyOptions={currencyOptions}
            highlightCAC={highlightCAC}
          />

          {/* New Charts Section */}
          {/* Metrics Evolution */}
          <MetricsEvolutionChart
            data={metricsEvolutionData}
            isLoading={insightsLoading}
          />

          {/* ROI Analysis & Cost Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ROIAnalysisChart
              data={roiAnalysisData}
              isLoading={financialsLoading}
            />

            <CostQualityChart
              data={costQualityData}
              isLoading={financialsLoading}
            />
          </div>

          {/* Conversion Time & Audience */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConversionTimeFunnel
              data={conversionTimeFunnel || {
                lead_to_contact: 0,
                contact_to_qualified: 0,
                qualified_to_proposal: 0,
                proposal_to_negotiation: 0,
                negotiation_to_closed: 0,
              }}
              isLoading={timeLoading}
            />

            <AudienceDistribution
              data={audienceData}
              isLoading={false}
            />
          </div>

          {/* Campaign Scorecard */}
          <CampaignScorecard
            data={filteredCampaignFinancials || []}
            cplTarget={50}
            isLoading={financialsLoading}
          />

          {/* Campaign Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Detalhamento de Campanhas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Métricas completas de todas as campanhas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignTable
                campaigns={filteredCampaignFinancials || []}
                loading={financialsLoading}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Account Modal */}
      <AddAdAccountModal
        open={showAddAccountModal}
        onOpenChange={setShowAddAccountModal}
        onAdd={handleAddAccount}
        inactiveAccounts={inactiveAdAccounts}
        onReactivate={handleReactivateAccount}
      />

      {/* Available Accounts Dialog */}
      <AvailableAccountsDialog
        open={showAvailableAccountsDialog}
        onOpenChange={setShowAvailableAccountsDialog}
        onConnect={handleConnectAvailableAccount}
        onRefresh={listAvailableAccounts}
        accounts={availableAccounts}
        isLoading={loadingAvailableAccounts}
      />
    </div>
  );
}
