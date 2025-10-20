import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Add real-time invalidation support
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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
  const queryClient = useQueryClient()

  // Real-time: refetch summary whenever leads change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        // Use refetchQueries para forçar refetch imediato (não apenas invalidar)
        queryClient.refetchQueries({ queryKey: ['dashboard-summary'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const now = new Date()
      const year = now.getFullYear()
      const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      const currentMonthName = monthNames[now.getMonth()]

      console.log('[useDashboardSummary] Buscando dados para:', { year, currentMonthName })

      // Faturamento mensal e anual via CRM (leads fechados)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      // Adiciona 1 dia para incluir todo o último dia do mês
      monthEndDate.setDate(monthEndDate.getDate() + 1)
      const monthEnd = monthEndDate.toISOString().split('T')[0]

      const { data: closedMonth, error: closedMonthErr } = await supabase
        .from('leads')
        .select('value, closed_won_at')
        .eq('status', 'fechado_ganho')
        .gte('closed_won_at', monthStart)
        .lt('closed_won_at', monthEnd) // Usa 'lt' porque já adicionamos 1 dia ao monthEnd

      if (closedMonthErr) {
        console.error('[useDashboardSummary] Erro ao buscar fechamentos do mês:', closedMonthErr)
        throw closedMonthErr
      }

      // Para o ano, também adiciona 1 dia ao final para incluir 31 de dezembro completo
      const yearEnd = `${year + 1}-01-01` // Início do próximo ano

      const { data: closedYear, error: closedYearErr } = await supabase
        .from('leads')
        .select('value, closed_won_at')
        .eq('status', 'fechado_ganho')
        .gte('closed_won_at', `${year}-01-01`)
        .lt('closed_won_at', yearEnd) // Usa 'lt' com início do próximo ano

      if (closedYearErr) {
        console.error('[useDashboardSummary] Erro ao buscar fechamentos do ano:', closedYearErr)
        throw closedYearErr
      }

      const faturamento_mensal = (closedMonth || []).reduce((sum, r: any) => sum + (r.value ?? 0), 0)
      const faturamento_anual = (closedYear || []).reduce((sum, r: any) => sum + (r.value ?? 0), 0)

      console.log('[useDashboardSummary] Faturamento (CRM):', {
        closedMonth: closedMonth?.length || 0,
        closedYear: closedYear?.length || 0,
        faturamento_mensal,
        faturamento_anual
      })

      // Oportunidades e pipeline a partir de leads (ativos)
      // IMPORTANTE: Apenas leads nos status 'novo_lead', 'qualificacao', 'proposta', 'negociacao'
      // são considerados oportunidades ativas (excluindo fechado_ganho e fechado_perdido)
      const activeStatuses = ['novo_lead','qualificacao','proposta','negociacao']
      const { data: activeLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('id,value,status')
        .in('status', activeStatuses)

      if (leadsErr) {
        console.error('[useDashboardSummary] Erro ao buscar leads ativos:', leadsErr)
        throw leadsErr
      }

      const oportunidades_ativas = activeLeads?.length ?? 0
      const pipeline_value = (activeLeads || []).reduce((sum, l: any) => sum + (l.value ?? 0), 0)

      console.log('[useDashboardSummary] Oportunidades (CRM):', {
        activeStatuses,
        activeLeads: activeLeads?.length || 0,
        leadsList: activeLeads?.map(l => ({ id: l.id, status: l.status, value: l.value })),
        oportunidades_ativas,
        pipeline_value
      })

      const result = {
        faturamento_mensal,
        faturamento_anual,
        oportunidades_ativas,
        pipeline_value,
      }

      console.log('[useDashboardSummary] Resultado final:', result)

      return result
    },
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export type MetaKPIs = {
  investimento_total: number
  leads_gerados: number
  cpl: number
  roas: number
  has_data: boolean
}

export function useMetaKPIs(filters?: { accountId?: string; campaignId?: string; dateRange?: { start: string; end: string } }) {
  const queryClient = useQueryClient()

  // Real-time: refetch KPIs when campaign insights or leads close change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-meta-kpis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_daily_insights' }, () => {
        // Use refetchQueries para forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['meta-kpis'], type: 'active' })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.refetchQueries({ queryKey: ['meta-kpis'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<MetaKPIs>({
    queryKey: ['meta-kpis', filters?.accountId, filters?.campaignId, filters?.dateRange],
    queryFn: async () => {
      const accountId = filters?.accountId
      const campaignId = filters?.campaignId

      let startStr: string
      let endStr: string

      const dateRange = filters?.dateRange
      if (dateRange) {
        startStr = dateRange.start
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        const endDate = new Date(dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        endStr = endDate.toISOString().split('T')[0]
      } else {
        // Default: mês atual
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        startStr = start.toISOString().split('T')[0]
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        end.setDate(end.getDate() + 1)
        endStr = end.toISOString().split('T')[0]
      }

      console.log('[useMetaKPIs] Buscando dados do período (com filtros):', { startStr, endStr, accountId, campaignId })

      // Gastos e leads do período via campaign_daily_insights com filtros
      let insightsQuery = supabase
        .from('campaign_daily_insights')
        .select('spend, leads_count, date, ad_campaigns!inner(ad_account_id)')
        .gte('date', startStr)
        .lt('date', endStr) // Usa 'lt' porque já adicionamos 1 dia ao endStr

      if (campaignId) {
        insightsQuery = insightsQuery.eq('campaign_id', campaignId)
      } else if (accountId) {
        insightsQuery = insightsQuery.eq('ad_campaigns.ad_account_id', accountId)
      }

      const { data: insights, error: insightsErr } = await insightsQuery

      if (insightsErr) {
        console.error('[useMetaKPIs] Erro ao buscar insights:', insightsErr)
        // Não lançar erro, retornar zeros
      }

      console.log('[useMetaKPIs] Insights encontrados:', insights?.length || 0)

      const investimento_total = (insights || []).reduce((sum, d) => sum + (d.spend ?? 0), 0)
      const leads_gerados = (insights || []).reduce((sum, d) => sum + (d.leads_count ?? 0), 0)
      const cpl = leads_gerados > 0 ? investimento_total / leads_gerados : 0

      console.log('[useMetaKPIs] Métricas calculadas:', { investimento_total, leads_gerados, cpl })

      // Calcular ROAS baseado em TODOS os leads fechados "fechado_ganho" do período (CRM completo)
      // IMPORTANTE: Agora considera TODOS os leads fechados, não apenas os de Meta Ads
      // Isso dá uma visão mais completa do retorno sobre o investimento em Meta Ads

      // Se houver filtro de conta/campanha específica, filtra apenas leads dessa campanha
      let leadsWonQuery = supabase
        .from('leads')
        .select('value, campaign_id, source')
        .eq('status', 'fechado_ganho')
        .gte('closed_won_at', startStr)
        .lt('closed_won_at', endStr) // Usa 'lt' porque já adicionamos 1 dia ao endStr

      // Quando filtrar por campanha específica, só conta leads dessa campanha
      if (campaignId) {
        leadsWonQuery = leadsWonQuery.eq('campaign_id', campaignId)
      } else if (accountId) {
        // Se filtrar por conta, busca campanhas dessa conta
        const { data: campList, error: campErr } = await supabase
          .from('ad_campaigns')
          .select('id')
          .eq('ad_account_id', accountId)
        if (campErr) {
          console.error('[useMetaKPIs] Erro ao buscar campanhas para filtro de ROAS:', campErr)
        }
        const allowedCampaignIds = (campList || []).map(c => c.id)
        if (allowedCampaignIds.length > 0) {
          leadsWonQuery = leadsWonQuery.in('campaign_id', allowedCampaignIds)
        }
      }
      // NOTA: Não filtra por source - considera TODOS os leads fechados do período

      const { data: closedLeads, error: leadsErr } = await leadsWonQuery
      if (leadsErr) {
        console.error('[useMetaKPIs] Erro ao buscar leads fechados para ROAS:', leadsErr)
      }

      const revenue = (closedLeads || []).reduce((sum, l: any) => sum + (l.value ?? 0), 0)
      const roas = investimento_total > 0 ? revenue / investimento_total : 0

      // Separar receita por fonte para logging
      const revenueBySource = (closedLeads || []).reduce((acc, l: any) => {
        const source = l.source || 'unknown'
        acc[source] = (acc[source] || 0) + (l.value || 0)
        return acc
      }, {} as Record<string, number>)

      console.log('[useMetaKPIs] ROAS calculado (CRM completo):', {
        revenue,
        investimento_total,
        roas,
        totalLeads: closedLeads?.length || 0,
        revenueBySource
      })

      const has_data = investimento_total > 0 || leads_gerados > 0

      const result = {
        investimento_total,
        leads_gerados,
        cpl,
        roas,
        has_data,
      }

      console.log('[useMetaKPIs] Resultado final:', result)

      return result
    },
    staleTime: 0, // Sempre buscar dados frescos para tempo real
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

// ----- Pipeline Metrics (CRM Real-Time) -----

export type PipelineMetrics = {
  total_pipeline_value: number
  total_leads: number
  conversion_rate: number
  average_deal_size: number
  stages: {
    novo_lead: { count: number; value: number }
    qualificacao: { count: number; value: number }
    proposta: { count: number; value: number }
    negociacao: { count: number; value: number }
    fechado_ganho: { count: number; value: number }
    fechado_perdido: { count: number; value: number }
  }
  won_deals_value: number
  lost_deals_value: number
  active_pipeline_value: number
}

export function usePipelineMetrics(filters?: { dateRange?: { start: string; end: string } }) {
  const queryClient = useQueryClient()

  // Real-time: refetch whenever leads change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-pipeline-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        // Use refetchQueries para forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['pipeline-metrics'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<PipelineMetrics>({
    queryKey: ['pipeline-metrics', filters?.dateRange],
    queryFn: async () => {
      let startStr: string | undefined
      let endStr: string | undefined

      if (filters?.dateRange) {
        startStr = filters.dateRange.start
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        const endDate = new Date(filters.dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        endStr = endDate.toISOString().split('T')[0]
      }

      console.log('[usePipelineMetrics] Buscando métricas do pipeline:', { startStr, endStr })

      // Buscar todos os leads (ou filtrado por período se houver)
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, value, created_at, updated_at')

      if (startStr && endStr) {
        leadsQuery = leadsQuery
          .gte('created_at', startStr)
          .lt('created_at', endStr) // Usa 'lt' ao invés de 'lte' porque já adicionamos 1 dia
      }

      const { data: leads, error: leadsErr } = await leadsQuery

      if (leadsErr) {
        console.error('[usePipelineMetrics] Erro ao buscar leads:', leadsErr)
        throw leadsErr
      }

      console.log('[usePipelineMetrics] Leads encontrados:', leads?.length || 0)

      // Inicializar métricas
      const stages = {
        novo_lead: { count: 0, value: 0 },
        qualificacao: { count: 0, value: 0 },
        proposta: { count: 0, value: 0 },
        negociacao: { count: 0, value: 0 },
        fechado_ganho: { count: 0, value: 0 },
        fechado_perdido: { count: 0, value: 0 },
      }

      let total_pipeline_value = 0
      let won_deals_value = 0
      let lost_deals_value = 0
      let active_pipeline_value = 0

      // Processar leads
      leads?.forEach((lead) => {
        const value = lead.value || 0
        const status = lead.status as keyof typeof stages

        if (stages[status]) {
          stages[status].count += 1
          stages[status].value += value
        }

        total_pipeline_value += value

        if (status === 'fechado_ganho') {
          won_deals_value += value
        } else if (status === 'fechado_perdido') {
          lost_deals_value += value
        } else {
          active_pipeline_value += value
        }
      })

      const total_leads = leads?.length || 0
      const total_closed = stages.fechado_ganho.count + stages.fechado_perdido.count
      const conversion_rate = total_closed > 0
        ? (stages.fechado_ganho.count / total_closed) * 100
        : 0

      const average_deal_size = stages.fechado_ganho.count > 0
        ? won_deals_value / stages.fechado_ganho.count
        : 0

      const result: PipelineMetrics = {
        total_pipeline_value,
        total_leads,
        conversion_rate,
        average_deal_size,
        stages,
        won_deals_value,
        lost_deals_value,
        active_pipeline_value,
      }

      console.log('[usePipelineMetrics] Resultado final:', result)

      return result
    },
    staleTime: 0, // Sempre buscar dados frescos para tempo real
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

// Pipeline Evolution (evolução ao longo do tempo)
export type PipelineEvolution = {
  date: string
  novo_lead: number
  qualificacao: number
  proposta: number
  negociacao: number
  fechado_ganho: number
  total_active: number
}[]

export function usePipelineEvolution(dateRange?: { start: string; end: string }) {
  const queryClient = useQueryClient()

  // Real-time: refetch when lead activity changes
  useEffect(() => {
    const channel = supabase
      .channel('realtime-pipeline-evolution')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activity' }, () => {
        // Use refetchQueries para forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['pipeline-evolution'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<PipelineEvolution>({
    queryKey: ['pipeline-evolution', dateRange],
    queryFn: async () => {
      let startStr: string
      let endStr: string

      if (dateRange) {
        startStr = dateRange.start
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        const endDate = new Date(dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        endStr = endDate.toISOString().split('T')[0]
      } else {
        // Default: últimos 30 dias
        const now = new Date()
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        startStr = start.toISOString().split('T')[0]
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        now.setDate(now.getDate() + 1)
        endStr = now.toISOString().split('T')[0]
      }

      console.log('[usePipelineEvolution] Buscando evolução do pipeline:', { startStr, endStr })

      // Buscar histórico de atividades para rastrear mudanças de estágio
      const { data: activities, error: activitiesErr } = await supabase
        .from('lead_activity')
        .select('lead_id, action_type, from_status, to_status, created_at')
        .eq('action_type', 'moved')
        .gte('created_at', startStr)
        .lt('created_at', endStr) // Usa 'lt' porque já adicionamos 1 dia ao endStr
        .order('created_at', { ascending: true })

      if (activitiesErr) {
        console.error('[usePipelineEvolution] Erro ao buscar atividades:', activitiesErr)
        throw activitiesErr
      }

      console.log('[usePipelineEvolution] Atividades encontradas:', activities?.length || 0)

      // Agrupar por data
      const dailyMetrics: Record<string, any> = {}

      activities?.forEach((activity: any) => {
        const date = activity.created_at.split('T')[0]
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            date,
            novo_lead: 0,
            qualificacao: 0,
            proposta: 0,
            negociacao: 0,
            fechado_ganho: 0,
            total_active: 0,
          }
        }

        const newStatus = activity.to_status
        if (newStatus && newStatus !== 'fechado_perdido') {
          dailyMetrics[date][newStatus] = (dailyMetrics[date][newStatus] || 0) + 1
          if (!['fechado_ganho', 'fechado_perdido'].includes(newStatus)) {
            dailyMetrics[date].total_active += 1
          }
        }
      })

      // Converter para array e ordenar por data
      const result = Object.values(dailyMetrics).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      )

      console.log('[usePipelineEvolution] Evolução calculada:', result.length, 'dias')

      return result as PipelineEvolution
    },
    staleTime: 0, // Sempre buscar dados frescos para tempo real
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

// Combined Funnel Data (Meta Ads + CRM)
export type CombinedFunnelData = {
  // Meta Ads metrics (top of funnel)
  impressions: number
  clicks: number
  leads_meta: number
  cpl: number

  // CRM metrics (bottom of funnel)
  novo_lead: number
  qualificacao: number
  proposta: number
  negociacao: number
  fechado_ganho: number
  fechado_perdido: number

  // Values
  total_pipeline_value: number
  won_value: number
}

export function useCombinedFunnelData(filters?: {
  dateRange?: { start: string; end: string }
  accountId?: string
  campaignId?: string
}) {
  const queryClient = useQueryClient()

  // Real-time: refetch when insights or leads change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-combined-funnel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_daily_insights' }, () => {
        // Use refetchQueries para forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['combined-funnel'], type: 'active' })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.refetchQueries({ queryKey: ['combined-funnel'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<CombinedFunnelData>({
    queryKey: ['combined-funnel', filters?.dateRange, filters?.accountId, filters?.campaignId],
    queryFn: async () => {
      let startStr: string
      let endStr: string

      if (filters?.dateRange) {
        startStr = filters.dateRange.start
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        const endDate = new Date(filters.dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        endStr = endDate.toISOString().split('T')[0]
      } else {
        // Default: últimos 90 dias
        const now = new Date()
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        startStr = start.toISOString().split('T')[0]
        // Adiciona 1 dia ao endStr para incluir todo o dia final
        now.setDate(now.getDate() + 1)
        endStr = now.toISOString().split('T')[0]
      }

      console.log('[useCombinedFunnelData] Buscando dados:', { startStr, endStr, accountId: filters?.accountId, campaignId: filters?.campaignId })

      // 1. Buscar métricas do Meta Ads (top of funnel)
      let insightsQuery = supabase
        .from('campaign_daily_insights')
        .select('impressions, clicks, spend, leads_count, date, ad_campaigns!inner(ad_account_id)')
        .gte('date', startStr)
        .lt('date', endStr) // Usa 'lt' porque já adicionamos 1 dia ao endStr

      if (filters?.campaignId) {
        insightsQuery = insightsQuery.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        insightsQuery = insightsQuery.eq('ad_campaigns.ad_account_id', filters.accountId)
      }

      const { data: insights, error: insightsErr } = await insightsQuery

      if (insightsErr) {
        console.error('[useCombinedFunnelData] Erro ao buscar insights:', insightsErr)
      }

      const impressions = (insights || []).reduce((sum, d) => sum + (d.impressions ?? 0), 0)
      const clicks = (insights || []).reduce((sum, d) => sum + (d.clicks ?? 0), 0)
      const leads_meta = (insights || []).reduce((sum, d) => sum + (d.leads_count ?? 0), 0)
      const spend = (insights || []).reduce((sum, d) => sum + (d.spend ?? 0), 0)
      const cpl = leads_meta > 0 ? spend / leads_meta : 0

      console.log('[useCombinedFunnelData] Meta Ads:', { impressions, clicks, leads_meta, cpl })

      // 2. Buscar métricas do CRM (bottom of funnel)
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, value, created_at, source, campaign_id')
        .gte('created_at', startStr)
        .lt('created_at', endStr) // Usa 'lt' porque já adicionamos 1 dia ao endStr

      // Filtrar por source Meta Ads se houver filtro de conta/campanha
      if (filters?.accountId || filters?.campaignId) {
        leadsQuery = leadsQuery.eq('source', 'meta_ads')
      }

      if (filters?.campaignId) {
        leadsQuery = leadsQuery.eq('campaign_id', filters.campaignId)
      }

      const { data: leads, error: leadsErr } = await leadsQuery

      if (leadsErr) {
        console.error('[useCombinedFunnelData] Erro ao buscar leads:', leadsErr)
      }

      const stages = {
        novo_lead: 0,
        qualificacao: 0,
        proposta: 0,
        negociacao: 0,
        fechado_ganho: 0,
        fechado_perdido: 0,
      }

      let total_pipeline_value = 0
      let won_value = 0

      leads?.forEach((lead) => {
        const status = lead.status as keyof typeof stages
        if (stages[status] !== undefined) {
          stages[status] += 1
        }

        const value = lead.value || 0
        total_pipeline_value += value

        if (status === 'fechado_ganho') {
          won_value += value
        }
      })

      console.log('[useCombinedFunnelData] CRM:', stages)

      const result: CombinedFunnelData = {
        impressions,
        clicks,
        leads_meta,
        cpl,
        ...stages,
        total_pipeline_value,
        won_value,
      }

      console.log('[useCombinedFunnelData] Resultado final:', result)

      return result
    },
    staleTime: 0, // Sempre buscar dados frescos para tempo real
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}
