'use client'

import { useState, useEffect } from 'react'
import { Bell, Clock, X, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useTasks, useUpdateTask } from '@/hooks/useTasks'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { cn } from '@/lib/utils'
import { useUserSettings } from '@/hooks/useUserSettings'

interface TaskRemindersProps {
  assignedTo?: string
}

export function TaskReminders({ assignedTo }: TaskRemindersProps) {
  const { data: settings } = useUserSettings()
  const [notifications, setNotifications] = useState<any[]>([])
  const [enableNotifications, setEnableNotifications] = useState(settings?.crm.remindTasks ?? true)
  const [showOverdue, setShowOverdue] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)

  const { data: tasks = [] } = useTasks({
    assignedTo,
    completed: false
  })
  const { data: teamMembers = [] } = useTeamMembers()
  const updateTask = useUpdateTask()

  useEffect(() => {
    setEnableNotifications(settings?.crm.remindTasks ?? true)
  }, [settings?.crm.remindTasks])

  // Gerar notificações baseadas nas tarefas
  useEffect(() => {
    if (!enableNotifications) {
      setNotifications([])
      return
    }

    const now = new Date()
    const newNotifications: any[] = []

    tasks.forEach(task => {
      if (task.completed || !task.due_date) return

      const dueDate = new Date(task.due_date)
      const timeDiff = dueDate.getTime() - now.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

      // Tarefas vencidas
      if (timeDiff < 0 && showOverdue) {
        newNotifications.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          task,
          title: 'Tarefa Vencida',
          message: `"${task.title}" venceu há ${Math.abs(daysDiff)} dia(s)`,
          priority: 'high',
          timestamp: now
        })
      }

      // Tarefas vencendo hoje
      if (daysDiff === 0 && timeDiff > 0 && showUpcoming) {
        newNotifications.push({
          id: `today-${task.id}`,
          type: 'today',
          task,
          title: 'Vence Hoje',
          message: `"${task.title}" vence hoje às ${dueDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          priority: 'high',
          timestamp: now
        })
      }

      // Tarefas vencendo amanhã
      if (daysDiff === 1 && showUpcoming) {
        newNotifications.push({
          id: `tomorrow-${task.id}`,
          type: 'tomorrow',
          task,
          title: 'Vence Amanhã',
          message: `"${task.title}" vence amanhã`,
          priority: 'medium',
          timestamp: now
        })
      }

      // Tarefas de alta prioridade vencendo em 3 dias
      if (task.priority === 'alta' && daysDiff <= 3 && daysDiff > 0 && showUpcoming) {
        newNotifications.push({
          id: `priority-${task.id}`,
          type: 'priority',
          task,
          title: 'Alta Prioridade',
          message: `Tarefa de alta prioridade "${task.title}" vence em ${daysDiff} dia(s)`,
          priority: 'high',
          timestamp: now
        })
      }
    })

    // Ordenar por prioridade e data
    newNotifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    setNotifications(newNotifications)
  }, [tasks, enableNotifications, showOverdue, showUpcoming])

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const markTaskComplete = async (task: any) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        completed: true
      })
      // Remove notificações relacionadas a esta tarefa
      setNotifications(prev => prev.filter(n => n.task.id !== task.id))
    } catch (error) {
      console.error('Erro ao marcar tarefa como concluída:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'today': return <Clock className="h-5 w-5 text-orange-500" />
      case 'tomorrow': return <Calendar className="h-5 w-5 text-blue-500" />
      case 'reminder': return <Bell className="h-5 w-5 text-purple-500" />
      case 'priority': return <AlertTriangle className="h-5 w-5 text-red-500" />
      default: return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-500'
      case 'media': return 'bg-yellow-500'
      case 'baixa': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ligacao': return '📞'
      case 'email': return '📧'
      case 'reuniao': return '🤝'
      case 'follow_up': return '📋'
      case 'proposta': return '📄'
      case 'negociacao': return '💼'
      default: return '📝'
    }
  }

  if (!settings?.crm.remindTasks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Lembretes desativados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ative os lembretes nas preferências de CRM em <strong>Meu Perfil &amp; Configurações</strong> para receber avisos de follow-up.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Lembretes e Notificações
              {notifications.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
                <Label htmlFor="notifications" className="text-sm">
                  Ativar notificações
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Configurações */}
          <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                id="overdue"
                checked={showOverdue}
                onCheckedChange={setShowOverdue}
                disabled={!enableNotifications}
              />
              <Label htmlFor="overdue" className="text-sm">
                Tarefas vencidas
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="upcoming"
                checked={showUpcoming}
                onCheckedChange={setShowUpcoming}
                disabled={!enableNotifications}
              />
              <Label htmlFor="upcoming" className="text-sm">
                Próximas tarefas
              </Label>
            </div>
          </div>

          {/* Lista de notificações */}
          {!enableNotifications ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Notificações desativadas</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Nenhuma notificação pendente</p>
              <p className="text-sm">Todas as suas tarefas estão em dia!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const assignee = teamMembers.find(m => m.id === notification.task.assigned_to)
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      getNotificationColor(notification.priority)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getPriorityColor(notification.task.priority))}
                            >
                              {notification.task.priority}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <span>{getTypeIcon(notification.task.task_type)}</span>
                              <span className="capitalize">
                                {notification.task.task_type.replace('_', ' ')}
                              </span>
                            </div>
                            
                            {assignee && (
                              <div className="flex items-center gap-1">
                                <span>👤</span>
                                <span>{assignee.name}</span>
                              </div>
                            )}
                            
                            {notification.task.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(notification.task.due_date).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markTaskComplete(notification.task)}
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Concluir
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissNotification(notification.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
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
    </div>
  )
}
