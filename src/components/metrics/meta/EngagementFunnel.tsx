import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetaEngagementStage } from "@/lib/metaMetrics";
import { formatNumber } from "@/lib/formatters";

type EngagementFunnelProps = {
  stages: MetaEngagementStage[];
  isLoading?: boolean;
};

export function EngagementFunnel({ stages, isLoading }: EngagementFunnelProps) {
  const maxValue = stages.reduce((max, stage) => Math.max(max, stage.value), 1);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Funil de Engajamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-16 w-4/5 rounded-lg" />
            <Skeleton className="h-14 w-3/5 rounded-lg" />
          </div>
        ) : stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados de engajamento para o período.</p>
        ) : (
          stages.map((stage) => {
            const width = `${Math.max((stage.value / maxValue) * 100, 12)}%`;
            return (
              <div key={stage.id} className="flex flex-col items-center gap-2">
                <div
                  className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-center text-lg font-semibold text-white transition-all"
                  style={{ width }}
                >
                  {formatNumber(stage.value)}
                </div>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {stage.label}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
