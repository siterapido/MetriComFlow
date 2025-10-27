import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EngagementFunnel } from "@/components/metrics/meta/EngagementFunnel";
import { CreativeInvestmentChart } from "@/components/metrics/meta/CreativeInvestmentChart";
import { CampaignOverviewTable } from "@/components/metrics/meta/CampaignOverviewTable";
import { InvestmentByDayPie } from "@/components/metrics/meta/InvestmentByDayPie";
import { MetricsCardGroup } from "@/components/metrics/meta/MetricsCardGroup";
import { InvestmentTrendChart } from "@/components/metrics/meta/InvestmentTrendChart";
import {
  useMetaCampaignOverview,
  useMetaCreativeRanking,
  useMetaInvestmentSlices,
  useMetaInvestmentTimeline,
  useMetaSummary,
} from "@/hooks/useMetaMetricsV2";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import type { MetaCampaignOverviewRow } from "@/lib/metaMetrics";
import { formatDateTime } from "@/lib/formatters";

type CampaignFilter = "all" | string;

const periodOptions = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function MetricsPage() {
  const [period, setPeriod] = useState("90");
  const [campaignId, setCampaignId] = useState<CampaignFilter>("all");

  const { hasActiveConnection, isLoading: statusLoading, isFetching: statusFetching } =
    useMetaConnectionStatus();
  const statusPending = statusLoading || statusFetching;

  const queryFilters = useMemo(
    () => ({
      period,
      campaignId: campaignId === "all" ? undefined : campaignId,
    }),
    [period, campaignId],
  );

  const summaryQuery = useMetaSummary(queryFilters, { enabled: hasActiveConnection });
  const creativesQuery = useMetaCreativeRanking(queryFilters, { enabled: hasActiveConnection });
  const campaignsQuery = useMetaCampaignOverview(queryFilters, { enabled: hasActiveConnection });
  const investmentSlicesQuery = useMetaInvestmentSlices(queryFilters, { enabled: hasActiveConnection });
  const investmentTimelineQuery = useMetaInvestmentTimeline(queryFilters, { enabled: hasActiveConnection });

  const isLoading =
    summaryQuery.isLoading ||
    creativesQuery.isLoading ||
    campaignsQuery.isLoading ||
    investmentSlicesQuery.isLoading ||
    investmentTimelineQuery.isLoading;

  const campaigns = campaignsQuery.data ?? [];
  const availableCampaigns = campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name }));

  const filteredCampaigns = useMemo<MetaCampaignOverviewRow[]>(() => {
    if (campaignId === "all") return campaigns;
    return campaigns.filter((campaign) => campaign.id === campaignId);
  }, [campaigns, campaignId]);

  if (statusPending) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasActiveConnection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Métricas Meta Ads</h1>
          <p className="text-muted-foreground">
            Visualize as métricas das campanhas após conectar sua conta Meta.
          </p>
        </div>
        <Alert>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Conecte-se ao Meta Business Manager para acompanhar os indicadores de anúncios.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="/meta-ads-config">Configurar Meta Ads</a>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatório de Campanhas de Anúncios - Meta</h1>
          <p className="text-muted-foreground">Painel consolidado das métricas chave de engajamento e custo.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px] bg-card text-foreground">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={campaignId}
            onValueChange={(value: string) => setCampaignId(value as CampaignFilter)}
          >
            <SelectTrigger className="w-[240px] bg-card text-foreground">
              <SelectValue placeholder="Selecione a campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {availableCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MetricsCardGroup
        primary={summaryQuery.data?.primary ?? []}
        cost={summaryQuery.data?.cost ?? []}
        isLoading={summaryQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EngagementFunnel stages={summaryQuery.data?.funnel ?? []} isLoading={summaryQuery.isLoading} />
        <CreativeInvestmentChart data={creativesQuery.data ?? []} isLoading={creativesQuery.isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Visão geral por campanha</CardTitle>
            <CardDescription className="text-muted-foreground">
              Impressões, cliques e custos por campanha ativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignOverviewTable data={filteredCampaigns} isLoading={campaignsQuery.isLoading} />
          </CardContent>
        </Card>
        <InvestmentByDayPie data={investmentSlicesQuery.data ?? []} isLoading={investmentSlicesQuery.isLoading} />
      </div>

      <InvestmentTrendChart data={investmentTimelineQuery.data ?? []} isLoading={investmentTimelineQuery.isLoading} />

      <p className="text-xs text-muted-foreground">
        Data da última atualização:{" "}
        {summaryQuery.data?.updatedAt ? formatDateTime(summaryQuery.data.updatedAt) : "—"}
      </p>
    </div>
  );
}

