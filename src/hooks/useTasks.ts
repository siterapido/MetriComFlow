import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';

type Task = Tables<'tasks'>;
type TaskInsert = TablesInsert<'tasks'>;
type TaskUpdate = TablesUpdate<'tasks'>;

// Hook para buscar tarefas
export function useTasks(filters?: {
  leadId?: string;
  assignedTo?: string;
  completed?: boolean;
  overdue?: boolean;
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_member:team_members!tasks_assigned_to_fkey(
            id,
            name,
            email
          ),
          created_by_profile:profiles!tasks_created_by_fkey(
            id,
            full_name,
            email
          ),
          lead:leads!tasks_lead_id_fkey(
            id,
            title,
            status
          )
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      // Aplicar filtros
      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar tarefas:', error);
        throw error;
      }

      // Filtrar tarefas vencidas se solicitado
      if (filters?.overdue) {
        const now = new Date();
        return data?.filter(task => 
          task.due_date && 
          new Date(task.due_date) < now && 
          !task.completed
        ) || [];
      }

      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Hook para buscar tarefas pendentes do usuário atual
export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o team_member do usuário atual
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!teamMember) {
        return [];
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          lead:leads!tasks_lead_id_fkey(
            id,
            title,
            status
          )
        `)
        .eq('assigned_to', teamMember.id)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Erro ao buscar minhas tarefas:', error);
        throw error;
      }

      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Hook para criar tarefa
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar tarefa:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['tasks', { leadId: data.lead_id }] });
      }

      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    },
  });
}

// Hook para atualizar tarefa
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      // Se a tarefa está sendo marcada como concluída, definir completed_at
      if (updates.completed === true) {
        updates.completed_at = new Date().toISOString();
      } else if (updates.completed === false) {
        updates.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar tarefa:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['tasks', { leadId: data.lead_id }] });
      }

      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    },
  });
}

// Hook para deletar tarefa
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar tarefa:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });

      toast.success('Tarefa removida com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar tarefa:', error);
      toast.error('Erro ao remover tarefa');
    },
  });
}

// Hook para buscar tipos de tarefa disponíveis
export function useTaskTypes() {
  return [
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'call', label: 'Ligação' },
    { value: 'email', label: 'Enviar E-mail' },
    { value: 'meeting', label: 'Reunião' },
    { value: 'proposal', label: 'Enviar Proposta' },
    { value: 'demo', label: 'Demonstração' },
    { value: 'contract', label: 'Contrato' },
    { value: 'reminder', label: 'Lembrete' },
    { value: 'other', label: 'Outro' },
  ];
}

// Hook para buscar prioridades de tarefa disponíveis
export function useTaskPriorities() {
  return [
    { value: 'low', label: 'Baixa', color: 'text-green-600' },
    { value: 'medium', label: 'Média', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-red-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-800' },
  ];
}

// Hook para buscar estatísticas de tarefas
export function useTaskStats(assignedTo?: string) {
  return useQuery({
    queryKey: ['task-stats', assignedTo],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('completed, due_date, priority');

      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar estatísticas de tarefas:', error);
        throw error;
      }

      const now = new Date();
      const stats = {
        total: data.length,
        completed: data.filter(task => task.completed).length,
        pending: data.filter(task => !task.completed).length,
        overdue: data.filter(task => 
          !task.completed && 
          task.due_date && 
          new Date(task.due_date) < now
        ).length,
        high_priority: data.filter(task => 
          !task.completed && 
          (task.priority === 'high' || task.priority === 'urgent')
        ).length,
      };

      return {
        ...stats,
        completion_rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      };
    },
    staleTime: 30000, // 30 segundos
  });
}