import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Clock } from 'lucide-react'

interface ConversionTimeFunnelProps {
  data: {
    lead_to_contact: number // days
    contact_to_qualified: number
    qualified_to_proposal: number
    proposal_to_negotiation: number
    negotiation_to_closed: number
  }
  isLoading?: boolean
}

export function ConversionTimeFunnel({ data, isLoading }: ConversionTimeFunnelProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Tempo de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const stages = [
    {
      name: 'Lead → Contato',
      days: data.lead_to_contact || 0,
      color: '#3B82F6',
    },
    {
      name: 'Contato → Qualificado',
      days: data.contact_to_qualified || 0,
      color: '#2563EB',
    },
    {
      name: 'Qualificado → Proposta',
      days: data.qualified_to_proposal || 0,
      color: '#1D4ED8',
    },
    {
      name: 'Proposta → Negociação',
      days: data.proposal_to_negotiation || 0,
      color: '#1E40AF',
    },
    {
      name: 'Negociação → Fechamento',
      days: data.negotiation_to_closed || 0,
      color: '#1E3A8A',
    },
  ]

  const totalDays = stages.reduce((sum, stage) => sum + stage.days, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Funil de Tempo de Conversão
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tempo médio em cada etapa do processo de vendas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Total Cycle Time */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ciclo Total de Vendas</span>
            <span className="text-2xl font-bold text-foreground">
              {totalDays.toFixed(1)} dias
            </span>
          </div>
        </div>

        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stages} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" label={{ value: 'Dias', position: 'insideBottom', offset: -5 }} />
            <YAxis type="category" dataKey="name" stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB"
              }}
              formatter={(value: any) => [`${value.toFixed(1)} dias`, 'Tempo médio']}
            />
            <Bar dataKey="days" radius={[0, 4, 4, 0]}>
              {stages.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Breakdown List */}
        <div className="mt-6 space-y-2">
          {stages.map((stage, index) => {
            const percentage = totalDays > 0 ? (stage.days / totalDays) * 100 : 0
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{stage.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                  <span className="text-sm font-semibold text-foreground w-16 text-right">
                    {stage.days.toFixed(1)}d
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
