import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Area } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics";

interface UnifiedMetricsChartProps {
  data: UnifiedDailyBreakdown[];
  isLoading: boolean;
}

export function UnifiedMetricsChart({ data, isLoading }: UnifiedMetricsChartProps) {
  if (isLoading) {
    return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Carregando gráfico...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">Sem dados para o período.</div>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
            <h3 className="text-lg font-bold text-white">Evolução Financeira</h3>
            <p className="text-sm text-muted-foreground">Comparativo de Investimento vs. Receita Realizada</p>
        </div>
        
        {/* Custom Legend */}
        <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-muted-foreground">Investimento</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-muted-foreground">Receita</span>
            </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), "dd/MM", { locale: ptBR })}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              dy={10}
            />
            
            <YAxis 
              yAxisId="left"
              tickFormatter={(val) => `R$${val/1000}k`}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
            />
            
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(224 40% 23%)', // Card color
                borderColor: 'rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                color: '#f8fafc',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
              labelFormatter={(date) => format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "spend" ? "Investimento" : "Receita"
              ]}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
            />
            
            <Bar 
              yAxisId="left"
              dataKey="spend" 
              name="spend"
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              opacity={0.6}
              barSize={20}
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#22c55e"
              strokeWidth={3}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
