import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetaInvestmentSlice } from "@/lib/metaMetrics";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from "recharts";

type InvestmentByDayPieProps = {
  data: MetaInvestmentSlice[];
  isLoading?: boolean;
};

const colors = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a855f7",
  "#facc15",
  "#0ea5e9",
  "#ef4444",
  "#14b8a6",
  "#f43f5e",
];

export function InvestmentByDayPie({ data, isLoading }: InvestmentByDayPieProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Dias com maior investimento</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem distribuição de investimento para exibir.</p>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="h-80 w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={48}
                    paddingAngle={2}
                  >
                    {data.map((slice, index) => (
                      <Cell key={slice.id} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Investimento"]}
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #1f2937",
                      borderRadius: 8,
                      color: "#F9FAFB",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 lg:mt-0 lg:w-1/2 lg:pl-6">
              <Legend
                payload={data.map((slice, index) => ({
                  id: slice.id,
                  type: "square" as const,
                  color: colors[index % colors.length],
                  value: `${slice.label} — ${slice.value.toFixed(1)}%`,
                }))}
                layout="vertical"
                align="left"
                verticalAlign="middle"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
