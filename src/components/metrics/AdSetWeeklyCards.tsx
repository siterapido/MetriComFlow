import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, MousePointerClick, Eye, DollarSign, Target } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/formatters'

export function AdSetWeeklyCards({
  total,
  wow,
}: {
  total: { spend: number; leads_count: number; ctr: number; cpl: number }
  wow: { spend?: number; leads_count?: number; cpl?: number; ctr?: number }
}) {
  const items = [
    { id: 'spend', label: 'Investimento (semana)', value: formatCurrency(total.spend), change: wow.spend },
    { id: 'leads', label: 'Leads (semana)', value: formatNumber(total.leads_count), change: wow.leads_count },
    { id: 'cpl', label: 'CPL (semana)', value: formatCurrency(total.cpl), change: wow.cpl, invert: true },
    { id: 'ctr', label: 'CTR (semana)', value: `${Number(total.ctr).toFixed(2)}%`, change: wow.ctr },
  ]
  const iconFor = (id: string) => (id === 'spend' ? DollarSign : id === 'leads' ? Target : id === 'ctr' ? Eye : MousePointerClick)
  const colorFor = (id: string) => (id === 'spend' ? 'from-orange-500 to-orange-600' : id === 'leads' ? 'from-blue-500 to-blue-600' : id === 'ctr' ? 'from-cyan-500 to-cyan-600' : 'from-purple-500 to-purple-600')
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((it) => {
        const Icon = iconFor(it.id)
        const change = it.change
        const isNeg = typeof change === 'number' && change < 0
        const isPos = typeof change === 'number' && change > 0
        const showPos = it.invert ? isNeg : isPos
        const showNeg = it.invert ? isPos : isNeg
        return (
          <Card key={it.id} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-muted-foreground">{it.label}</CardTitle>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${colorFor(it.id)}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{it.value}</div>
              {typeof change === 'number' && (
                <div className="flex items-center gap-1 mt-1">
                  {showPos && (<><TrendingUp className="w-4 h-4 text-success" /><span className="text-xs font-medium text-success">+{Math.abs(change).toFixed(1)}%</span></>)}
                  {showNeg && (<><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-xs font-medium text-destructive">{change.toFixed(1)}%</span></>)}
                  {!showPos && !showNeg && (<span className="text-xs text-muted-foreground">0% vs semana anterior</span>)}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}