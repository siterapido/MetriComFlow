import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/formatters";
import type { MetaCreativePerformance } from "@/lib/metaMetrics";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CreativeInvestmentChartProps = {
  data: MetaCreativePerformance[];
  isLoading?: boolean;
};

const colors = {
  impressions: "#60a5fa",
  uniqueCtr: "#f97316",
};

export function CreativeInvestmentChart({ data, isLoading }: CreativeInvestmentChartProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Criativos com Maior Investimento e Impressões</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem criativos com investimento no período.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                layout="vertical"
                data={data}
                margin={{ top: 16, right: 16, left: 24, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  xAxisId="ctr"
                  stroke="#9CA3AF"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax + 10)]}
                  tickFormatter={(value) => `${value}%`}
                />
                <XAxis
                  type="number"
                  xAxisId="impressions"
                  orientation="top"
                  hide
                  domain={[0, (dataMax: number) => Math.ceil(dataMax / 1000) * 1000]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  width={220}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    color: "#F9FAFB",
                  }}
                  formatter={(value: number, key: string) => {
                    if (key === "Unique CTR") {
                      return [`${value.toFixed(2)}%`, key];
                    }
                    return [formatNumber(value), key];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="impressions"
                  name="Impressões"
                  fill={colors.impressions}
                  barSize={14}
                  radius={[0, 4, 4, 0]}
                  xAxisId="impressions"
                />
                <Line
                  type="monotone"
                  dataKey="uniqueCtr"
                  name="Unique CTR"
                  stroke={colors.uniqueCtr}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#111827" }}
                  xAxisId="ctr"
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
