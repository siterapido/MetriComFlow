import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PieChart } from "lucide-react";
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
// Removed MetricCard import; keeping CampaignTable
import { CampaignTable } from "@/components/metrics/CampaignTable";
// Meta Ads filters and visualizations
import { MetaAdsFilters, type FilterValues } from "@/components/meta-ads/MetaAdsFilters";
import { MetaAdsChart } from "@/components/meta-ads/MetaAdsChart";
import { MetaAdsKPICards } from "@/components/meta-ads/MetaAdsKPICards";
import { useFilteredInsights, useMetricsSummary, useCampaignFinancialsFiltered, useAdCampaigns, getLastNDaysDateRange } from "@/hooks/useMetaMetrics";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export default function MetricsPage() {
  // Replace simple date range with richer filters (account, campaign, period)
  const [filters, setFilters] = useState<FilterValues>({
    period: '90',
    dateRange: getLastNDaysDateRange(90),
  });

  // Fetch filtered Meta Ads data
  const { data: metaInsights, isLoading: insightsLoading } = useFilteredInsights(filters);
  const { data: metaSummary, isLoading: summaryLoading } = useMetricsSummary(filters);
  const { data: campaignFinancials, isLoading: financialsLoading } = useCampaignFinancialsFiltered({
    accountId: filters.accountId,
    campaignId: filters.campaignId,
    dateRange: filters.dateRange,
  });
  const { data: accountCampaigns } = useAdCampaigns(filters.accountId);

  const isLoading = summaryLoading || financialsLoading || insightsLoading;

  // Filter campaign financials by selected account and/or campaign
  const filteredCampaignFinancials = useMemo(() => {
      return campaignFinancials || [];
    }, [campaignFinancials]);

  // Prepare chart data for performance/distribution sections from filtered financials
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

  const COLORS = ['#2DA7FF', '#0D9DFF', '#0B7FCC', '#096199', '#074366'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Métricas Meta Ads</h1>
          <p className="text-muted-foreground">Performance e ROI das campanhas</p>
        </div>
      </div>

      {/* Interactive Filters */}
      <MetaAdsFilters filters={filters} onFiltersChange={setFilters} />

      {/* Filtered KPI Cards */}
      <MetaAdsKPICards summary={metaSummary} isLoading={summaryLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Métricas (últimos 3+ meses) */}
        <div className="lg:col-span-2">
          <MetaAdsChart data={metaInsights || []} isLoading={insightsLoading} />
        </div>

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

        {/* Investment Distribution */}
        {campaignDistributionData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Distribuição do Investimento
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Top 5 campanhas por % do orçamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RePieChart>
                  <Pie
                    data={campaignDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaignDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Investimento']}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {campaignDistributionData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground truncate flex-1">{entry.name}</span>
                    <span className="text-muted-foreground">{entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
    </div>
  );
}
