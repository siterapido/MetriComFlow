import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetaInvestmentTimelinePoint } from "@/lib/metaMetrics";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type InvestmentTrendChartProps = {
  data: MetaInvestmentTimelinePoint[];
  isLoading?: boolean;
};

export function InvestmentTrendChart({ data, isLoading }: InvestmentTrendChartProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Histórico de investimento e CTR único</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico disponível no intervalo selecionado.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis
                  yAxisId="left"
                  stroke="#60a5fa"
                  tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f97316"
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    color: "#F9FAFB",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "uniqueCtr") {
                      return [`${value.toFixed(2)}%`, "Unique CTR"];
                    }
                    return [`R$ ${value.toLocaleString("pt-BR")}`, "Investimento"];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="investment"
                  name="Investimento"
                  yAxisId="left"
                  stroke="#60a5fa"
                  fill="#60a5fa33"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="uniqueCtr"
                  name="Unique CTR"
                  yAxisId="right"
                  stroke="#f97316"
                  fill="#f973161a"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
