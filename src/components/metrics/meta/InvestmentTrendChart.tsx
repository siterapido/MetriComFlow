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
  defs,
  linearGradient,
  stop
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type InvestmentTrendChartProps = {
  data: MetaInvestmentTimelinePoint[];
  isLoading?: boolean;
};

export function InvestmentTrendChart({ data, isLoading }: InvestmentTrendChartProps) {
  if (isLoading) {
    return (
        <Card className="border-white/5 bg-card/30 backdrop-blur-xl h-full">
             <CardHeader>
                <CardTitle className="text-foreground">Evolução do Investimento</CardTitle>
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
                <CardTitle className="text-foreground">Evolução do Investimento</CardTitle>
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
            Evolução do Investimento e CTR
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="h-[350px] w-full pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
                stroke="#94a3b8"
              />
              
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(val) => `${val}%`}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="#f97316"
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
                    if (name === "uniqueCtr") return [`${value.toFixed(2)}%`, "CTR Único"];
                    return [formatCurrency(value), "Investimento"];
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="investment"
                name="Investimento"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorInvestment)"
              />
              
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="uniqueCtr"
                name="uniqueCtr"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCtr)"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
