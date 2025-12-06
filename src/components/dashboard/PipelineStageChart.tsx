import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, Bar, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Calendar } from "lucide-react";

interface PipelineStageData {
  stage: string;
  value: number;
}

interface PipelineStageChartProps {
  data: PipelineStageData[];
  className?: string;
  height?: string | number;
}

export function PipelineStageChart({ data, className, height = "300px" }: PipelineStageChartProps) {
  return (
    <Card className={`glass-card border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Pipeline por estágio
        </CardTitle>
        <p className="text-xs text-muted-foreground">Onde os leads estão concentrados no CRM.</p>
      </CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="stage" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} />
            <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={12} />
            <Tooltip
              formatter={(val: number) => [val, "Leads"]}
              contentStyle={{
                backgroundColor: "hsl(224 40% 23%)",
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="value" name="Leads" fill="rgba(168,85,247,0.6)" radius={[6, 6, 0, 0]} />
            <Area type="monotone" dataKey="value" name="Tendência" stroke="#a855f7" fill="rgba(168,85,247,0.15)" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
