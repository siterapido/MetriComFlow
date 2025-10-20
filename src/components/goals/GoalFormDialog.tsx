import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Target, Calendar } from 'lucide-react'
import { useCreateGoal, useUpdateGoal, useCalculateGoalProgress } from '@/hooks/useGoals'
import { useAdAccounts, useAdCampaigns } from '@/hooks/useMetaMetrics'
import { KPISelector } from './KPISelector'
import type { Goal, GoalType, GoalPeriodType, GoalFormData } from '@/types/goals'
import { GOAL_TYPE_METADATA } from '@/types/goals'

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
  onSuccess?: () => void
}

export function GoalFormDialog({ open, onOpenChange, goal, onSuccess }: GoalFormDialogProps) {
  const isEditing = !!goal

  // Hooks
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const calculateProgress = useCalculateGoalProgress()
  const { data: adAccounts } = useAdAccounts()

  // Form state
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    goal_type: 'crm_revenue',
    target_value: 0,
    period_type: 'monthly',
    period_start: '',
    period_end: '',
    color: '#2DA7FF',
  })

  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const { data: campaigns } = useAdCampaigns(selectedAccount || undefined)

  // Initialize form with goal data when editing
  useEffect(() => {
    if (goal && open) {
      setFormData({
        title: goal.title,
        description: goal.description || '',
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        period_type: goal.period_type,
        period_start: goal.period_start,
        period_end: goal.period_end,
        meta_account_id: goal.meta_account_id || undefined,
        meta_campaign_id: goal.meta_campaign_id || undefined,
        revenue_category: goal.revenue_category || undefined,
        custom_formula: goal.custom_formula || undefined,
        color: goal.color,
        icon: goal.icon || undefined,
      })

      if (goal.meta_account_id) {
        setSelectedAccount(goal.meta_account_id)
      }
    } else if (!goal && open) {
      // Reset form when creating new goal
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      setFormData({
        title: '',
        description: '',
        goal_type: 'crm_revenue',
        target_value: 0,
        period_type: 'monthly',
        period_start: firstDay.toISOString().split('T')[0],
        period_end: lastDay.toISOString().split('T')[0],
        color: '#2DA7FF',
      })
      setSelectedAccount('')
    }
  }, [goal, open])

  const metadata = GOAL_TYPE_METADATA[formData.goal_type]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Por favor, insira um título para a meta')
      return
    }

    if (formData.target_value <= 0) {
      toast.error('O valor alvo deve ser maior que zero')
      return
    }

    if (!formData.period_start || !formData.period_end) {
      toast.error('Por favor, selecione o período da meta')
      return
    }

    try {
      if (isEditing && goal) {
        // Update existing goal
        await updateGoal.mutateAsync({
          id: goal.id,
          updates: {
            title: formData.title,
            description: formData.description || null,
            goal_type: formData.goal_type,
            target_value: formData.target_value,
            period_type: formData.period_type,
            period_start: formData.period_start,
            period_end: formData.period_end,
            meta_account_id: formData.meta_account_id || null,
            meta_campaign_id: formData.meta_campaign_id || null,
            revenue_category: formData.revenue_category || null,
            custom_formula: formData.custom_formula || null,
            color: formData.color || '#2DA7FF',
            icon: formData.icon || null,
          },
        })

        // Calculate progress for the updated goal
        if (formData.goal_type !== 'custom') {
          await calculateProgress.mutateAsync(goal.id)
        }

        toast.success('Meta atualizada com sucesso!')
      } else {
        // Create new goal
        const newGoal = await createGoal.mutateAsync({
          title: formData.title,
          description: formData.description || null,
          goal_type: formData.goal_type,
          target_value: formData.target_value,
          start_value: 0,
          current_value: 0,
          period_type: formData.period_type,
          period_start: formData.period_start,
          period_end: formData.period_end,
          meta_account_id: formData.meta_account_id || null,
          meta_campaign_id: formData.meta_campaign_id || null,
          revenue_category: formData.revenue_category || null,
          custom_formula: formData.custom_formula || null,
          color: formData.color || '#2DA7FF',
          icon: formData.icon || null,
          status: 'active',
        })

        // Calculate progress for the new goal
        if (formData.goal_type !== 'custom') {
          await calculateProgress.mutateAsync(newGoal.id)
        }

        toast.success('Meta criada com sucesso!')
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving goal:', error)
      toast.error('Erro ao salvar meta. Tente novamente.')
    }
  }

  const isLoading = createGoal.isPending || updateGoal.isPending || calculateProgress.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Meta' : 'Criar Nova Meta'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Atualize as informações da meta' : 'Defina uma meta personalizada para acompanhar seus KPIs'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Título da Meta *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Faturamento do mês"
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional da meta"
              className="bg-background border-border text-foreground"
              rows={2}
            />
          </div>

          {/* Goal Type - Visual KPI Selector */}
          <div className="space-y-2">
            <Label className="text-foreground text-lg font-semibold">Selecione o KPI *</Label>
            <KPISelector
              value={formData.goal_type}
              onChange={(value: GoalType) => setFormData({ ...formData, goal_type: value })}
            />
          </div>

          {/* Meta Ads Filters */}
          {metadata.supportsFilters.metaAccount && (
            <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/20">
              <Label className="text-foreground font-semibold">Filtros Meta Ads (opcional)</Label>

              {/* Account Filter */}
              <div className="space-y-2">
                <Label htmlFor="meta_account_id" className="text-foreground text-sm">Conta de Anúncios</Label>
                <Select
                  value={formData.meta_account_id || 'all'}
                  onValueChange={(value) => {
                    const accountId = value === 'all' ? undefined : value
                    setFormData({ ...formData, meta_account_id: accountId, meta_campaign_id: undefined })
                    setSelectedAccount(accountId || '')
                  }}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {(adAccounts || []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.business_name || account.external_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign Filter */}
              {metadata.supportsFilters.metaCampaign && formData.meta_account_id && (
                <div className="space-y-2">
                  <Label htmlFor="meta_campaign_id" className="text-foreground text-sm">Campanha</Label>
                  <Select
                    value={formData.meta_campaign_id || 'all'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, meta_campaign_id: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">Todas as campanhas</SelectItem>
                      {(campaigns || []).map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Revenue Category Filter */}
          {metadata.supportsFilters.revenueCategory && (
            <div className="space-y-2">
              <Label htmlFor="revenue_category" className="text-foreground">Categoria de Receita</Label>
              <Select
                value={formData.revenue_category || 'all'}
                onValueChange={(value) =>
                  setFormData({ ...formData, revenue_category: value === 'all' ? undefined : value as any })
                }
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="new_up">New Up</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="oportunidades">Oportunidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="target_value" className="text-foreground">
              Valor Alvo * {metadata.unit === 'percentage' ? '(%)' : metadata.unit === 'currency' ? '(R$)' : ''}
            </Label>
            <Input
              id="target_value"
              type="number"
              min="0"
              step={metadata.unit === 'currency' ? '0.01' : metadata.unit === 'percentage' ? '0.1' : '1'}
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
              placeholder="Ex: 100000"
              className="bg-background border-border text-foreground"
            />
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start" className="text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data Início *
              </Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_end" className="text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data Fim *
              </Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          {/* Period Type */}
          <div className="space-y-2">
            <Label htmlFor="period_type" className="text-foreground">Tipo de Período</Label>
            <Select
              value={formData.period_type}
              onValueChange={(value: GoalPeriodType) => setFormData({ ...formData, period_type: value })}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Atualizando...' : 'Criando...'}
                </>
              ) : (
                <>{isEditing ? 'Atualizar Meta' : 'Criar Meta'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
