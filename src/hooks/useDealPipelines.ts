import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export type DealPipeline = Tables<'deal_pipelines'>
export type DealStage = Tables<'deal_stages'>
export type DealPipelineInsert = TablesInsert<'deal_pipelines'>
export type DealPipelineUpdate = TablesUpdate<'deal_pipelines'>
export type DealStageInsert = TablesInsert<'deal_stages'>
export type DealStageUpdate = TablesUpdate<'deal_stages'>

export function useDealPipelines() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['deal-pipelines', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('deal_pipelines')
        .select('*')
        .eq('organization_id', org.id)
        .order('name')
      if (error) throw error
      return data as DealPipeline[]
    },
  })
}

export function useDealStages(pipelineId?: string) {
  return useQuery({
    queryKey: ['deal-stages', pipelineId],
    queryFn: async () => {
      let query = supabase.from('deal_stages').select('*').order('position')
      if (pipelineId) query = query.eq('pipeline_id', pipelineId)
      const { data, error } = await query
      if (error) throw error
      return data as DealStage[]
    },
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async (values: DealPipelineInsert) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const payload: DealPipelineInsert = { ...values, organization_id: values.organization_id ?? org.id }
      const { data, error } = await supabase.from('deal_pipelines').insert(payload).select().single()
      if (error) throw error
      return data as DealPipeline
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipelines'] })
      toast.success('Pipeline criado!')
    },
    onError: () => toast.error('Erro ao criar pipeline'),
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DealPipelineUpdate }) => {
      const { data, error } = await supabase.from('deal_pipelines').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as DealPipeline
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-pipelines'] })
      toast.success('Pipeline atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar pipeline'),
  })
}

export function useCreateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: DealStageInsert) => {
      const { data, error } = await supabase.from('deal_stages').insert(values).select().single()
      if (error) throw error
      return data as DealStage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      toast.success('Estágio criado!')
    },
    onError: () => toast.error('Erro ao criar estágio'),
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DealStageUpdate }) => {
      const { data, error } = await supabase.from('deal_stages').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as DealStage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] })
      toast.success('Estágio atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar estágio'),
  })
}