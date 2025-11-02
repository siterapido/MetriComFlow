import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface CreativePerformanceProps {
  data: Array<{
    name: string
    ctr: number
    impressions: number
  }>
  isLoading?: boolean
}

export function CreativePerformanceChart({ data, isLoading }: CreativePerformanceProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Criativos com Maior Investimento e Impressões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Criativos com Maior Investimento e Impressões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Sem dados disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Normalize data to use percentage scale for CTR (multiply by 100 for better visualization)
  const normalizedData = data.map(item => ({
    ...item,
    ctrScaled: item.ctr * 100, // Scale CTR to be more visible
  }))

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          Criativos com Maior Investimento e Impressões
          <TooltipProvider delayDuration={0}>
            <UITooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center justify-center">
                  <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs bg-popover border-border">
                <p className="text-sm">
                  <strong>Unique CTR:</strong> Taxa de cliques única, calculada dividindo cliques por impressões. Indica a eficácia do anúncio em gerar interesse.
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Comparação de CTR e alcance por criativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={normalizedData} layout="vertical" margin={{ left: 100, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

            {/* Bottom axis for CTR (left bars) */}
            <XAxis
              xAxisId="ctr"
              type="number"
              stroke="#F59E0B"
              orientation="bottom"
              label={{ value: 'CTR (%)', position: 'insideBottom', offset: -5, fill: '#F59E0B' }}
            />

            {/* Top axis for Impressions (right bars) */}
            <XAxis
              xAxisId="impressions"
              type="number"
              stroke="#2DA7FF"
              orientation="top"
              label={{ value: 'Impressões', position: 'insideTop', offset: -5, fill: '#2DA7FF' }}
            />

            <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={90} />

            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB"
              }}
              formatter={(value: any, name: string) => {
                if (name === 'Unique CTR') {
                  const ctrValue = (value / 100).toFixed(2)
                  return [`${ctrValue}%`, name]
                }
                if (name === 'Impressões') return [value.toLocaleString('pt-BR'), name]
                return [value, name]
              }}
            />

            <Legend />

            {/* CTR bars on bottom axis */}
            <Bar
              xAxisId="ctr"
              dataKey="ctrScaled"
              fill="#F59E0B"
              name="Unique CTR"
              radius={[0, 3, 3, 0]}
              barSize={12}
            />

            {/* Impressions bars on top axis */}
            <Bar
              xAxisId="impressions"
              dataKey="impressions"
              fill="#2DA7FF"
              name="Impressões"
              radius={[0, 3, 3, 0]}
              barSize={12}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
