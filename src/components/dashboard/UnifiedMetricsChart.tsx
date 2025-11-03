/**
 * UnifiedMetricsChart - Gráfico de evolução temporal de métricas unificadas
 *
 * Sprint 2: Dashboard Unificado
 * Visualiza a evolução diária de investimento, leads, receita, CPL e ROAS
 * em um único gráfico integrado.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { BarChart3, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import type { UnifiedDailyBreakdown } from "@/hooks/useUnifiedMetrics"

interface UnifiedMetricsChartProps {
  data: UnifiedDailyBreakdown[] | undefined
  isLoading: boolean
}

export function UnifiedMetricsChart({ data, isLoading }: UnifiedMetricsChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Evolução Temporal - Métricas Unificadas
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sem dados para o período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
            <p>Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom tooltip para exibir métricas formatadas
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null

    const data = payload[0]?.payload

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">
          {new Date(label).toLocaleDateString('pt-BR')}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-500">● Investimento:</span>
            <span className="font-medium text-foreground">{formatCurrency(data?.spend || 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-purple-500">● Leads CRM:</span>
            <span className="font-medium text-foreground">{data?.crm_leads_created || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-green-500">● Receita:</span>
            <span className="font-medium text-foreground">{formatCurrency(data?.revenue || 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-orange-500">● CPL Real:</span>
            <span className="font-medium text-foreground">
              {data?.cpl ? formatCurrency(data.cpl) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-500">● ROAS:</span>
            <span className="font-medium text-foreground">
              {data?.roas ? `${data.roas.toFixed(2)}x` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Evolução Temporal - Métricas Unificadas</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Investimento, Leads e Receita ao Longo do Tempo</CardTitle>
          <CardDescription className="text-muted-foreground">
            Evolução diária de métricas integradas (Meta Ads + CRM)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }}
                fontSize={11}
              />
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                fontSize={11}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                fontSize={11}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    spend: 'Investimento',
                    revenue: 'Receita',
                    crm_leads_created: 'Leads CRM',
                    crm_leads_closed_won: 'Fechamentos',
                  }
                  return <span className="text-sm text-foreground">{labels[value] || value}</span>
                }}
              />

              {/* Barras: Investimento e Receita */}
              <Bar
                yAxisId="left"
                dataKey="spend"
                fill="url(#colorSpend)"
                name="spend"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="url(#colorRevenue)"
                name="revenue"
                radius={[4, 4, 0, 0]}
              />

              {/* Linhas: Leads CRM e Fechamentos */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="crm_leads_created"
                stroke="#A855F7"
                strokeWidth={2}
                dot={{ fill: "#A855F7", r: 3 }}
                name="crm_leads_created"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="crm_leads_closed_won"
                stroke="#16A34A"
                strokeWidth={2}
                dot={{ fill: "#16A34A", r: 3 }}
                name="crm_leads_closed_won"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Resumo do período */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Investimento Total</p>
              <p className="text-lg font-bold text-blue-500">
                {formatCurrency(data.reduce((sum, d) => sum + d.spend, 0))}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Leads Gerados</p>
              <p className="text-lg font-bold text-purple-500">
                {data.reduce((sum, d) => sum + d.crm_leads_created, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Receita Gerada</p>
              <p className="text-lg font-bold text-green-500">
                {formatCurrency(data.reduce((sum, d) => sum + d.revenue, 0))}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Fechamentos</p>
              <p className="text-lg font-bold text-success">
                {data.reduce((sum, d) => sum + d.crm_leads_closed_won, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
