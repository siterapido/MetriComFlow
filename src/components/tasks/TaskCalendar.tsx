'use client'

import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTasks } from '@/hooks/useTasks'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { TaskForm } from './TaskForm'
import { cn } from '@/lib/utils'

interface TaskCalendarProps {
  assignedTo?: string
  leadId?: string
}

export function TaskCalendar({ assignedTo, leadId }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: tasks = [] } = useTasks({
    assignedTo,
    leadId,
    completed: false
  })
  const { data: teamMembers = [] } = useTeamMembers()

  // Gerar dias do mês
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate])

  // Agrupar tarefas por data
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    
    tasks.forEach(task => {
      if (task.due_date) {
        const date = new Date(task.due_date).toDateString()
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(task)
      }
    })
    
    return grouped
  }, [tasks])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário de Tarefas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setShowForm(true)}>
              Nova Tarefa
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Grade do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, index) => {
              const dateString = date.toDateString()
              const dayTasks = tasksByDate[dateString] || []
              const isCurrentMonthDay = isCurrentMonth(date)
              const isTodayDate = isToday(date)

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[120px] p-2 border rounded-lg",
                    isCurrentMonthDay ? "bg-white" : "bg-gray-50",
                    isTodayDate && "ring-2 ring-blue-500 bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isCurrentMonthDay ? "text-gray-900" : "text-gray-400",
                    isTodayDate && "text-blue-600"
                  )}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const assignee = teamMembers.find(m => m.id === task.assigned_to)
                      
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="cursor-pointer group"
                        >
                          <div className={cn(
                            "text-xs p-1 rounded border-l-2 bg-white shadow-sm",
                            "hover:shadow-md transition-shadow",
                            getPriorityColor(task.priority)
                          )}>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs">{getTypeIcon(task.task_type)}</span>
                              <span className="font-medium truncate flex-1">
                                {task.title}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(task.due_date)}</span>
                              </div>
                              {assignee && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[60px]">
                                    {assignee.name.split(' ')[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{dayTasks.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes da tarefa */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Detalhes da Tarefa</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getTypeIcon(selectedTask.task_type)}</span>
                  <h3 className="font-semibold">{selectedTask.title}</h3>
                </div>
                
                {selectedTask.description && (
                  <p className="text-gray-600 text-sm">{selectedTask.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Prioridade:</span>
                  <Badge className={cn("ml-2", getPriorityColor(selectedTask.priority))}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                
                <div>
                  <span className="text-gray-500">Vencimento:</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(selectedTask.due_date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {selectedTask.assigned_to && (
                <div>
                  <span className="text-gray-500 text-sm">Responsável:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>
                      {teamMembers.find(m => m.id === selectedTask.assigned_to)?.name || 'Usuário'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTask(null)
                    setShowForm(true)
                  }}
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de criação de tarefa */}
      {showForm && (
        <TaskForm
          task={selectedTask}
          leadId={leadId}
          onClose={() => {
            setShowForm(false)
            setSelectedTask(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}