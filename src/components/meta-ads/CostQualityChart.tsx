import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import { TrendingUp } from 'lucide-react'

interface CostQualityChartProps {
  data: Array<{
    campaign_name: string
    cpl: number
    conversion_rate: number // Taxa de fechamento (%)
    leads: number
  }>
  isLoading?: boolean
}

export function CostQualityChart({ data, isLoading }: CostQualityChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Custo vs Qualidade do Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Custo vs Qualidade do Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[450px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for scatter chart
  const chartData = data.map(item => ({
    ...item,
    x: item.cpl,
    y: item.conversion_rate,
    z: item.leads * 5, // Scale for bubble size
  }))

  // Calculate averages for reference lines
  const avgCPL = data.reduce((sum, d) => sum + d.cpl, 0) / data.length
  const avgConversionRate = data.reduce((sum, d) => sum + d.conversion_rate, 0) / data.length

  // Color based on quadrant (quality)
  const getColor = (cpl: number, conversionRate: number) => {
    // Top-left quadrant: Low cost, high conversion (BEST)
    if (cpl <= avgCPL && conversionRate >= avgConversionRate) return '#10B981' // Green
    // Top-right: High cost, high conversion (Good quality, expensive)
    if (cpl > avgCPL && conversionRate >= avgConversionRate) return '#3B82F6' // Blue
    // Bottom-left: Low cost, low conversion (Cheap but low quality)
    if (cpl <= avgCPL && conversionRate < avgConversionRate) return '#F59E0B' // Orange
    // Bottom-right: High cost, low conversion (WORST)
    return '#EF4444' // Red
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Custo vs Qualidade do Lead
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          CPL vs Taxa de Conversão (tamanho = número de leads)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="x"
              name="CPL"
              stroke="#9CA3AF"
              tickFormatter={(value) => formatCurrency(value)}
              label={{ value: 'Custo por Lead (CPL)', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Taxa de Conversão"
              stroke="#9CA3AF"
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              label={{ value: 'Taxa de Conversão (%)', angle: -90, position: 'insideLeft' }}
            />
            <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Leads" />

            {/* Reference lines for averages */}
            <ReferenceLine
              x={avgCPL}
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{ value: 'CPL Médio', position: 'top', fill: '#9CA3AF' }}
            />
            <ReferenceLine
              y={avgConversionRate}
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{ value: 'Conversão Média', position: 'right', fill: '#9CA3AF' }}
            />

            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB"
              }}
              formatter={(value: any, name: string) => {
                if (name === 'CPL') return [formatCurrency(value), name]
                if (name === 'Taxa de Conversão') return [`${value.toFixed(2)}%`, name]
                return [value, name]
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload
                  return (
                    <div>
                      <p className="font-bold">{data.campaign_name}</p>
                      <p className="text-sm">Leads: {data.leads}</p>
                    </div>
                  )
                }
                return ''
              }}
            />

            <Scatter name="Campanhas" data={chartData} fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.cpl || 0, entry.conversion_rate || 0)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend with quadrant explanation */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground mb-2">Quadrantes de Performance</h4>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-muted-foreground">Baixo custo + Alta conversão (Ideal)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              <span className="text-muted-foreground">Alto custo + Alta conversão (Qualidade premium)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="text-muted-foreground">Baixo custo + Baixa conversão (Atenção)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span className="text-muted-foreground">Alto custo + Baixa conversão (Otimizar urgente)</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Insight:</strong> Campanhas no quadrante verde têm o melhor ROI.
              Leads baratos nem sempre convertem melhor - analise o equilíbrio custo-qualidade.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
