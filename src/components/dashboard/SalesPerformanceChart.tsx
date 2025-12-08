import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { SalesRepPerformance } from "@/hooks/useSalesDashboardMetrics";

interface SalesPerformanceChartProps {
  data: SalesRepPerformance[];
  className?: string;
  height?: string | number;
}

export function SalesPerformanceChart({ data, className, height = "300px" }: SalesPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={`glass-card border-white/5 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Ranking de Vendas
          </CardTitle>
          <p className="text-xs text-muted-foreground">Receita fechada por vendedor no período.</p>
        </CardHeader>
        <CardContent style={{ height }} className="flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nenhuma venda registrada no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Ranking de Vendas
        </CardTitle>
        <p className="text-xs text-muted-foreground">Receita fechada por vendedor no período.</p>
      </CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" hide />
            <YAxis 
                dataKey="assignee_name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                stroke="#94a3b8" 
                fontSize={12} 
                width={100}
            />
            <Tooltip
              formatter={(val: number) => formatCurrency(val)}
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="total_revenue" name="Receita" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#fbbf24" : "rgba(14,165,233,0.6)"} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}



