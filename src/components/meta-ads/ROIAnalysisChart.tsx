import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend, Cell } from 'recharts'
import { formatCurrency } from '@/lib/formatters'

interface ROIAnalysisProps {
  data: Array<{
    campaign_name: string
    investimento: number
    faturamento: number
    leads: number
    roas: number
  }>
  isLoading?: boolean
}

export function ROIAnalysisChart({ data, isLoading }: ROIAnalysisProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Análise de ROI por Campanha</CardTitle>
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
          <CardTitle className="text-foreground">Análise de ROI por Campanha</CardTitle>
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
    x: item.investimento,
    y: item.faturamento,
    z: item.leads * 10, // Scale for bubble size
  }))

  // Color based on ROAS
  const getColor = (roas: number) => {
    if (roas >= 3) return '#10B981' // Green - Excellent
    if (roas >= 2) return '#3B82F6' // Blue - Good
    if (roas >= 1) return '#F59E0B' // Orange - Break-even
    return '#EF4444' // Red - Loss
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Análise de ROI por Campanha</CardTitle>
        <CardDescription className="text-muted-foreground">
          Investimento vs Faturamento (tamanho = leads gerados)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="x"
              name="Investimento"
              stroke="#9CA3AF"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Faturamento"
              stroke="#9CA3AF"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Leads" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB"
              }}
              formatter={(value: any, name: string) => {
                if (name === 'Investimento' || name === 'Faturamento') {
                  return [formatCurrency(value), name]
                }
                return [value, name]
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload
                  return (
                    <div>
                      <p className="font-bold">{data.campaign_name}</p>
                      <p className="text-sm">Leads: {data.leads}</p>
                      <p className="text-sm">ROAS: {data.roas?.toFixed(2)}x</p>
                    </div>
                  )
                }
                return ''
              }}
            />
            <Legend />
            <Scatter name="Campanhas" data={chartData} fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.roas || 0)} />
              ))}
            </Scatter>
            {/* Reference line for break-even (45 degree line) */}
            <Scatter
              name="Break-even"
              data={[
                { x: 0, y: 0, z: 50 },
                { x: Math.max(...chartData.map(d => d.x)), y: Math.max(...chartData.map(d => d.x)), z: 50 }
              ]}
              fill="none"
              line={{ stroke: '#6B7280', strokeWidth: 2, strokeDasharray: '5 5' }}
              shape="line"
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            <span className="text-muted-foreground">ROAS ≥ 3x (Excelente)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span className="text-muted-foreground">ROAS ≥ 2x (Bom)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span className="text-muted-foreground">ROAS ≥ 1x (Break-even)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
            <span className="text-muted-foreground">ROAS &lt; 1x (Prejuízo)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
