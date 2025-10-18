import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

// ----- Novos hooks com dados reais -----

export type DashboardSummary = {
  faturamento_mensal: number
  faturamento_anual: number
  oportunidades_ativas: number
  pipeline_value: number
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const now = new Date()
      const year = now.getFullYear()
      const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      const currentMonthName = monthNames[now.getMonth()]

      // Faturamento mensal e anual a partir de revenue_records
      const { data: monthRecords, error: monthErr } = await supabase
        .from('revenue_records')
        .select('amount,month,year')
        .eq('year', year)
        .eq('month', currentMonthName)

      if (monthErr) throw monthErr

      const { data: yearRecords, error: yearErr } = await supabase
        .from('revenue_records')
        .select('amount,year')
        .eq('year', year)

      if (yearErr) throw yearErr

      const faturamento_mensal = (monthRecords || []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
      const faturamento_anual = (yearRecords || []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

      // Oportunidades e pipeline a partir de leads
      const activeStatuses = ['novo_lead','qualificacao','proposta','negociacao']
      const { data: activeLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('id,value,status')
        .in('status', activeStatuses)

      if (leadsErr) throw leadsErr

      const oportunidades_ativas = activeLeads?.length ?? 0
      const pipeline_value = (activeLeads || []).reduce((sum, l) => sum + (l.value ?? 0), 0)

      return {
        faturamento_mensal,
        faturamento_anual,
        oportunidades_ativas,
        pipeline_value,
      }
    },
    staleTime: 30000,
  })
}

export type MetaKPIs = {
  investimento_total: number
  leads_gerados: number
  cpl: number
  roas: number
}

export function useMetaKPIs() {
  return useQuery<MetaKPIs>({
    queryKey: ['meta-kpis'],
    queryFn: async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]

      // Gastos e leads do mês atual via campaign_daily_insights
      const { data: insights, error: insightsErr } = await supabase
        .from('campaign_daily_insights')
        .select('spend, leads_count, date')
        .gte('date', startStr)
        .lte('date', endStr)

      if (insightsErr) throw insightsErr

      const investimento_total = (insights || []).reduce((sum, d) => sum + (d.spend ?? 0), 0)
      const leads_gerados = (insights || []).reduce((sum, d) => sum + (d.leads_count ?? 0), 0)
      const cpl = leads_gerados > 0 ? investimento_total / leads_gerados : 0

      // ROAS agregado via view campaign_financials (fallback caso não exista dado)
      const { data: financials, error: finErr } = await supabase
        .from('campaign_financials')
        .select('total_revenue, total_spend')

      if (finErr) throw finErr

      const totals = (financials || []).reduce(
        (acc, row) => {
          return {
            revenue: acc.revenue + (row.total_revenue ?? 0),
            spend: acc.spend + (row.total_spend ?? 0),
          }
        },
        { revenue: 0, spend: 0 }
      )

      const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0

      return {
        investimento_total,
        leads_gerados,
        cpl,
        roas,
      }
    },
    staleTime: 30000,
  })
}
