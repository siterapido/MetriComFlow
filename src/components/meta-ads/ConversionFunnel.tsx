import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ConversionFunnelProps {
  data: {
    novo: number
    contato_inicial: number
    qualificado: number
    proposta: number
    negociacao: number
    fechado_ganho: number
  }
  isLoading?: boolean
}

export function ConversionFunnel({ data, isLoading }: ConversionFunnelProps) {
  // Calculate funnel widths based on the largest stage (for visual proportion)
  const maxValue = Math.max(data.novo, data.contato_inicial, data.qualificado, data.proposta, data.negociacao, data.fechado_ganho)

  const stages = [
    {
      label: 'Novos',
      value: data.novo,
      width: maxValue > 0 ? Math.max((data.novo / maxValue) * 100, 30) : 100,
      color: 'from-blue-400 to-blue-500'
    },
    {
      label: 'Contato',
      value: data.contato_inicial,
      width: maxValue > 0 ? Math.max((data.contato_inicial / maxValue) * 100, 25) : 80,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Qualificados',
      value: data.qualificado,
      width: maxValue > 0 ? Math.max((data.qualificado / maxValue) * 100, 20) : 60,
      color: 'from-blue-600 to-blue-700'
    },
    {
      label: 'Proposta',
      value: data.proposta,
      width: maxValue > 0 ? Math.max((data.proposta / maxValue) * 100, 15) : 50,
      color: 'from-blue-700 to-blue-800'
    },
    {
      label: 'Negociação',
      value: data.negociacao,
      width: maxValue > 0 ? Math.max((data.negociacao / maxValue) * 100, 12) : 40,
      color: 'from-blue-800 to-blue-900'
    },
    {
      label: 'Fechados',
      value: data.fechado_ganho,
      width: maxValue > 0 ? Math.max((data.fechado_ganho / maxValue) * 100, 10) : 30,
      color: 'from-blue-900 to-slate-900'
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div
          key={stage.label}
          className="relative flex flex-col items-center w-full"
          style={{ maxWidth: `${stage.width}%` }}
        >
          {/* Funnel Stage */}
          <div
            className={`
              w-full h-16 rounded-lg
              bg-gradient-to-br ${stage.color}
              flex items-center justify-between px-4
              shadow-md
              transition-all duration-300 hover:scale-105 hover:shadow-lg
              relative
            `}
          >
            <span className="text-white text-sm font-medium">
              {stage.label}
            </span>
            <span className="text-white text-2xl font-bold">
              {stage.value.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Connector */}
          {index !== stages.length - 1 && (
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[10px] border-t-blue-900/30 my-1" />
          )}
        </div>
      ))}
    </div>
  )
}
