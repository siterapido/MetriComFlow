import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { AlertCircle } from "lucide-react";

interface LossReasonData {
  reason: string;
  count: number;
}

interface LossReasonChartProps {
  data: LossReasonData[];
  className?: string;
  height?: string | number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1', '#d946ef'];

export function LossReasonChart({ data, className, height = "300px" }: LossReasonChartProps) {
  if (!data || data.length === 0) {
    return (
        <Card className={`glass-card border-white/5 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Motivos de Perda
          </CardTitle>
          <p className="text-xs text-muted-foreground">Por que as oportunidades foram perdidas.</p>
        </CardHeader>
        <CardContent style={{ height }} className="flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nenhuma perda registrada no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          Motivos de Perda
        </CardTitle>
        <p className="text-xs text-muted-foreground">Por que as oportunidades foram perdidas.</p>
      </CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="count"
              nameKey="reason"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}




