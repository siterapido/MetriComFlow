import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type ClientGoal = Database['public']['Tables']['client_goals']['Row']
type ClientGoalInsert = Database['public']['Tables']['client_goals']['Insert']
type ClientGoalUpdate = Database['public']['Tables']['client_goals']['Update']

export function useClientGoals() {
  return useQuery({
    queryKey: ['client-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_goals')
        .select('*')
        .order('percentage', { ascending: false })

      if (error) throw error
      return data as ClientGoal[]
    },
    staleTime: 30000,
  })
}

export function useCreateClientGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goalData: ClientGoalInsert) => {
      const { data, error } = await supabase
        .from('client_goals')
        .insert(goalData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-goals'] })
    },
  })
}

export function useUpdateClientGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientGoalUpdate }) => {
      const { data, error } = await supabase
        .from('client_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-goals'] })
    },
  })
}
