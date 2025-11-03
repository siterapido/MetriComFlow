/**
 * MetaToRevenueFunnel - Funil completo desde Meta Ads até Receita CRM
 *
 * Sprint 2: Dashboard Unificado
 * Visualiza o funil completo de conversão: impressões → cliques → leads Meta →
 * leads CRM → qualificados → propostas → negociações → fechamentos → receita.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from "recharts"
import { GitBranch, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import type { UnifiedMetrics } from "@/hooks/useUnifiedMetrics"

interface MetaToRevenueFunnelProps {
  metrics: UnifiedMetrics | undefined
  isLoading: boolean
}

export function MetaToRevenueFunnel({ metrics, isLoading }: MetaToRevenueFunnelProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || !metrics.has_data) {
    return null
  }

  // Preparar dados do funil
  const funnelData = [
    {
      name: 'Impressões',
      value: metrics.meta_impressions,
      fill: '#3B82F6', // blue-500
    },
    {
      name: 'Cliques',
      value: metrics.meta_clicks,
      fill: '#8B5CF6', // violet-500
    },
    {
      name: 'Leads (Meta)',
      value: metrics.meta_leads,
      fill: '#6366F1', // indigo-500
    },
    {
      name: 'Leads (CRM)',
      value: metrics.crm_total_leads,
      fill: '#2DA7FF', // primary
    },
    {
      name: 'Qualificados',
      value: metrics.crm_qualificados,
      fill: '#14B8A6', // teal-500
    },
    {
      name: 'Propostas',
      value: metrics.crm_propostas,
      fill: '#10B981', // green-500
    },
    {
      name: 'Negociações',
      value: metrics.crm_negociacoes,
      fill: '#F59E0B', // orange-500
    },
    {
      name: 'Fechados (Ganho)',
      value: metrics.crm_fechados_ganho,
      fill: '#16A34A', // success
    },
  ]

  // Calcular taxas de conversão entre etapas
  const conversionRates = [
    {
      from: 'Impressões',
      to: 'Cliques',
      rate: metrics.meta_impressions > 0 ? (metrics.meta_clicks / metrics.meta_impressions) * 100 : 0,
    },
    {
      from: 'Cliques',
      to: 'Leads (Meta)',
      rate: metrics.meta_clicks > 0 ? (metrics.meta_leads / metrics.meta_clicks) * 100 : 0,
    },
    {
      from: 'Leads (Meta)',
      to: 'Leads (CRM)',
      rate: metrics.meta_leads > 0 ? (metrics.crm_total_leads / metrics.meta_leads) * 100 : 0,
    },
    {
      from: 'Leads (CRM)',
      to: 'Qualificados',
      rate: metrics.crm_total_leads > 0 ? (metrics.crm_qualificados / metrics.crm_total_leads) * 100 : 0,
    },
    {
      from: 'Qualificados',
      to: 'Propostas',
      rate: metrics.crm_qualificados > 0 ? (metrics.crm_propostas / metrics.crm_qualificados) * 100 : 0,
    },
    {
      from: 'Propostas',
      to: 'Negociações',
      rate: metrics.crm_propostas > 0 ? (metrics.crm_negociacoes / metrics.crm_propostas) * 100 : 0,
    },
    {
      from: 'Negociações',
      to: 'Fechados',
      rate: metrics.crm_negociacoes > 0 ? (metrics.crm_fechados_ganho / metrics.crm_negociacoes) * 100 : 0,
    },
  ]

  // Taxa de conversão geral (impressões → fechamentos)
  const overallConversionRate = metrics.meta_impressions > 0
    ? (metrics.crm_fechados_ganho / metrics.meta_impressions) * 100
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Funil Completo - Meta Ads → Receita</h2>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
          <CardDescription className="text-muted-foreground">
            Visualização completa do funil desde impressões até receita gerada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Funil */}
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB"
                    }}
                    formatter={(value: number) => value.toLocaleString('pt-BR')}
                  />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList
                      position="inside"
                      fill="#fff"
                      stroke="none"
                      dataKey="name"
                      fontSize={12}
                      fontWeight="bold"
                    />
                    <LabelList
                      position="inside"
                      fill="#fff"
                      stroke="none"
                      dataKey="value"
                      fontSize={10}
                      formatter={(value: number) => value.toLocaleString('pt-BR')}
                      dy={15}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>

            {/* Taxas de Conversão */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Taxas de Conversão Entre Etapas</h3>
                <div className="space-y-2">
                  {conversionRates.map((cr, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                      <span className="text-muted-foreground">
                        {cr.from} → {cr.to}
                      </span>
                      <span className={`font-semibold ${cr.rate >= 10 ? 'text-success' : cr.rate >= 5 ? 'text-warning' : 'text-destructive'}`}>
                        {cr.rate.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Conversão Geral</span>
                    <TrendingDown className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {overallConversionRate.toFixed(4)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    De {metrics.meta_impressions.toLocaleString('pt-BR')} impressões para {metrics.crm_fechados_ganho} fechamentos
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="bg-gradient-to-br from-success/10 to-success/5 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Receita Gerada</span>
                    <TrendingDown className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-2xl font-bold text-success mb-1">
                    {formatCurrency(metrics.crm_revenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Investimento: {formatCurrency(metrics.meta_spend)} | ROAS: {metrics.real_roas?.toFixed(2)}x
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-6 p-4 bg-card/50 border border-border rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-2">Insights do Funil</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Topo do Funil (Meta Ads)</p>
                <ul className="space-y-1">
                  <li>• CTR: {metrics.meta_ctr.toFixed(2)}%</li>
                  <li>• CPL (Meta): {metrics.meta_cpl ? formatCurrency(metrics.meta_cpl) : 'N/A'}</li>
                  <li>• {metrics.meta_leads} leads gerados</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Meio do Funil (CRM)</p>
                <ul className="space-y-1">
                  <li>• {metrics.crm_total_leads} leads no CRM</li>
                  <li>• {metrics.crm_qualificados} qualificados ({metrics.crm_total_leads > 0 ? ((metrics.crm_qualificados / metrics.crm_total_leads) * 100).toFixed(1) : '0'}%)</li>
                  <li>• {metrics.crm_propostas + metrics.crm_negociacoes} em negociação</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Fundo do Funil (Receita)</p>
                <ul className="space-y-1">
                  <li>• {metrics.crm_fechados_ganho} fechamentos</li>
                  <li>• Ticket médio: {formatCurrency(metrics.avg_deal_size)}</li>
                  <li>• Taxa conversão: {metrics.conversion_rate.toFixed(1)}%</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
