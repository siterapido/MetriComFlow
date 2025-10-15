import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

// Type definitions
export type Lead = Tables<'leads'> & {
  lead_labels: Array<{
    labels: Tables<'labels'>
  }>
  checklist_items: Tables<'checklist_items'>[]
}

export type LeadInsert = TablesInsert<'leads'>
export type LeadUpdate = TablesUpdate<'leads'>
export type LeadActivity = Tables<'lead_activity'>

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lead_labels (
            labels (
              id,
              name,
              color
            )
          ),
          checklist_items (
            id,
            title,
            completed
          )
        `)
        .order('position')

      if (error) throw error
      return data as Lead[]
    },
    staleTime: 30000, // 30 seconds
  })
}

export const useCreateLead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (values: LeadInsert) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(values)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead criado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao criar lead:', error)
      toast.error('Erro ao criar lead')
    }
  })
}

export const useUpdateLead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LeadUpdate }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      
      const previousLeads = queryClient.getQueryData(['leads'])
      
      queryClient.setQueryData(['leads'], (old: Lead[] | undefined) => {
        if (!old) return old
        return old.map(lead => 
          lead.id === id ? { ...lead, ...values } : lead
        )
      })
      
      return { previousLeads }
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      console.error('Erro ao atualizar lead:', err)
      toast.error('Erro ao atualizar lead')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useLeadActivity(leadId?: string) {
  return useQuery<LeadActivity[]>({
    queryKey: ['lead-activity', leadId],
    queryFn: async () => {
      let query = supabase
        .from('lead_activity')
        .select('*')
        .order('created_at', { ascending: false })

      if (leadId) {
        query = query.eq('lead_id', leadId)
      }

      query = query.limit(50)

      const { data, error } = await query

      if (error) throw error
      return data as LeadActivity[]
    },
    enabled: true,
    staleTime: 30000,
  })
}
