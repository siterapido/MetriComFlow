import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Target, MoreVertical, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import type { Goal } from '@/types/goals'
import { GOAL_TYPE_METADATA, getGoalStatusColor, formatGoalValue } from '@/types/goals'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useGoalProgress } from '@/hooks/useGoals'
import { Sparkline } from '@/components/charts/Sparkline'

interface GoalCardProps {
  goal: Goal
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  onRefresh?: (goal: Goal) => void
}

export function GoalCard({ goal, onEdit, onDelete, onRefresh }: GoalCardProps) {
  const metadata = GOAL_TYPE_METADATA[goal.goal_type]
  const progressPercentage = goal.progress_percentage || 0

  const daysRemaining = Math.ceil(
    (new Date(goal.period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const isOverdue = daysRemaining < 0
  const isNearDeadline = daysRemaining <= 7 && daysRemaining >= 0

  // Calculate if we're on track
  const totalDays = Math.ceil(
    (new Date(goal.period_end).getTime() - new Date(goal.period_start).getTime()) / (1000 * 60 * 60 * 24)
  )
  const elapsedDays = totalDays - daysRemaining
  const expectedProgress = (elapsedDays / totalDays) * 100

  const isAhead = progressPercentage > expectedProgress + 5
  const isBehind = progressPercentage < expectedProgress - 5
  const isOnTrack = !isAhead && !isBehind

  // Sparkline & tendência
  const { data: progressHistory } = useGoalProgress(goal.id)
  const sparkValuesAsc = (progressHistory || [])
    .slice() // copy
    .reverse() // ascendente por data
    .map(p => p.value)

  const sparkValues = sparkValuesAsc.length > 30 ? sparkValuesAsc.slice(-30) : sparkValuesAsc
  const trendDelta = sparkValues.length >= 2 ? sparkValues[sparkValues.length - 1] - sparkValues[0] : 0
  // Normaliza threshold em 1% do target ou valor absoluto pequeno
  const threshold = Math.max(goal.target_value * 0.01, 0.001)
  const trendUp = trendDelta > threshold
  const trendDown = trendDelta < -threshold

  return (
    <Card className="border-border bg-gradient-to-br from-card to-accent/20 hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: goal.color || '#2DA7FF' }}
              >
                <Target className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-foreground truncate">
                {goal.title}
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="bg-muted text-muted-foreground text-xs">
                {metadata.label}
              </Badge>
              <Badge className={getGoalStatusColor(goal.computed_status)}>
                {goal.computed_status}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {onRefresh && goal.goal_type !== 'custom' && (
                <DropdownMenuItem
                  onClick={() => onRefresh(goal)}
                  className="text-foreground hover:bg-muted cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Progresso
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(goal)}
                  className="text-foreground hover:bg-muted cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(goal)}
                  className="text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {goal.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {goal.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Values */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Atingido:</span>
            <span className="font-semibold text-primary">
              {formatGoalValue(goal.current_value, metadata.unit)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meta:</span>
            <span className="font-semibold text-foreground">
              {formatGoalValue(goal.target_value, metadata.unit)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold text-foreground">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
        </div>

        {/* Tendência (Sparkline) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Tendência</span>
            {trendUp ? (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-success">alta</span>
              </div>
            ) : trendDown ? (
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-warning" />
                <span className="text-warning">queda</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">estável</span>
              </div>
            )}
          </div>
          <Sparkline values={sparkValues} width={120} height={28} className="opacity-80" />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-xs border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            {isAhead ? (
              <>
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success font-medium">Acima da meta</span>
              </>
            ) : isBehind ? (
              <>
                <TrendingDown className="w-4 h-4 text-warning" />
                <span className="text-warning font-medium">Abaixo do esperado</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">No ritmo</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {isOverdue ? (
              <span className="text-destructive font-medium">Atrasado</span>
            ) : isNearDeadline ? (
              <span className="text-warning font-medium">{daysRemaining} dias</span>
            ) : (
              <span>{daysRemaining} dias</span>
            )}
          </div>
        </div>

        {/* Period */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          {format(new Date(goal.period_start), 'dd MMM', { locale: ptBR })} -{' '}
          {format(new Date(goal.period_end), 'dd MMM yyyy', { locale: ptBR })}
        </div>
      </CardContent>
    </Card>
  )
}
