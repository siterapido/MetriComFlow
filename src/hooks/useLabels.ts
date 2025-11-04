import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'
import type { Database } from '@/lib/database.types'

type Label = Database['public']['Tables']['labels']['Row']
type LabelInsert = Database['public']['Tables']['labels']['Insert']

/**
 * Fetch all labels for the current organization (ORGANIZATION-SCOPED)
 */
export function useLabels() {
  const { data: org } = useActiveOrganization()

  return useQuery({
    queryKey: ['labels', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')

      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('organization_id', org.id)
        .order('name')

      if (error) throw error
      return data as Label[]
    },
    enabled: !!org?.id,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Create a new label for the current organization (ORGANIZATION-SCOPED)
 */
export function useCreateLabel() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async (labelData: LabelInsert) => {
      if (!org?.id) throw new Error('Organização ativa não definida')

      const dataWithOrg = {
        ...labelData,
        organization_id: org.id,
      } as any

      const { data, error } = await supabase
        .from('labels')
        .insert(dataWithOrg)
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

/**
 * Add a label to a lead (ORGANIZATION-SCOPED)
 */
export function useAddLabelToLead() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      if (!org?.id) throw new Error('Organização ativa não definida')

      // Get lead to validate organization
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('organization_id')
        .eq('id', leadId)
        .eq('organization_id', org.id)
        .single()

      if (leadError || !lead) throw leadError || new Error('Lead not found in organization')

      const { data, error } = await supabase
        .from('lead_labels')
        .insert({
          lead_id: leadId,
          label_id: labelId,
          organization_id: org.id,
        })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

/**
 * Remove a label from a lead (ORGANIZATION-SCOPED)
 */
export function useRemoveLabelFromLead() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      if (!org?.id) throw new Error('Organização ativa não definida')

      const { error } = await supabase
        .from('lead_labels')
        .delete()
        .match({ lead_id: leadId, label_id: labelId, organization_id: org.id })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
