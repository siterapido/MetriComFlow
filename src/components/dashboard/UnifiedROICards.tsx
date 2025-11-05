/**
 * UnifiedROICards - Cards de KPI mostrando ROI real (Meta Ads → Receita CRM)
 *
 * Sprint 2: Dashboard Unificado
 * Exibe métricas integradas que combinam investimento do Meta Ads com
 * receita real do CRM, permitindo análise completa de retorno sobre investimento.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Target, Award, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import type { UnifiedMetrics } from "@/hooks/useUnifiedMetrics"

interface UnifiedROICardsProps {
  metrics: UnifiedMetrics | undefined
  isLoading: boolean
}

export function UnifiedROICards({ metrics, isLoading }: UnifiedROICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics || !metrics.has_data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Sem dados de Meta Ads disponíveis para calcular ROI real.</p>
        <p className="text-sm mt-2">Conecte uma conta Meta Ads e sincronize os dados para visualizar métricas unificadas.</p>
      </div>
    )
  }

  // Determinar se ROAS é saudável (>= 3x) ou precisa melhorar
  const isRoasHealthy = metrics.real_roas !== null && metrics.real_roas >= 3
  const isCplGood = metrics.real_cpl !== null && metrics.real_cpl < 50

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">ROI Real - Meta Ads → Receita CRM</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Investimento Total (Meta Ads) */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investimento Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.meta_spend)}
            </div>
            <p className="text-xs text-blue-500 mt-1">
              {metrics.meta_leads} leads gerados (Meta)
            </p>
            <p className="text-xs text-muted-foreground">
              CPL Meta: {metrics.meta_cpl ? formatCurrency(metrics.meta_cpl) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* CPL Real (Investimento / Leads CRM) */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CPL Real (CRM)
            </CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.real_cpl ? formatCurrency(metrics.real_cpl) : 'N/A'}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isCplGood ? (
                <>
                  <ArrowDownRight className="w-3 h-3 text-success" />
                  <p className="text-xs text-success">Excelente</p>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3 h-3 text-warning" />
                  <p className="text-xs text-warning">Monitorar</p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.crm_total_leads} leads no CRM
            </p>
          </CardContent>
        </Card>

        {/* ROAS Real (Receita CRM / Investimento Meta) */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ROAS Real
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.real_roas !== null ? `${metrics.real_roas.toFixed(2)}x` : 'N/A'}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isRoasHealthy ? (
                <>
                  <ArrowUpRight className="w-3 h-3 text-success" />
                  <p className="text-xs text-success">Saudável (≥3x)</p>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3 h-3 text-warning" />
                  <p className="text-xs text-warning">Melhorar</p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita: {formatCurrency(metrics.crm_revenue)}
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Conversão Real */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.conversion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-orange-500 mt-1">
              {metrics.crm_fechados_ganho} fechamentos
            </p>
            {/* Taxa de perda baseada no total de leads */}
            <p className="text-xs text-muted-foreground">
              Perda: {metrics.crm_total_leads > 0 ? ((metrics.crm_fechados_perdido / metrics.crm_total_leads) * 100).toFixed(1) : '0.0'}% ({metrics.crm_fechados_perdido} perdidos)
            </p>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(metrics.avg_deal_size)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explicação */}
      <Card className="bg-card/50 border-border">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Sobre as Métricas Unificadas:</p>
              <ul className="space-y-1 text-xs">
                <li>
                  <strong>CPL Real:</strong> Custo por lead baseado nos leads reais criados no CRM
                  (Investimento Meta ÷ Leads CRM), diferente do CPL reportado pelo Meta.
                </li>
                <li>
                  <strong>ROAS Real:</strong> Retorno sobre investimento baseado na receita real de
                  negócios fechados (Receita CRM ÷ Investimento Meta). Meta de 3x ou mais.
                </li>
                <li>
                  <strong>Taxa de Conversão:</strong> Percentual de leads que fecharam negócio
                  (Fechados Ganho ÷ Total de Leads).
                </li>
                <li>
                  <strong>Taxa de Perda:</strong> Percentual de leads perdidos
                  (Fechados Perdido ÷ Total de Leads).
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
