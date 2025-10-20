'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Calendar, Clock, User, Flag, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateTask, useUpdateTask, useTaskTypes, useTaskPriorities } from '@/hooks/useTasks'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useLeads } from '@/hooks/useLeads'
import { cn } from '@/lib/utils'

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  task_type: z.string().min(1, 'Tipo é obrigatório'),
  priority: z.string().min(1, 'Prioridade é obrigatória'),
  assigned_to: z.string().min(1, 'Responsável é obrigatório'),
  lead_id: z.string().optional(),
  due_date: z.string().optional(),
  reminder_date: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  task?: any
  leadId?: string
  onClose: () => void
  onSuccess: () => void
}

export function TaskForm({ task, leadId, onClose, onSuccess }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { data: taskTypes } = useTaskTypes()
  const { data: taskPriorities } = useTaskPriorities()
  const { data: teamMembers } = useTeamMembers()
  const { data: leads } = useLeads({})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      task_type: task?.task_type || '',
      priority: task?.priority || '',
      assigned_to: task?.assigned_to || '',
      lead_id: task?.lead_id || leadId || '',
      due_date: task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
      reminder_date: task?.reminder_date ? new Date(task.reminder_date).toISOString().slice(0, 16) : '',
    }
  })

  const watchedValues = watch()

  const onSubmit = async (data: TaskFormData) => {
    try {
      setIsSubmitting(true)
      
      const taskData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        reminder_date: data.reminder_date ? new Date(data.reminder_date).toISOString() : null,
        lead_id: data.lead_id || null,
      }

      if (task) {
        await updateTask.mutateAsync({
          id: task.id,
          ...taskData
        })
      } else {
        await createTask.mutateAsync(taskData)
      }

      onSuccess()
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-red-600 bg-red-50'
      case 'media': return 'text-yellow-600 bg-yellow-50'
      case 'baixa': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Título *
              </Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Ex: Ligar para cliente sobre proposta"
                className={cn(errors.title && "border-red-500")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Descrição
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Detalhes adicionais sobre a tarefa..."
                rows={3}
              />
            </div>

            {/* Tipo e Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo *</Label>
                <Select
                  value={watchedValues.task_type}
                  onValueChange={(value) => setValue('task_type', value)}
                >
                  <SelectTrigger className={cn(errors.task_type && "border-red-500")}>
                    <SelectValue placeholder="Selecione o tipo">
                      {watchedValues.task_type && (
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(watchedValues.task_type)}</span>
                          <span className="capitalize">{watchedValues.task_type.replace('_', ' ')}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes?.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(type.value)}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.task_type && (
                  <p className="text-sm text-red-500">{errors.task_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Prioridade *</Label>
                <Select
                  value={watchedValues.priority}
                  onValueChange={(value) => setValue('priority', value)}
                >
                  <SelectTrigger className={cn(errors.priority && "border-red-500")}>
                    <SelectValue placeholder="Selecione a prioridade">
                      {watchedValues.priority && (
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getPriorityColor(watchedValues.priority)
                          )}>
                            {watchedValues.priority.charAt(0).toUpperCase() + watchedValues.priority.slice(1)}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {taskPriorities?.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getPriorityColor(priority.value)
                          )}>
                            {priority.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-500">{errors.priority.message}</p>
                )}
              </div>
            </div>

            {/* Responsável e Lead */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Responsável *</Label>
                <Select
                  value={watchedValues.assigned_to}
                  onValueChange={(value) => setValue('assigned_to', value)}
                >
                  <SelectTrigger className={cn(errors.assigned_to && "border-red-500")}>
                    <SelectValue placeholder="Selecione o responsável">
                      {watchedValues.assigned_to && teamMembers && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {teamMembers.find(m => m.id === watchedValues.assigned_to)?.name || 'Usuário'}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assigned_to && (
                  <p className="text-sm text-red-500">{errors.assigned_to.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Lead Relacionado</Label>
                <Select
                  value={watchedValues.lead_id || ''}
                  onValueChange={(value) => setValue('lead_id', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead (opcional)">
                      {watchedValues.lead_id && leads && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>
                            {leads.find(l => l.id === watchedValues.lead_id)?.title || 'Lead'}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum lead</SelectItem>
                    {leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>{lead.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-medium">
                  Data de Vencimento
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="due_date"
                    type="datetime-local"
                    {...register('due_date')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_date" className="text-sm font-medium">
                  Lembrete
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="reminder_date"
                    type="datetime-local"
                    {...register('reminder_date')}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? 'Salvando...' : task ? 'Atualizar' : 'Criar Tarefa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}