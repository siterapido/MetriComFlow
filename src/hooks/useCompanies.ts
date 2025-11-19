import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export type Company = Tables<'companies'>
export type CompanyInsert = TablesInsert<'companies'>
export type CompanyUpdate = TablesUpdate<'companies'>

export function useCompanies() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['companies', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('organization_id', org.id)
        .order('name')
      if (error) throw error
      return data as Company[]
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async (values: CompanyInsert) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const payload: CompanyInsert = { ...values, organization_id: values.organization_id ?? org.id }
      const { data, error } = await supabase.from('companies').insert(payload).select().single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa criada com sucesso!')
    },
    onError: () => toast.error('Erro ao criar empresa'),
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CompanyUpdate }) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', org.id)
        .select()
        .single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa atualizada!')
    },
    onError: () => toast.error('Erro ao atualizar empresa'),
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('organization_id', org.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Empresa removida!')
    },
    onError: () => toast.error('Erro ao remover empresa'),
  })
}