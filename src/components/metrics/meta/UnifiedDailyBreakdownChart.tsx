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
  Area,
  defs,
  linearGradient,
  stop
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type UnifiedDailyBreakdownChartProps = {
  data: UnifiedDailyBreakdown[];
  isLoading?: boolean;
};

export function UnifiedDailyBreakdownChart({ data, isLoading }: UnifiedDailyBreakdownChartProps) {
    if (isLoading) {
        return (
            <Card className="border-white/5 bg-card/30 backdrop-blur-xl h-full">
                <CardHeader>
                    <CardTitle className="text-foreground">Performance Diária</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <Skeleton className="h-[300px] w-full rounded-lg bg-white/5" />
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="border-white/5 bg-card/30 backdrop-blur-xl h-full">
                <CardHeader>
                    <CardTitle className="text-foreground">Performance Diária</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Sem dados para exibir no período.</p>
                </CardContent>
            </Card>
        );
    }

  return (
    <Card className="border-white/5 bg-card/30 backdrop-blur-xl h-full shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
            Investimento vs. Leads (CRM)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="h-[350px] w-full pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpendBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorLeadsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(parseISO(date), "dd/MM", { locale: ptBR })}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="#94a3b8"
                dy={10}
              />
              
              <YAxis 
                yAxisId="left"
                tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="#3b82f6"
              />
              
              <YAxis
                yAxisId="right"
                orientation="right"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="#22c55e"
              />
              
              <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#f8fafc',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)'
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.75rem' }}
                labelFormatter={(date) => format(parseISO(date as string), "dd 'de' MMMM, yyyy", { locale: ptBR })}
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
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              
              <Bar
                yAxisId="left"
                dataKey="spend"
                name="spend"
                fill="url(#colorSpendBar)"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
              
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="crm_leads_created"
                name="crm_leads_created"
                stroke="#22c55e"
                strokeWidth={3}
                fill="url(#colorLeadsArea)"
                dot={{ stroke: '#22c55e', strokeWidth: 2, fill: '#0f172a', r: 3 }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
