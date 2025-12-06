import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";

interface RoasCplData {
  date: string;
  roas: number;
  cpl: number;
}

interface RoasCplChartProps {
  data: RoasCplData[];
  className?: string;
  height?: string | number;
}

export function RoasCplChart({ data, className, height = "300px" }: RoasCplChartProps) {
  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          ROAS x CPL
        </CardTitle>
        <p className="text-xs text-muted-foreground">Quanto cada lead custa e quanto retorna no período.</p>
      </CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), "dd/MM", { locale: ptBR })}
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(val) => formatCurrency(val)}
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(val) => `${val.toFixed(1)}x`}
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), "dd 'de' MMM", { locale: ptBR })}
              formatter={(val: number, key: string) =>
                key === "cpl" ? [formatCurrency(val), "CPL"] : [`${val.toFixed(2)}x`, "ROAS"]
              }
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Bar yAxisId="left" dataKey="cpl" name="CPL" fill="rgba(59,130,246,0.4)" radius={[6, 6, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="roas"
              name="ROAS"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#22c55e" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
