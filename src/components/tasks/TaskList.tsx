import React, { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  Plus,
  Filter,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useTasks, useUpdateTask, useDeleteTask, useTaskStats } from '@/hooks/useTasks'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { TaskForm } from './TaskForm'
import { cn } from '@/lib/utils'

interface TaskListProps {
  leadId?: string
  assignedTo?: string
  showCreateButton?: boolean
}

export function TaskList({ leadId, assignedTo, showCreateButton = true }: TaskListProps) {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const { data: tasks = [], isLoading } = useTasks({ 
    leadId, 
    assignedTo,
    completed: statusFilter === 'completed' ? true : statusFilter === 'pending' ? false : undefined,
    overdue: statusFilter === 'overdue' ? true : undefined
  })
  
  const { data: teamMembers = [] } = useTeamMembers()
  const { data: stats } = useTaskStats(assignedTo)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter

    return matchesSearch && matchesPriority
  })

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    await updateTask.mutateAsync({
      id: taskId,
      completed: !completed
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask.mutateAsync(taskId)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200'
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'baixa': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ligacao': return '📞'
      case 'email': return '📧'
      case 'reuniao': return '🤝'
      case 'follow_up': return '🔄'
      case 'proposta': return '📋'
      default: return '📝'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-gray-600">Atrasadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.high_priority}</div>
              <div className="text-sm text-gray-600">Alta Prioridade</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cabeçalho e filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Tarefas {leadId ? 'do Lead' : ''}
            </CardTitle>
            {showCreateButton && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            )}
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {tasks.length === 0 ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa corresponde aos filtros'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed
                const assignee = teamMembers.find(member => member.id === task.assigned_to)

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-4 border rounded-lg transition-colors",
                      task.completed ? "bg-gray-50 opacity-75" : "bg-white hover:bg-gray-50",
                      isOverdue && !task.completed ? "border-red-200 bg-red-50" : "border-gray-200"
                    )}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task.id, task.completed)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getTypeIcon(task.task_type)}</span>
                            <h4 className={cn(
                              "font-medium",
                              task.completed ? "line-through text-gray-500" : "text-gray-900"
                            )}>
                              {task.title}
                            </h4>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {task.due_date && (
                              <div className={cn(
                                "flex items-center gap-1",
                                isOverdue ? "text-red-600" : "text-gray-500"
                              )}>
                                {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                                {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            )}

                            {assignee && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {assignee.name}
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(task.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de criação de tarefa */}
      {showForm && (
        <TaskForm
          leadId={leadId}
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  )
}