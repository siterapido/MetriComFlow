import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { UnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";
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

type UnifiedDailyBreakdownChartProps = {
  data: UnifiedDailyBreakdown[];
  isLoading?: boolean;
};

export function UnifiedDailyBreakdownChart({ data, isLoading }: UnifiedDailyBreakdownChartProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Evolução diária de investimento e leads</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados diários para o período selecionado.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis
                  yAxisId="left"
                  stroke="#60a5fa"
                  tickFormatter={(value: number) => `R$ ${Math.round(value / 1000)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f97316"
                  tickFormatter={(value: number) => `${Math.round(value)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    color: "#F9FAFB",
                  }}
                  formatter={(value: number, name: string) => {
                    switch (name) {
                      case "spend":
                        return [formatCurrency(value), "Investimento"];
                      case "crm_leads_created":
                        return [formatNumber(value), "Leads CRM"];
                      default:
                        return [value, name];
                    }
                  }}
                  labelFormatter={(label) => `Dia: ${label}`}
                />
                <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                <Bar
                  yAxisId="right"
                  dataKey="crm_leads_created"
                  name="Leads CRM"
                  fill="#f97316"
                  barSize={16}
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
