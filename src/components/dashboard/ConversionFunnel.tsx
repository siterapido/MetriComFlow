import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { TrendingDown, Users, MousePointerClick, Mail, UserCheck, FileText, Handshake, Trophy, X } from "lucide-react";
import { useState } from "react";

export type FunnelData = {
  // Meta Ads metrics (top of funnel)
  impressions: number;
  clicks: number;
  leads_meta: number;
  cpl: number;

  // CRM metrics (bottom of funnel)
  novo_lead: number;
  qualificacao: number;
  proposta: number;
  negociacao: number;
  fechado_ganho: number;
  fechado_perdido: number;

  // Values
  total_pipeline_value: number;
  won_value: number;
}

type FunnelStage = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: any;
  description: string;
  displayValue?: string;
}

export function ConversionFunnel({ data }: { data: FunnelData | null }) {
  if (!data) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Conversão Completo</CardTitle>
          <CardDescription className="text-muted-foreground">
            Meta Ads → CRM Pipeline → Fechamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <p>Carregando dados do funil...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total from top of funnel
  const topValue = data.impressions;

  // Build funnel stages from Meta Ads to CRM to Won
  const stages: FunnelStage[] = [
    {
      name: 'Impressões',
      value: data.impressions,
      percentage: 100,
      color: 'from-blue-600 to-blue-400',
      icon: Users,
      description: 'Pessoas alcançadas',
      displayValue: data.impressions.toLocaleString('pt-BR'),
    },
    {
      name: 'Cliques',
      value: data.clicks,
      percentage: topValue > 0 ? (data.clicks / topValue) * 100 : 0,
      color: 'from-blue-600 to-blue-400',
      icon: MousePointerClick,
      description: 'Clicaram no anúncio',
      displayValue: data.clicks.toLocaleString('pt-BR'),
    },
    {
      name: 'Leads Meta',
      value: data.leads_meta,
      percentage: topValue > 0 ? (data.leads_meta / topValue) * 100 : 0,
      color: 'from-blue-500 to-blue-300',
      icon: Mail,
      description: 'Convertidos via Meta',
      displayValue: `${data.leads_meta} (${formatCurrency(data.cpl)} CPL)`,
    },
    {
      name: 'Novo Lead',
      value: data.novo_lead,
      percentage: topValue > 0 ? (data.novo_lead / topValue) * 100 : 0,
      color: 'from-blue-500 to-blue-300',
      icon: UserCheck,
      description: 'Entraram no CRM',
      displayValue: data.novo_lead.toLocaleString('pt-BR'),
    },
    {
      name: 'Qualificação',
      value: data.qualificacao,
      percentage: topValue > 0 ? (data.qualificacao / topValue) * 100 : 0,
      color: 'from-blue-400 to-blue-300',
      icon: FileText,
      description: 'Leads qualificados',
      displayValue: data.qualificacao.toLocaleString('pt-BR'),
    },
    {
      name: 'Proposta',
      value: data.proposta,
      percentage: topValue > 0 ? (data.proposta / topValue) * 100 : 0,
      color: 'from-blue-300 to-blue-200',
      icon: FileText,
      description: 'Propostas enviadas',
      displayValue: data.proposta.toLocaleString('pt-BR'),
    },
    {
      name: 'Negociação',
      value: data.negociacao,
      percentage: topValue > 0 ? (data.negociacao / topValue) * 100 : 0,
      color: 'from-blue-300 to-blue-200',
      icon: Handshake,
      description: 'Em negociação',
      displayValue: data.negociacao.toLocaleString('pt-BR'),
    },
    {
      name: 'Fechado Ganho',
      value: data.fechado_ganho,
      percentage: topValue > 0 ? (data.fechado_ganho / topValue) * 100 : 0,
      color: 'from-blue-200 to-blue-100',
      icon: Trophy,
      description: 'Negócios fechados',
      displayValue: `${data.fechado_ganho} (${formatCurrency(data.won_value)})`,
    },
  ];

  // Overall conversion rate
  const overallConversion = topValue > 0 ? (data.fechado_ganho / topValue) * 100 : 0;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Funil de Conversão Completo
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Meta Ads → CRM Pipeline → Fechamento
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Taxa de Conversão Total</div>
            <div className="text-2xl font-bold text-success">
              {overallConversion.toFixed(3)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative py-8">
          {/* Funnel visualization */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Funil (esquerda) */}
            <div className="md:col-span-2">
              <div className="space-y-1">
                {stages.map((stage, index) => {
                  const top = Math.max(stage.percentage, 8);
                  const next = index < stages.length - 1 ? Math.max(stages[index + 1].percentage, 8) : top;
                  const leftTop = (100 - top) / 2;
                  const rightTop = 100 - leftTop;
                  const leftBottom = (100 - next) / 2;
                  const rightBottom = 100 - leftBottom;
                  const highlighted = hoverIndex === null || hoverIndex === index;

                  return (
                    <div key={stage.name} className="relative h-10 md:h-14">
                      <div
                        className={`absolute inset-0 mx-auto bg-gradient-to-r ${stage.color} shadow-md transition-all duration-700 ease-out overflow-hidden`}
                        style={{
                          clipPath: `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`,
                          opacity: highlighted ? 0.95 : 0.65,
                          width: '100%'
                        }}
                        onMouseEnter={() => setHoverIndex(index)}
                        onMouseLeave={() => setHoverIndex(null)}
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda (direita) */}
            <div className="space-y-2">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <button
                    key={`legend-${stage.name}`}
                    type="button"
                    className={`w-full flex items-center justify-between rounded-md border border-border bg-white/5 p-3 transition-colors hover:bg-white/10 ${hoverIndex === index ? 'ring-1 ring-white/20' : ''}`}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-sm`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">{stage.name}</div>
                        <div className="text-xs text-muted-foreground">{stage.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{stage.displayValue}</div>
                      <div className="text-xs text-muted-foreground">{stage.percentage.toFixed(2)}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Click-Through Rate</div>
                <div className="text-xl font-bold text-foreground">
                  {data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Lead Conversion</div>
                <div className="text-xl font-bold text-foreground">
                  {data.clicks > 0 ? ((data.leads_meta / data.clicks) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Pipeline Entry</div>
                <div className="text-xl font-bold text-foreground">
                  {data.leads_meta > 0 ? ((data.novo_lead / data.leads_meta) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Close Rate</div>
                <div className="text-xl font-bold text-success">
                  {data.novo_lead > 0 ? ((data.fechado_ganho / data.novo_lead) * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
            </div>
          </div>

          {/* Lost opportunities */}
          {data.fechado_perdido > 0 && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
              <X className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  Oportunidades Perdidas
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.fechado_perdido} leads não convertidos no pipeline
                </div>
              </div>
              <div className="text-lg font-bold text-destructive">
                {data.fechado_perdido}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
