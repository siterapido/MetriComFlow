import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EngagementFunnel } from './EngagementFunnel'
import { ConversionFunnel } from './ConversionFunnel'

interface FunnelsSectionProps {
  engagementData: {
    impressions: number
    clicks: number
    leads: number
  }
  conversionData: {
    novo: number
    contato_inicial: number
    qualificado: number
    proposta: number
    negociacao: number
    fechado_ganho: number
  }
  isLoadingEngagement?: boolean
  isLoadingConversion?: boolean
}

export function FunnelsSection({
  engagementData,
  conversionData,
  isLoadingEngagement,
  isLoadingConversion
}: FunnelsSectionProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Funis de Análise</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Engagement Funnel */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Funil de Engajamento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Jornada do usuário nos anúncios
            </p>
            <EngagementFunnel
              data={engagementData}
              isLoading={isLoadingEngagement}
            />
          </div>

          {/* Conversion Funnel */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Funil de Conversão</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Jornada dos leads no CRM
            </p>
            <ConversionFunnel
              data={conversionData}
              isLoading={isLoadingConversion}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
