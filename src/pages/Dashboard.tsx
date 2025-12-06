import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { type FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
import { getLastNDaysDateRange } from "@/hooks/useMetaMetrics";
import { useToast } from "@/hooks/use-toast";
import { UnifiedROICards } from "@/components/dashboard/UnifiedROICards";
import { UnifiedMetricsChart } from "@/components/dashboard/UnifiedMetricsChart";
import { RoasCplChart } from "@/components/dashboard/RoasCplChart";
import { LeadsConversionChart } from "@/components/dashboard/LeadsConversionChart";
import { PipelineStageChart } from "@/components/dashboard/PipelineStageChart";
import { SalesPerformanceChart } from "@/components/dashboard/SalesPerformanceChart";
import { ActivityOverviewChart } from "@/components/dashboard/ActivityOverviewChart";
import { LossReasonChart } from "@/components/dashboard/LossReasonChart";
import { useUnifiedMetrics, useUnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
import { useDashboardSummary, usePipelineMetrics } from "@/hooks/useDashboard";
import { useSalesDashboardMetrics } from "@/hooks/useSalesDashboardMetrics";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { motion } from "framer-motion";

const datePresets = [
  { label: "Últimos 7 dias", value: "7" },
  { label: "Últimos 30 dias", value: "30" },
  { label: "Últimos 90 dias", value: "90" },
];

const viewOptions = [
  { label: "Dashboard CRM + Ads", value: "unified" },
  { label: "Dashboard CRM", value: "crm" },
  { label: "Dashboard Ads", value: "ads" },
];

export default function Dashboard() {
  const { toast } = useToast();
  const [rangePreset, setRangePreset] = useState("30");
  const [viewMode, setViewMode] = useState("unified");
  const [metaFilters, setMetaFilters] = useState<FilterValues>({
    dateRange: getLastNDaysDateRange(30),
  });

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: pipelineMetrics, isLoading: pipelineLoading } = usePipelineMetrics({
    dateRange: metaFilters.dateRange,
  });

  const { salesPerformance, activityMetrics, lossAnalysis, isLoading: salesLoading } = useSalesDashboardMetrics(metaFilters.dateRange || getLastNDaysDateRange(30));

  const { data: unifiedMetrics, isLoading: unifiedLoading } = useUnifiedMetrics(
    {
      dateRange: metaFilters.dateRange,
      accountId: metaFilters.accountId,
      campaignId: metaFilters.campaignId,
    },
    { enabled: true }
  );

  const { data: dailyBreakdown, isLoading: dailyLoading } = useUnifiedDailyBreakdown(
    {
      dateRange: metaFilters.dateRange,
      accountId: metaFilters.accountId,
      campaignId: metaFilters.campaignId,
    },
    { enabled: true }
  );

  const roasCplData = useMemo(
    () =>
      (dailyBreakdown || []).map((day) => ({
        date: day.date,
        roas: day.roas ?? 0,
        cpl: day.cpl ?? 0,
      })),
    [dailyBreakdown]
  );

  const leadConversionData = useMemo(
    () =>
      (dailyBreakdown || []).map((day) => ({
        date: day.date,
        metaLeads: day.meta_leads,
        crmLeads: day.crm_leads_created,
        closedWon: day.crm_leads_closed_won,
      })),
    [dailyBreakdown]
  );

  const pipelineStageData = useMemo(
    () =>
      pipelineMetrics
        ? [
            { stage: "Novo", value: pipelineMetrics.stages.novo_lead.count },
            { stage: "Qualificação", value: pipelineMetrics.stages.qualificacao.count },
            { stage: "Proposta", value: pipelineMetrics.stages.proposta.count },
            { stage: "Negociação", value: pipelineMetrics.stages.negociacao.count },
            { stage: "Fechado", value: pipelineMetrics.stages.fechado_ganho.count },
          ]
        : [],
    [pipelineMetrics]
  );

  const handleDateChange = (value: string) => {
    setRangePreset(value);
    const days = parseInt(value, 10);
    const dateRange = getLastNDaysDateRange(days);
    setMetaFilters((prev) => ({ ...prev, dateRange }));
  };

  const handleRefresh = () => {
    toast({ title: "Atualizando dados", description: "Sincronizando CRM e Meta Ads para o período selecionado." });
  };

  if (summaryLoading || unifiedLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
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

  const activeLeadCount =
    (pipelineMetrics?.stages.novo_lead.count ?? 0) +
    (pipelineMetrics?.stages.qualificacao.count ?? 0) +
    (pipelineMetrics?.stages.proposta.count ?? 0) +
    (pipelineMetrics?.stages.negociacao.count ?? 0);

  const crmHighlights = [
    { label: "Faturamento do mês (CRM)", value: formatCurrency(summary?.faturamento_mensal || 0) },
    { label: "Faturamento no ano", value: formatCurrency(summary?.faturamento_anual || 0) },
    { label: "Oportunidades ativas", value: formatNumber(summary?.oportunidades_ativas || 0) },
    { label: "Pipeline aberto", value: formatCurrency(summary?.pipeline_value || pipelineMetrics?.active_pipeline_value || 0) },
  ];

  const getDashboardTitle = () => {
    switch (viewMode) {
      case "crm":
        return "Dashboard CRM";
      case "ads":
        return "Dashboard Ads";
      default:
        return "Dashboard CRM + Ads";
    }
  };

  const getDashboardDescription = () => {
    switch (viewMode) {
      case "crm":
        return "Foco total na gestão de leads, pipeline e vendas.";
      case "ads":
        return "Análise detalhada de investimento, retorno e performance de anúncios.";
      default:
        return "Visão unificada conectando investimento em marketing com retorno em vendas.";
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {getDashboardTitle()}
            <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
          </h2>
          <p className="text-muted-foreground">
            {getDashboardDescription()}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[180px] bg-card/60 border-white/5 text-sm">
              <SelectValue placeholder="Tipo de Dashboard" />
            </SelectTrigger>
            <SelectContent className="bg-popover/80 backdrop-blur border-white/10">
              {viewOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-sm">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rangePreset} onValueChange={handleDateChange}>
            <SelectTrigger className="w-[180px] bg-card/60 border-white/5 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-popover/80 backdrop-blur border-white/10">
              {datePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value} className="text-sm">
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10 border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Top Section: Highlights & ROI */}
      <div className="grid gap-6">
        {viewMode !== "ads" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {crmHighlights.map((item) => (
              <Card key={item.label} className="glass-card border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {viewMode !== "crm" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <UnifiedROICards unifiedMetrics={unifiedMetrics} loading={unifiedLoading} />
          </motion.div>
        )}
      </div>

      {/* Main Chart Area */}
      <div className="grid gap-6 lg:grid-cols-7">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`
            ${viewMode === "ads" ? "col-span-7" : "col-span-4 lg:col-span-5"}
          `}
        >
          {viewMode === "crm" ? (
             <div className="glass-card rounded-3xl p-6 border-white/5 h-[460px]">
                {/* Reusing LeadsConversionChart, stripping styles to fit seamlessly */}
                 <div className="h-full w-full">
                    <LeadsConversionChart 
                      data={leadConversionData} 
                      height="380px" 
                      className="h-full shadow-none border-0 bg-transparent p-0" 
                    /> 
                 </div>
             </div>
          ) : (
            <div className="glass-card rounded-3xl p-6 border-white/5 h-[460px]">
              <UnifiedMetricsChart data={dailyBreakdown || []} isLoading={dailyLoading} />
            </div>
          )}
        </motion.div>

        {viewMode !== "ads" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="col-span-4 lg:col-span-2 space-y-4"
          >
            <Card className="glass-card border-white/5 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-secondary" />
                  Saúde do Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                  <p className="text-lg font-semibold">{formatNumber(activeLeadCount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                  <p className="text-lg font-semibold">{formatCurrency(pipelineMetrics?.average_deal_size || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversão</p>
                  <p className="text-lg font-semibold">{`${(pipelineMetrics?.conversion_rate || 0).toFixed(1)}%`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor em aberto</p>
                  <p className="text-lg font-semibold">{formatCurrency(pipelineMetrics?.active_pipeline_value || 0)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* CRM Detailed Charts Row - Only visible in CRM mode */}
      {viewMode === "crm" && (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 lg:grid-cols-3"
        >
            <SalesPerformanceChart data={salesPerformance || []} />
            <ActivityOverviewChart data={activityMetrics || []} />
            <LossReasonChart data={lossAnalysis || []} />
        </motion.div>
      )}

      {/* Bottom Charts Area */}
      <div className={`grid gap-6 ${viewMode === 'unified' ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        {viewMode !== "crm" && (
          <RoasCplChart data={roasCplData} />
        )}

        {/* Show Leads chart here only if NOT in main area (so if unified or ads) 
            Wait, if ads, we might want it. If unified, we want it.
            If CRM, it is in main area, so don't show here.
        */}
        {viewMode !== "crm" && (
          <LeadsConversionChart data={leadConversionData} />
        )}

        {viewMode !== "ads" && (
           <PipelineStageChart data={pipelineStageData} />
        )}
      </div>
    </div>
  );
}
