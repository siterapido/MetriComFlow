import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';

type Interaction = Tables<'interactions'>;
type InteractionInsert = TablesInsert<'interactions'>;
type InteractionUpdate = TablesUpdate<'interactions'>;

// Hook para buscar interações
export function useInteractions(leadId?: string) {
  return useQuery({
    queryKey: ['interactions', leadId],
    queryFn: async () => {
      let query = supabase
        .from('interactions')
        .select(`
          *,
          created_by_profile:profiles!interactions_created_by_fkey(
            id,
            full_name,
            email
          ),
          lead:leads!interactions_lead_id_fkey(
            id,
            title
          )
        `)
        .order('interaction_date', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar interações:', error);
        throw error;
      }

      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Hook para criar interação
export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interaction: InteractionInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('interactions')
        .insert({
          ...interaction,
          created_by: user.id,
          interaction_date: interaction.interaction_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar interação:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activity'] });
      
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['interactions', data.lead_id] });
      }

      toast.success('Interação registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar interação:', error);
      toast.error('Erro ao registrar interação');
    },
  });
}

// Hook para atualizar interação
export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InteractionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('interactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar interação:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['interactions', data.lead_id] });
      }

      toast.success('Interação atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar interação:', error);
      toast.error('Erro ao atualizar interação');
    },
  });
}

// Hook para deletar interação
export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar interação:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      toast.success('Interação removida com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar interação:', error);
      toast.error('Erro ao remover interação');
    },
  });
}

// Hook para buscar tipos de interação disponíveis
export function useInteractionTypes() {
  return [
    { value: 'call', label: 'Ligação' },
    { value: 'email', label: 'E-mail' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'meeting', label: 'Reunião' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'demo', label: 'Demonstração' },
    { value: 'negotiation', label: 'Negociação' },
    { value: 'other', label: 'Outro' },
  ];
}

// Hook para buscar resultados de interação disponíveis
export function useInteractionOutcomes() {
  return [
    { value: 'positive', label: 'Positivo' },
    { value: 'neutral', label: 'Neutro' },
    { value: 'negative', label: 'Negativo' },
    { value: 'no_answer', label: 'Não atendeu' },
    { value: 'callback_requested', label: 'Solicitou retorno' },
    { value: 'interested', label: 'Interessado' },
    { value: 'not_interested', label: 'Não interessado' },
    { value: 'proposal_sent', label: 'Proposta enviada' },
    { value: 'closed_won', label: 'Fechado - Ganho' },
    { value: 'closed_lost', label: 'Fechado - Perdido' },
  ];
}