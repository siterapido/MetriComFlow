import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_kpis')
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    staleTime: 60000, // 1 minute
  })
}

export function useMonthlyRevenue(year: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: ['monthly-revenue', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_revenue')
        .select('*')
        .eq('year', year)

      if (error) throw error
      return data
    },
    staleTime: 60000,
  })
}

export function useRevenueRecords(category?: string, year?: number) {
  return useQuery({
    queryKey: ['revenue-records', category, year],
    queryFn: async () => {
      let query = supabase
        .from('revenue_records')
        .select('*')
        .order('date', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      if (year) {
        query = query.eq('year', year)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    staleTime: 60000,
  })
}
