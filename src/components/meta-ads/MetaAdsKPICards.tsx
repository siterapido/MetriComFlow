import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, Target, TrendingUp, TrendingDown, MousePointerClick, Eye } from 'lucide-react'
import { formatCurrency, formatNumber, type CurrencyFormatOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'

type MetricsSummary = {
  current: {
    spend: number
    impressions: number
    clicks: number
    leads: number
    ctr: number
    cpc: number
    cpl: number
  }
  previous: {
    spend: number
    leads: number
    cpl: number
  }
  changes: {
    spend: number
    leads: number
    cpl: number
  }
}

type MetaAdsKPICardsProps = {
  summary: MetricsSummary | undefined
  isLoading?: boolean
  currencyOptions?: CurrencyFormatOptions
  highlightCAC?: boolean
}

type KPICardProps = {
  title: string
  value: string | number
  change?: number
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  isLoading?: boolean
  hideChange?: boolean
  highlight?: boolean
}

function KPICard({ title, value, change, subtitle, icon: Icon, iconColor, isLoading, hideChange, highlight }: KPICardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change !== undefined && change === 0

  // For CPL, negative change is good (lower cost)
  const isCPLMetric = title.includes('CPL')
  const showPositive = isCPLMetric ? isNegative : isPositive
  const showNegative = isCPLMetric ? isPositive : isNegative

  return (
    <Card className={cn("bg-gradient-to-br from-card to-accent/20 border-border hover-lift", highlight && "ring-2 ring-purple-500/50 shadow-lg") }>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
            {change !== undefined && !hideChange && (
              <div className="flex items-center gap-1 mt-1">
                {showPositive && (
                  <>
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="text-xs font-medium text-success">
                      +{Math.abs(change).toFixed(1)}%
                    </span>
                  </>
                )}
                {showNegative && (
                  <>
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      {change.toFixed(1)}%
                    </span>
                  </>
                )}
                {isNeutral && (
                  <span className="text-xs font-medium text-muted-foreground">
                    0% vs período anterior
                  </span>
                )}
                {!isNeutral && (
                  <span className="text-xs text-muted-foreground">
                    vs período anterior
                  </span>
                )}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function MetaAdsKPICards({ summary, isLoading, currencyOptions, highlightCAC = false }: MetaAdsKPICardsProps) {
  const hasData = !!summary && (
    (summary.current.spend ?? 0) > 0 ||
    (summary.current.leads ?? 0) > 0 ||
    (summary.current.clicks ?? 0) > 0 ||
    (summary.current.impressions ?? 0) > 0
  )
  const currencyPrefs: CurrencyFormatOptions = currencyOptions ?? { currency: 'BRL' }
  const locale = currencyPrefs.locale ?? 'pt-BR'
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Investimento Total"
        value={hasData ? formatCurrency(summary!.current.spend, currencyPrefs) : 'Sem dados'}
        change={summary?.changes.spend}
        icon={DollarSign}
        iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
        isLoading={isLoading}
        hideChange={!hasData}
      />

      <KPICard
        title="Leads Gerados"
        value={hasData ? formatNumber(summary!.current.leads) : 'Sem contatos'}
        change={summary?.changes.leads}
        subtitle={hasData ? `${summary!.current.impressions.toLocaleString(locale)} impressões` : undefined}
        icon={Users}
        iconColor="bg-gradient-to-br from-green-500 to-green-600"
        isLoading={isLoading}
        hideChange={!hasData}
      />

      <KPICard
        title="CPL (Custo por Lead)"
        value={hasData ? formatCurrency(summary!.current.cpl, currencyPrefs) : 'Sem dados'}
        change={summary?.changes.cpl}
        subtitle={
          hasData
            ? summary!.current.cpl < 50
              ? 'Excelente custo'
              : summary!.current.cpl < 100
              ? 'Dentro da meta'
              : 'Acima do ideal'
            : undefined
        }
        icon={Target}
        iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
        isLoading={isLoading}
        hideChange={!hasData}
        highlight={highlightCAC && hasData}
      />

      <KPICard
        title="Taxa de Cliques (CTR)"
        value={hasData ? `${summary!.current.ctr.toFixed(2)}%` : 'Sem dados'}
        subtitle={hasData ? `${summary!.current.clicks.toLocaleString(locale)} cliques` : undefined}
        icon={MousePointerClick}
        iconColor="bg-gradient-to-br from-orange-500 to-orange-600"
        isLoading={isLoading}
      />
    </div>
  )
}

 // Additional detailed metrics card
 type DetailedMetricsProps = {
   summary: MetricsSummary | undefined
   isLoading?: boolean
 }

 export function MetaAdsDetailedMetrics({ summary, isLoading }: DetailedMetricsProps) {
  const hasData = !!summary && (
    (summary.current.spend ?? 0) > 0 ||
    (summary.current.leads ?? 0) > 0 ||
    (summary.current.clicks ?? 0) > 0 ||
    (summary.current.impressions ?? 0) > 0
  )
   if (isLoading) {
     return (
       <Card className="border-border bg-card">
         <CardHeader>
           <CardTitle className="text-foreground">Métricas Detalhadas</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="h-12 bg-muted animate-pulse rounded" />
             ))}
           </div>
         </CardContent>
       </Card>
     )
   }

   if (!summary) {
     return null
   }

  if (!hasData) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Métricas Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Sem dados para o período selecionado</div>
        </CardContent>
      </Card>
    )
  }

   const metrics = [
     {
       label: 'Impressões Totais',
       value: summary.current.impressions.toLocaleString('pt-BR'),
       icon: Eye,
       color: 'text-blue-500',
     },
     {
       label: 'Cliques Totais',
       value: summary.current.clicks.toLocaleString('pt-BR'),
       icon: MousePointerClick,
       color: 'text-green-500',
     },
     {
       label: 'CPC Médio (Custo por Clique)',
       value: formatCurrency(summary.current.cpc),
       icon: DollarSign,
       color: 'text-purple-500',
     },
     {
       label: 'Taxa de Conversão (Leads/Cliques)',
       value: summary.current.clicks > 0
         ? `${((summary.current.leads / summary.current.clicks) * 100).toFixed(2)}%`
         : '0%',
       icon: Target,
       color: 'text-orange-500',
     },
   ]

   return (
     <Card className="border-border bg-card">
       <CardHeader>
         <CardTitle className="text-foreground">Métricas Detalhadas</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {metrics.map((metric) => (
             <div
               key={metric.label}
               className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-accent/10 border border-border"
             >
               <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-card to-muted', metric.color)}>
                 <metric.icon className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm text-muted-foreground">{metric.label}</p>
                 <p className="text-lg font-bold text-foreground">{metric.value}</p>
               </div>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   )
 }
