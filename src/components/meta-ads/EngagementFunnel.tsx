interface EngagementFunnelProps {
  data: {
    impressions: number
    clicks: number
    leads: number
  }
  isLoading?: boolean
}

export function EngagementFunnel({ data, isLoading }: EngagementFunnelProps) {
  // Calculate funnel widths based on the largest stage
  const maxValue = Math.max(data.impressions, data.clicks, data.leads)

  const stages = [
    {
      label: 'Impressões',
      value: data.impressions,
      width: maxValue > 0 ? Math.max((data.impressions / maxValue) * 100, 30) : 100,
      color: 'from-sky-400 to-sky-500'
    },
    {
      label: 'Cliques',
      value: data.clicks,
      width: maxValue > 0 ? Math.max((data.clicks / maxValue) * 100, 25) : 70,
      color: 'from-sky-500 to-sky-600'
    },
    {
      label: 'Leads',
      value: data.leads,
      width: maxValue > 0 ? Math.max((data.leads / maxValue) * 100, 20) : 50,
      color: 'from-sky-600 to-sky-700'
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
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
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[10px] border-t-sky-700/30 my-1" />
          )}
        </div>
      ))}
    </div>
  )
}
