import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useActiveOrganization } from '@/hooks/useActiveOrganization';
import { TablesUpdate } from '@/lib/database.types';
import { logDebug } from '@/lib/debug';
import { useAssignableUsers } from '@/hooks/useAssignableUsers';

export type BulkLeadUpdate = Partial<TablesUpdate<'leads'>> & {
  assignee_name?: string | null;
};

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();
  const { data: org } = useActiveOrganization();

  return useMutation({
    mutationFn: async ({ leadIds, updates }: { leadIds: string[]; updates: BulkLeadUpdate }) => {
      logDebug('[useBulkUpdateLeads] Atualizando leads em massa:', { leadIds: leadIds.length, updates });

      if (!org?.id) throw new Error('Organização ativa não definida');

      if (leadIds.length === 0) {
        throw new Error('Nenhum lead selecionado');
      }

      // Buscar assignee_name se assignee_id foi atualizado
      let assigneeName: string | null | undefined = undefined;
      if (updates.assignee_id !== undefined) {
        if (updates.assignee_id === null) {
          assigneeName = null;
        } else {
          // Buscar nome do responsável diretamente do profiles
          // Verificar se é membro ativo da organização primeiro
          const { data: membershipData } = await supabase
            .from('organization_memberships')
            .select(`
              profiles:profiles!organization_memberships_profile_id_fkey (
                id,
                full_name
              )
            `)
            .eq('organization_id', org.id)
            .eq('profile_id', updates.assignee_id)
            .eq('is_active', true)
            .maybeSingle();

          if (membershipData) {
            const profile = (membershipData as any)?.profiles;
            assigneeName = profile?.full_name || null;
          } else {
            // Se não encontrou na organização, buscar diretamente do profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', updates.assignee_id)
              .maybeSingle();
            
            assigneeName = profileData?.full_name || null;
          }
        }
      } else if (updates.assignee_name !== undefined) {
        assigneeName = updates.assignee_name;
      }

      // Sanitizar updates (remover campos undefined e validar UUIDs)
      const uuidLikeKey = (k: string) => k.endsWith('_id') || k === 'campaign_id' || k === 'assignee_id';
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (uuidLikeKey(k)) {
              if (v === null) return [k, null];
              if (typeof v === 'string') {
                const trimmed = v.trim();
                if (!trimmed) return [k, null];
                if (!uuidRegex.test(trimmed)) return [k, null];
                return [k, trimmed];
              }
            }
            return [k, v];
          })
      ) as TablesUpdate<'leads'>;

      // Se status está mudando para "fechado_ganho", adicionar closed_won_at
      if (sanitizedUpdates.status === 'fechado_ganho' && !sanitizedUpdates.closed_won_at) {
        (sanitizedUpdates as any).closed_won_at = new Date().toISOString();
      } else if (sanitizedUpdates.status && sanitizedUpdates.status !== 'fechado_ganho') {
        (sanitizedUpdates as any).closed_won_at = null;
      }

      // Adicionar assignee_name se foi calculado
      const dbUpdates: any = { ...sanitizedUpdates };
      if (assigneeName !== undefined) {
        dbUpdates.assignee_name = assigneeName;
      }

      const { data, error } = await supabase
        .from('leads')
        .update(dbUpdates)
        .in('id', leadIds)
        .eq('organization_id', org.id)
        .select('id');

      if (error) {
        console.error('[useBulkUpdateLeads] Erro ao atualizar leads:', error);
        throw error;
      }

      logDebug('[useBulkUpdateLeads] Leads atualizados com sucesso:', data?.length || 0);
      return data;
    },
    onMutate: async ({ leadIds, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      const previousLeads = queryClient.getQueryData(['leads']);

      queryClient.setQueryData(['leads'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(lead =>
          leadIds.includes(lead.id) ? { ...lead, ...updates } : lead
        );
      });

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }
      console.error('[useBulkUpdateLeads] Erro ao atualizar leads:', err);
      const anyErr = err as any;
      const message = anyErr?.message || 'Erro ao atualizar leads em massa';
      toast.error(message);
    },
    onSuccess: (data, variables) => {
      logDebug('[useBulkUpdateLeads] Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
      toast.success(`${variables.leadIds.length} lead(s) atualizado(s) com sucesso!`);
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  const { data: org } = useActiveOrganization();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      logDebug('[useBulkDeleteLeads] Movendo leads para lixeira:', leadIds.length);

      if (!org?.id) throw new Error('Organização ativa não definida');

      if (leadIds.length === 0) {
        throw new Error('Nenhum lead selecionado');
      }

      // Soft delete: atualizar deleted_at
      const { data, error } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', leadIds)
        .eq('organization_id', org.id)
        .is('deleted_at', null) // Apenas leads não deletados
        .select('id');

      if (error) {
        console.error('[useBulkDeleteLeads] Erro ao deletar leads:', error);
        throw error;
      }

      logDebug('[useBulkDeleteLeads] Leads movidos para lixeira:', data?.length || 0);
      return data;
    },
    onMutate: async (leadIds) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      const previousLeads = queryClient.getQueryData(['leads']);

      // Remover leads da lista (otimistic update)
      queryClient.setQueryData(['leads'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(lead => !leadIds.includes(lead.id));
      });

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }
      console.error('[useBulkDeleteLeads] Erro ao deletar leads:', err);
      const anyErr = err as any;
      const message = anyErr?.message || 'Erro ao mover leads para lixeira';
      toast.error(message);
    },
    onSuccess: (data, leadIds) => {
      logDebug('[useBulkDeleteLeads] Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
      toast.success(`${leadIds.length} lead(s) movido(s) para a lixeira`);
    },
  });
}

export function useRestoreLeads() {
  const queryClient = useQueryClient();
  const { data: org } = useActiveOrganization();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      logDebug('[useRestoreLeads] Restaurando leads:', leadIds.length);

      if (!org?.id) throw new Error('Organização ativa não definida');

      if (leadIds.length === 0) {
        throw new Error('Nenhum lead selecionado');
      }

      // Restaurar: limpar deleted_at
      const { data, error } = await supabase
        .from('leads')
        .update({ deleted_at: null })
        .in('id', leadIds)
        .eq('organization_id', org.id)
        .not('deleted_at', 'is', null) // Apenas leads deletados
        .select('id');

      if (error) {
        console.error('[useRestoreLeads] Erro ao restaurar leads:', error);
        throw error;
      }

      logDebug('[useRestoreLeads] Leads restaurados:', data?.length || 0);
      return data;
    },
    onError: (err) => {
      console.error('[useRestoreLeads] Erro ao restaurar leads:', err);
      const anyErr = err as any;
      const message = anyErr?.message || 'Erro ao restaurar leads';
      toast.error(message);
    },
    onSuccess: (data, leadIds) => {
      logDebug('[useRestoreLeads] Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
      toast.success(`${leadIds.length} lead(s) restaurado(s) com sucesso!`);
    },
  });
}

