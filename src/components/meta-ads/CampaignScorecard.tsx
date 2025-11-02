import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'
import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CampaignScorecardProps {
  data: Array<{
    campaign_name: string
    campaign_status: string | null
    investimento: number
    leads_gerados: number
    cpl: number | null
    roas: number | null
    ctr: number
    taxa_conversao: number
  }>
  cplTarget?: number // Target CPL for green/yellow/red classification
  isLoading?: boolean
}

// Individual campaign row component
function CampaignRow({ campaign, cplTarget }: { campaign: any; cplTarget: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPerformanceStatus = (cpl: number | null) => {
    if (!cpl) return 'unknown'
    if (cpl <= cplTarget) return 'excellent'
    if (cpl <= cplTarget * 1.5) return 'good'
    return 'poor'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'border-l-green-500 hover:bg-green-500/5'
      case 'good':
        return 'border-l-yellow-500 hover:bg-yellow-500/5'
      case 'poor':
        return 'border-l-red-500 hover:bg-red-500/5'
      default:
        return 'border-l-gray-500 hover:bg-muted/50'
    }
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'excellent':
        return <div className="w-2 h-2 rounded-full bg-green-500" />
      case 'good':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />
      case 'poor':
        return <div className="w-2 h-2 rounded-full bg-red-500" />
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500" />
    }
  }

  const performanceStatus = getPerformanceStatus(campaign.cpl)
  const statusColor = getStatusColor(performanceStatus)

  return (
    <div
      className={cn(
        'border-l-4 border-border rounded-md bg-card transition-all',
        statusColor
      )}
    >
      {/* Collapsed View - Thin Block */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getStatusIndicator(performanceStatus)}
          <span className="font-medium text-foreground truncate text-sm">
            {campaign.campaign_name}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-muted-foreground">CPL: </span>
              <span className="font-semibold text-foreground">
                {campaign.cpl ? formatCurrency(campaign.cpl) : '-'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Leads: </span>
              <span className="font-semibold text-foreground">{campaign.leads_gerados}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Invest: </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(campaign.investimento)}
              </span>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded View - Detailed Metrics */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">CPL</p>
              <p className="text-base font-bold text-foreground">
                {campaign.cpl ? formatCurrency(campaign.cpl) : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Investimento</p>
              <p className="text-base font-bold text-foreground">
                {formatCurrency(campaign.investimento)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Leads</p>
              <p className="text-base font-bold text-foreground">{campaign.leads_gerados}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="text-base font-bold text-foreground">{campaign.ctr.toFixed(2)}%</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ROAS</p>
              <p className="text-base font-bold text-foreground">
                {campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              <p className="text-base font-bold text-foreground">
                {campaign.taxa_conversao.toFixed(1)}%
              </p>
            </div>

            {campaign.campaign_status && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className="text-xs">
                  {campaign.campaign_status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CampaignScorecard({ data, cplTarget = 50, isLoading }: CampaignScorecardProps) {
  const [currentTarget, setCurrentTarget] = useState(cplTarget)
  const [inputValue, setInputValue] = useState(cplTarget.toString())
  const [isEditing, setIsEditing] = useState(false)

  const handleUpdateTarget = () => {
    const newTarget = parseFloat(inputValue)
    if (!isNaN(newTarget) && newTarget > 0) {
      setCurrentTarget(newTarget)
      setIsEditing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUpdateTarget()
    } else if (e.key === 'Escape') {
      setInputValue(currentTarget.toString())
      setIsEditing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Scorecard de Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Scorecard de Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Sem campanhas disponíveis
          </div>
        </CardContent>
      </Card>
    )
  }

  const getPerformanceStatus = (cpl: number | null) => {
    if (!cpl) return 'unknown'
    if (cpl <= currentTarget) return 'excellent'
    if (cpl <= currentTarget * 1.5) return 'good'
    return 'poor'
  }

  // Sort campaigns by CPL (ascending)
  const sortedData = [...data].sort((a, b) => {
    if (!a.cpl) return 1
    if (!b.cpl) return -1
    return a.cpl - b.cpl
  })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-foreground">Scorecard de Campanhas</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Classificação por CPL
            </CardDescription>
          </div>

          {/* Target CPL Setting */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Meta CPL:</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleUpdateTarget}
                    className="w-20 h-7 text-sm px-2"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                >
                  {formatCurrency(currentTarget)}
                </button>
              )}
            </div>

            {/* Summary Stats - Compact */}
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-semibold text-foreground">
                  {sortedData.filter(c => getPerformanceStatus(c.cpl) === 'excellent').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-semibold text-foreground">
                  {sortedData.filter(c => getPerformanceStatus(c.cpl) === 'good').length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-foreground">
                  {sortedData.filter(c => getPerformanceStatus(c.cpl) === 'poor').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedData.map((campaign, index) => (
            <CampaignRow key={index} campaign={campaign} cplTarget={currentTarget} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
