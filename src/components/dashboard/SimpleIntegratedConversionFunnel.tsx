import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { UnifiedMetrics } from "@/hooks/useUnifiedMetrics"
import { Trophy, Users } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"

interface SimpleIntegratedConversionFunnelProps {
  metrics: UnifiedMetrics | undefined
  isLoading: boolean
}

/**
 * SimpleIntegratedConversionFunnel
 * Visão simplificada do Funil de Conversão Integrado, destacando apenas:
 * - Taxa de Fechamento de Leads (Lead → Fechamento)
 * - Totais de Leads e Fechamentos
 * - Receita dos fechamentos (se disponível)
 */
export function SimpleIntegratedConversionFunnel({ metrics, isLoading }: SimpleIntegratedConversionFunnelProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
          <CardDescription className="text-muted-foreground">Lead → Fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || !metrics.has_data) {
    return null
  }

  const totalLeads = metrics.crm_total_leads
  const totalFechamentos = metrics.crm_fechados_ganho
  const receita = metrics.crm_revenue
  const closeRate = totalLeads > 0 ? (totalFechamentos / totalLeads) * 100 : 0

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
            <CardDescription className="text-muted-foreground">Lead → Fechamento (visão simplificada)</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Taxa de Fechamento de Leads</div>
            <div className="text-3xl font-bold text-success">{closeRate.toFixed(2)}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Indicadores principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Leads (CRM)</div>
                <div className="text-xl font-semibold text-foreground">{totalLeads}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fechamentos</div>
                <div className="text-xl font-semibold text-foreground">{totalFechamentos}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div>
              <div className="text-sm text-muted-foreground">Receita dos fechamentos</div>
              <div className="text-xl font-semibold text-foreground">{formatCurrency(receita)}</div>
            </div>
          </div>
        </div>

        {/* Barra simples de conversão */}
        <div className="mt-8">
          <div className="text-sm text-muted-foreground mb-2">Conversão Lead → Fechamento</div>
          <div className="h-4 w-full rounded bg-muted overflow-hidden">
            <div
              className="h-4 bg-gradient-to-r from-green-600 to-green-400"
              style={{ width: `${Math.min(closeRate, 100).toFixed(2)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {totalFechamentos} fechamentos de {totalLeads} leads no período selecionado
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

