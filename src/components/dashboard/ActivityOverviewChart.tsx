import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PhoneCall } from "lucide-react";
import type { ActivityMetric } from "@/hooks/useSalesDashboardMetrics";

interface ActivityOverviewChartProps {
  data: ActivityMetric[];
  className?: string;
  height?: string | number;
}

const typeLabels: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  meeting: "Reunião",
  proposal: "Proposta",
  follow_up: "Follow-up",
  demo: "Demo",
  negotiation: "Negociação",
  other: "Outro",
};

export function ActivityOverviewChart({ data, className, height = "300px" }: ActivityOverviewChartProps) {
  const formattedData = data?.map(d => ({
      ...d,
      label: typeLabels[d.type] || d.type
  })) || [];

  if (formattedData.length === 0) {
    return (
        <Card className={`glass-card border-white/5 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-primary" />
            Atividades Realizadas
          </CardTitle>
          <p className="text-xs text-muted-foreground">Volume de interações por tipo.</p>
        </CardHeader>
        <CardContent style={{ height }} className="flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nenhuma atividade registrada no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-primary" />
          Atividades Realizadas
        </CardTitle>
        <p className="text-xs text-muted-foreground">Volume de interações por tipo.</p>
      </CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis 
                dataKey="label" 
                tickLine={false} 
                axisLine={false} 
                stroke="#94a3b8" 
                fontSize={12} 
            />
            <YAxis 
                tickLine={false} 
                axisLine={false} 
                stroke="#94a3b8" 
                fontSize={12} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="count" name="Quantidade" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

