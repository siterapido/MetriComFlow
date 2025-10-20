import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  CheckSquare,
  MessageSquare,
  Activity,
  Plus,
  Users,
  Target,
  TrendingUp
} from 'lucide-react'

// Importar componentes do sistema de tarefas
import { TaskList } from '@/components/tasks/TaskList'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCalendar } from '@/components/tasks/TaskCalendar'
import { TaskReminders } from '@/components/tasks/TaskReminders'

// Importar componentes do sistema de interações
import { InteractionForm } from '@/components/interactions/InteractionForm'
import { InteractionList } from '@/components/interactions/InteractionList'
import { ActivityLog } from '@/components/interactions/ActivityLog'

// Importar hooks
import { useTasks } from '@/hooks/useTasks'
import { useInteractions } from '@/hooks/useInteractions'
import { useAuth } from '@/hooks/useAuth'

interface CRMDashboardProps {
  leadId?: string
}

export function CRMDashboard({ leadId }: CRMDashboardProps) {
  const { user } = useAuth()
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null)

  // Buscar dados para estatísticas
  const { data: myTasks } = useTasks({ 
    assignedTo: user?.id,
    completed: false 
  })
  const { data: myInteractions } = useInteractions()
  const { data: allTasks } = useTasks({ leadId })
  const { data: leadInteractions } = useInteractions(leadId)

  const stats = {
    pendingTasks: myTasks?.length || 0,
    totalInteractions: leadId ? leadInteractions?.length || 0 : myInteractions?.length || 0,
    completedTasks: allTasks?.filter(t => t.completed)?.length || 0,
    overdueTasks: myTasks?.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && !t.completed
    )?.length || 0
  }

  const handleEditTask = (task: any) => {
    setSelectedTask(task)
    setShowTaskForm(true)
  }

  const handleEditInteraction = (interaction: any) => {
    setSelectedInteraction(interaction)
    setShowInteractionForm(true)
  }

  const handleCloseTaskForm = () => {
    setShowTaskForm(false)
    setSelectedTask(null)
  }

  const handleCloseInteractionForm = () => {
    setShowInteractionForm(false)
    setSelectedInteraction(null)
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas do CRM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tarefas Pendentes
                </p>
                <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interações
                </p>
                <p className="text-2xl font-bold">{stats.totalInteractions}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Concluídas
                </p>
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Atrasadas
                </p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lembretes e Alertas */}
      <TaskReminders />

      {/* Abas principais do CRM */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tarefas
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Interações
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividades
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button 
              onClick={() => setShowTaskForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowInteractionForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Interação
            </Button>
          </div>
        </div>

        <TabsContent value="tasks" className="space-y-4">
          <TaskList 
            leadId={leadId}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <TaskCalendar 
            leadId={leadId}
          />
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <InteractionList 
            leadId={leadId}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityLog 
            leadId={leadId}
            limit={100}
          />
        </TabsContent>
      </Tabs>

      {/* Modais de formulários */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCloseTaskForm}
              >
                ✕
              </Button>
            </div>
            <TaskForm 
              task={selectedTask}
              leadId={leadId}
              onSuccess={handleCloseTaskForm}
              onClose={handleCloseTaskForm}
            />
          </div>
        </div>
      )}

      {showInteractionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedInteraction ? 'Editar Interação' : 'Nova Interação'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCloseInteractionForm}
              >
                ✕
              </Button>
            </div>
            <InteractionForm 
              interaction={selectedInteraction}
              leadId={leadId}
              onSuccess={handleCloseInteractionForm}
              onClose={handleCloseInteractionForm}
            />
          </div>
        </div>
      )}
    </div>
  )
}