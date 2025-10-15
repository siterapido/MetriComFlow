import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Label = Database['public']['Tables']['labels']['Row']
type LabelInsert = Database['public']['Tables']['labels']['Insert']

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Label[]
    },
    staleTime: 60000, // 1 minute
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (labelData: LabelInsert) => {
      const { data, error } = await supabase
        .from('labels')
        .insert(labelData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
    },
  })
}

export function useAddLabelToLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      const { data, error } = await supabase
        .from('lead_labels')
        .insert({
          lead_id: leadId,
          label_id: labelId,
        })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useRemoveLabelFromLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      const { error } = await supabase
        .from('lead_labels')
        .delete()
        .match({ lead_id: leadId, label_id: labelId })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
