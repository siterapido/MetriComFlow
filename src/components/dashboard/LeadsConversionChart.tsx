import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsConversionData {
  date: string;
  metaLeads: number | null;
  crmLeads: number | null;
  closedWon: number | null;
}

interface LeadsConversionChartProps {
  data: LeadsConversionData[];
  className?: string;
  height?: string | number;
}

export function LeadsConversionChart({ data, className, height = "300px" }: LeadsConversionChartProps) {
  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-secondary" />
          Leads e Fechamentos
        </CardTitle>
        <p className="text-xs text-muted-foreground">Volume diário de leads do Meta x CRM e quantos viram receita.</p>
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
            <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), "dd 'de' MMM", { locale: ptBR })}
              formatter={(val: number, key: string) => [val, key === "closedWon" ? "Fechados (CRM)" : key === "metaLeads" ? "Leads Meta" : "Leads CRM"]}
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="metaLeads" name="Leads Meta" stackId="leads" fill="rgba(59,130,246,0.6)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="crmLeads" name="Leads CRM" stackId="leads" fill="rgba(14,165,233,0.6)" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="closedWon"
              name="Fechados (CRM)"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: "#fbbf24" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
