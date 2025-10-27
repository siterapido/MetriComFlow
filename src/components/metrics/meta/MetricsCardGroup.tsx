import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { MetaPrimaryMetric } from "@/lib/metaMetrics";

type MetricsCardGroupProps = {
  primary: MetaPrimaryMetric[];
  cost: MetaPrimaryMetric[];
  isLoading?: boolean;
};

const currencyFallback = { currency: "BRL", locale: "pt-BR" } as const;

const formatMetricValue = (metric: MetaPrimaryMetric) => {
  switch (metric.formatter) {
    case "currency":
      return formatCurrency(metric.value, metric.currencyOptions ?? currencyFallback);
    case "percentage":
      return `${metric.value.toFixed(2)}${metric.suffix ?? "%"}`;
    default:
      return `${metric.prefix ?? ""}${formatNumber(metric.value)}${metric.suffix ?? ""}`;
  }
};

const MetricCard = ({ metric, isLoading }: { metric: MetaPrimaryMetric; isLoading?: boolean }) => (
  <Card className="bg-gradient-to-br from-[#1f2937] to-[#0f172a] border-border text-foreground shadow-md">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-10 w-28 rounded" />
      ) : (
        <p className="text-3xl font-semibold tracking-tight">{formatMetricValue(metric)}</p>
      )}
    </CardContent>
  </Card>
);

export function MetricsCardGroup({ primary, cost, isLoading }: MetricsCardGroupProps) {
  const hasMetrics = primary.length > 0 || cost.length > 0;

  if (!isLoading && !hasMetrics) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">Sem métricas disponíveis para o período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {primary.map((metric) => (
          <MetricCard key={metric.id} metric={metric} isLoading={isLoading} />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {cost.map((metric) => (
          <MetricCard key={metric.id} metric={metric} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
