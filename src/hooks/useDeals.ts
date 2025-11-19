import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export type Deal = Tables<'deals'>
export type DealInsert = TablesInsert<'deals'>
export type DealUpdate = TablesUpdate<'deals'>

export interface DealFilters {
  pipeline_id?: string
  stage_id?: string
  owner_id?: string
  status?: 'open' | 'won' | 'lost'
  date_range?: { start: string; end: string }
}

export function useDeals(filters?: DealFilters) {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['deals', org?.id, filters],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      let query = supabase
        .from('deals')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })

      if (filters?.pipeline_id) query = query.eq('pipeline_id', filters.pipeline_id)
      if (filters?.stage_id) query = query.eq('stage_id', filters.stage_id)
      if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)
      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.date_range) {
        query = query.gte('created_at', filters.date_range.start).lte('created_at', filters.date_range.end)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Deal[]
    },
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async (values: DealInsert) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const payload: DealInsert = { ...values, organization_id: values.organization_id ?? org.id }
      const { data, error } = await supabase.from('deals').insert(payload).select().single()
      if (error) throw error
      return data as Deal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Negócio criado!')
    },
    onError: () => toast.error('Erro ao criar negócio'),
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DealUpdate }) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', org.id)
        .select()
        .single()
      if (error) throw error
      return data as Deal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Negócio atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar negócio'),
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id)
        .eq('organization_id', org.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      toast.success('Negócio removido!')
    },
    onError: () => toast.error('Erro ao remover negócio'),
  })
}