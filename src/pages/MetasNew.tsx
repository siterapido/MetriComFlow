import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Loader2, Target, RefreshCw, Filter } from 'lucide-react'
import { useGoals, useDeleteGoal, useCalculateGoalProgress, useBulkCalculateGoals } from '@/hooks/useGoals'
import { GoalFormDialog } from '@/components/goals/GoalFormDialog'
import { GoalCard } from '@/components/goals/GoalCard'
import { toast } from 'sonner'
import type { Goal } from '@/types/goals'

export default function MetasNew() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active')

  // Hooks
  const { data: allGoals, isLoading } = useGoals()
  const deleteGoal = useDeleteGoal()
  const calculateProgress = useCalculateGoalProgress()
  const bulkCalculate = useBulkCalculateGoals()

  // Filter goals by status
  const filteredGoals = (allGoals || []).filter((goal) => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return goal.status === 'active'
    if (activeTab === 'completed') return goal.status === 'completed'
    return true
  })

  // Group goals by category
  const goalsByCategory = {
    crm: filteredGoals.filter((g) => g.goal_type.startsWith('crm_')),
    meta: filteredGoals.filter((g) => g.goal_type.startsWith('meta_')),
    revenue: filteredGoals.filter((g) => g.goal_type.startsWith('revenue_')),
    custom: filteredGoals.filter((g) => g.goal_type === 'custom'),
  }

  // Calculate summary stats
  const totalGoals = filteredGoals.length
  const activeGoals = filteredGoals.filter((g) => g.status === 'active').length
  const completedGoals = filteredGoals.filter((g) => g.progress_percentage >= 100).length
  const avgProgress =
    filteredGoals.length > 0
      ? filteredGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / filteredGoals.length
      : 0

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleDelete = async (goal: Goal) => {
    if (window.confirm(`Tem certeza que deseja excluir a meta "${goal.title}"?`)) {
      try {
        await deleteGoal.mutateAsync(goal.id)
        toast.success('Meta excluída com sucesso!')
      } catch (error) {
        toast.error('Erro ao excluir meta. Tente novamente.')
      }
    }
  }

  const handleRefresh = async (goal: Goal) => {
    try {
      await calculateProgress.mutateAsync(goal.id)
      toast.success('Progresso atualizado!')
    } catch (error) {
      toast.error('Erro ao atualizar progresso.')
    }
  }

  const handleBulkRefresh = async () => {
    try {
      await bulkCalculate.mutateAsync()
      toast.success('Todas as metas foram atualizadas!')
    } catch (error) {
      toast.error('Erro ao atualizar metas.')
    }
  }

  const handleNewGoal = () => {
    setEditingGoal(null)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingGoal(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Metas</h1>
            <p className="text-muted-foreground mt-1">
              Sistema unificado de metas integrado ao CRM e Meta Ads
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBulkRefresh}
            disabled={bulkCalculate.isPending || activeGoals === 0}
            className="gap-2 border-border"
          >
            {bulkCalculate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar Todas
          </Button>
          <Button onClick={handleNewGoal} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total de Metas</div>
            <div className="text-2xl font-bold text-foreground">{totalGoals}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Metas Ativas</div>
            <div className="text-2xl font-bold text-primary">{activeGoals}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Concluídas</div>
            <div className="text-2xl font-bold text-success">{completedGoals}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Progresso Médio</div>
            <div className="text-2xl font-bold text-foreground">{avgProgress.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-muted">
          <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Ativas ({goalsByCategory.crm.length + goalsByCategory.meta.length + goalsByCategory.revenue.length + goalsByCategory.custom.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Concluídas
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {filteredGoals.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Target className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === 'active'
                    ? 'Nenhuma meta ativa encontrada.'
                    : activeTab === 'completed'
                      ? 'Nenhuma meta concluída.'
                      : 'Nenhuma meta cadastrada ainda.'}
                </p>
                <Button onClick={handleNewGoal} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  Criar Primeira Meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* CRM Goals */}
              {goalsByCategory.crm.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Metas de CRM</h2>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {goalsByCategory.crm.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goalsByCategory.crm.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Meta Ads Goals */}
              {goalsByCategory.meta.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Metas de Meta Ads</h2>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {goalsByCategory.meta.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goalsByCategory.meta.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Goals */}
              {goalsByCategory.revenue.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Metas de Receita</h2>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {goalsByCategory.revenue.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goalsByCategory.revenue.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Goals */}
              {goalsByCategory.custom.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Metas Personalizadas</h2>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {goalsByCategory.custom.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goalsByCategory.custom.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        goal={editingGoal}
        onSuccess={handleFormClose}
      />
    </div>
  )
}
