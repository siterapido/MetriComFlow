import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useInteractions } from '@/hooks/useInteractions'
import { useTasks } from '@/hooks/useTasks'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  CheckCircle,
  Clock,
  User
} from 'lucide-react'

interface ActivityLogProps {
  leadId?: string
  limit?: number
}

type ActivityItem = {
  id: string
  type: 'interaction' | 'task'
  date: string
  title: string
  description?: string
  status?: string
  assignee?: string
  icon: React.ReactNode
  color: string
}

const getInteractionIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'call':
    case 'ligação':
      return <Phone className="h-4 w-4" />
    case 'email':
      return <Mail className="h-4 w-4" />
    case 'meeting':
    case 'reunião':
      return <Calendar className="h-4 w-4" />
    case 'message':
    case 'mensagem':
      return <MessageSquare className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const getTaskIcon = (completed: boolean) => {
  return completed ? (
    <CheckCircle className="h-4 w-4" />
  ) : (
    <Clock className="h-4 w-4" />
  )
}

const getStatusColor = (type: string, status?: string, completed?: boolean) => {
  if (type === 'task') {
    return completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }
  
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'concluído':
      return 'bg-green-100 text-green-800'
    case 'scheduled':
    case 'agendado':
      return 'bg-blue-100 text-blue-800'
    case 'cancelled':
    case 'cancelado':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function ActivityLog({ leadId, limit = 50 }: ActivityLogProps) {
  const { data: interactions, isLoading: loadingInteractions } = useInteractions(leadId)
  const { data: tasks, isLoading: loadingTasks } = useTasks({ 
    leadId,
    completed: undefined // Para incluir todas as tarefas
  })
  const { data: teamMembers } = useTeamMembers()

  const getTeamMemberName = (userId: string) => {
    const member = teamMembers?.find(m => m.profile_id === userId)
    return member?.name || 'Usuário desconhecido'
  }

  const activities: ActivityItem[] = React.useMemo(() => {
    const items: ActivityItem[] = []

    // Adicionar interações
    if (interactions) {
      interactions.forEach(interaction => {
        items.push({
          id: `interaction-${interaction.id}`,
          type: 'interaction',
          date: interaction.interaction_date || interaction.created_at,
          title: interaction.interaction_type || 'Interação',
          description: interaction.description,
          status: interaction.outcome,
          assignee: interaction.created_by ? getTeamMemberName(interaction.created_by) : undefined,
          icon: getInteractionIcon(interaction.interaction_type || ''),
          color: getStatusColor('interaction', interaction.outcome)
        })
      })
    }

    // Adicionar tarefas
    if (tasks) {
      tasks.forEach(task => {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          date: task.due_date || task.created_at,
          title: task.title,
          description: task.description,
          status: task.completed ? 'Concluída' : 'Pendente',
          assignee: task.assigned_to ? getTeamMemberName(task.assigned_to) : undefined,
          icon: getTaskIcon(task.completed),
          color: getStatusColor('task', undefined, task.completed)
        })
      })
    }

    // Ordenar por data (mais recente primeiro)
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }, [interactions, tasks, teamMembers, limit])

  if (loadingInteractions || loadingTasks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma atividade registrada ainda.</p>
            <p className="text-sm">Interações e tarefas aparecerão aqui.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Atividades
          <Badge variant="secondary" className="ml-auto">
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${activity.color}`}>
                    {activity.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${activity.color}`}
                      >
                        {activity.type === 'interaction' ? 'Interação' : 'Tarefa'}
                      </Badge>
                    </div>
                    
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(activity.date), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR
                        })}
                      </span>
                      
                      {activity.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.assignee}
                        </span>
                      )}
                      
                      {activity.status && (
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {index < activities.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}