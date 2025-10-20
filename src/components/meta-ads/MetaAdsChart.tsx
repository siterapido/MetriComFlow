import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, DollarSign, MousePointerClick } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ChartData = {
  date: string
  spend: number
  impressions: number
  clicks: number
  leads_count: number
  ctr: number
  cpc: number
  cpl: number
}

type MetaAdsChartProps = {
  data: ChartData[]
  isLoading?: boolean
}

export function MetaAdsChart({ data, isLoading }: MetaAdsChartProps) {
  // Transform data for chart display
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      dateFormatted: format(parseISO(item.date), 'dd/MMM', { locale: ptBR }),
      dateFull: format(parseISO(item.date), 'PP', { locale: ptBR }),
    }))
  }, [data])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{payload[0]?.payload?.dateFull}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              <span style={{ color: entry.color }}>{entry.name}: </span>
              <span className="font-medium text-foreground">{entry.value.toLocaleString('pt-BR')}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-foreground">Histórico de Métricas</CardTitle>
            <CardDescription className="text-muted-foreground">
              Evolução temporal dos principais indicadores
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="spend" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Investimento
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <MousePointerClick className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Investimento Tab */}
          <TabsContent value="spend" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DA7FF" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2DA7FF" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="dateFormatted"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Investimento"
                  stroke="#2DA7FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSpend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Leads Tab removida */}

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="dateFormatted"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpl"
                  name="CPL (R$)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpc"
                  name="CPC (R$)"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ctr"
                  name="CTR (%)"
                  stroke="#0D9DFF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Visão Geral Tab */}
          <TabsContent value="overview" className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="dateFormatted"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  name="Investimento"
                  stroke="#2DA7FF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="leads_count"
                  name="Leads"
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  name="Cliques"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
