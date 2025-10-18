import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, TrendingUp, DollarSign, Target, Loader2, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardSummary, useRevenueRecords, useMetaKPIs } from "@/hooks/useDashboard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { MetaAdsFilters, type FilterValues } from "@/components/meta-ads/MetaAdsFilters";
import { MetaAdsChart } from "@/components/meta-ads/MetaAdsChart";
import { MetaAdsKPICards, MetaAdsDetailedMetrics } from "@/components/meta-ads/MetaAdsKPICards";
import { useFilteredInsights, useMetricsSummary, getLastNDaysDateRange } from "@/hooks/useMetaMetrics";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: metaKPIs, isLoading: metaLoading } = useMetaKPIs();
  const { data: revenueRecords, isLoading: revenueLoading } = useRevenueRecords(undefined, new Date().getFullYear());

  // Meta Ads filters state
  const [metaFilters, setMetaFilters] = useState<FilterValues>({
    period: '90',
    dateRange: getLastNDaysDateRange(90),
  });

  // Fetch filtered Meta Ads data
  const { data: metaInsights, isLoading: insightsLoading } = useFilteredInsights(metaFilters);
  const { data: metaSummary, isLoading: summaryMetaLoading } = useMetricsSummary(metaFilters);

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

  const isLoading = summaryLoading || metaLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Geral</h1>
          <p className="text-muted-foreground">Visão geral do faturamento e oportunidades</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Filter className="w-4 h-4" />
          Filtrar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Meta Ads KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Investimento Meta Ads"
          value={metaKPIs?.investimento_total || 0}
          format="currency"
          icon={DollarSign}
          iconColor="text-blue-500"
          subtitle="Mês atual"
        />
        <MetricCard
          title="Leads Gerados"
          value={metaKPIs?.leads_gerados || 0}
          format="number"
          icon={Users}
          iconColor="text-green-500"
          subtitle="Via Meta Ads"
        />
        <MetricCard
          title="CPL (Custo por Lead)"
          value={metaKPIs?.cpl || 0}
          format="currency"
          icon={Target}
          iconColor="text-purple-500"
          subtitle={metaKPIs?.cpl && metaKPIs.cpl < 50 ? 'Excelente' : 'Monitorar'}
        />
        <MetricCard
          title="ROAS"
          value={metaKPIs?.roas ? `${metaKPIs.roas.toFixed(2)}x` : '0x'}
          format="none"
          icon={BarChart3}
          iconColor={metaKPIs?.roas && metaKPIs.roas >= 3 ? 'text-success' : 'text-warning'}
          subtitle={metaKPIs?.roas && metaKPIs.roas >= 3 ? 'Saudável (≥3)' : 'Melhorar'}
        />
      </div>

      {/* Charts Grid */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* New Up Chart */}
          <Card className="lg:col-span-2 xl:col-span-1 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">New Up</CardTitle>
              <CardDescription className="text-muted-foreground">
                Faturamento da minha empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorNewUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2DA7FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2DA7FF" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="newUp"
                    stroke="#2DA7FF"
                    fillOpacity={1}
                    fill="url(#colorNewUp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Faturamento Clientes */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Faturamento Clientes</CardTitle>
              <CardDescription className="text-muted-foreground">
                Receita por contratos ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    formatter={(value: any) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="clientes" fill="#0D9DFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Oportunidades */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Oportunidades</CardTitle>
              <CardDescription className="text-muted-foreground">
                Pipeline de vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    formatter={(value: any) => [formatCurrency(value), '']}
                  />
                  <Line type="monotone" dataKey="oportunidades" stroke="#22C55E" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
