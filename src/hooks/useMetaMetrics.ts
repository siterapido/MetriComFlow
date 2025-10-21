import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

// Type definitions
type AdAccount = Database['public']['Tables']['ad_accounts']['Row']
type AdCampaign = Database['public']['Tables']['ad_campaigns']['Row']
type CampaignInsight = Database['public']['Tables']['campaign_daily_insights']['Row']

export interface BusinessKPIs {
  investimento_total: number
  leads_gerados: number
  clientes_fechados: number
  faturamento_realizado: number
  faturamento_previsto: number
  leads_ativos: number
  cpl: number | null
  roas: number | null
  taxa_conversao: number
}

export interface CampaignFinancials {
  campaign_id: string
  campaign_name: string
  campaign_status: string | null
  campaign_objective: string | null
  account_name: string | null
  investimento: number
  impressions: number
  clicks: number
  leads_gerados: number
  vendas_fechadas: number
  vendas_perdidas: number
  em_negociacao: number
  faturamento: number
  pipeline_value: number
  cpl: number | null
  roas: number | null
  ctr: number
  taxa_conversao: number
}

/**
 * Fetch all connected ad accounts
 */
export function useAdAccounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['ad-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as AdAccount[]
    },
    staleTime: 60000, // 1 minute
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch campaigns for a specific ad account
 * @param accountId - Ad account ID (optional, fetches all if not provided)
 */
export function useAdCampaigns(accountId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['ad-campaigns', accountId],
    queryFn: async () => {
      let query = supabase
        .from('ad_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (accountId) {
        query = query.eq('ad_account_id', accountId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AdCampaign[]
    },
    staleTime: 60000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch daily insights for a specific campaign
 * @param campaignId - Campaign ID
 * @param dateRange - Optional date range filter
 */
export function useCampaignInsights(
  campaignId: string,
  dateRange?: { start: string; end: string }
) {
  return useQuery({
    queryKey: ['campaign-insights', campaignId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('campaign_daily_insights')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: false })

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data as CampaignInsight[]
    },
    staleTime: 30000,
    enabled: !!campaignId,
  })
}

/**
 * Fetch all campaign insights (for aggregated views)
 * @param dateRange - Optional date range filter
 */
export function useAllCampaignInsights(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['all-campaign-insights', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('campaign_daily_insights')
        .select('*')
        .order('date', { ascending: false })

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error
      return data as CampaignInsight[]
    },
    staleTime: 30000,
  })
}

/**
 * Fetch business KPIs from view
 */
export function useBusinessKPIs() {
  return useQuery({
    queryKey: ['business-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_kpis')
        .select('*')
        .single()

      if (error) throw error
      return data as unknown as BusinessKPIs
    },
    staleTime: 30000,
  })
}

/**
 * Fetch campaign financials from view
 * @param campaignId - Optional campaign ID filter
 */
export function useCampaignFinancials(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-financials', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('campaign_financials')
        .select('*')

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as unknown as CampaignFinancials[]
    },
    staleTime: 30000,
  })
}

/**
 * Fetch insights grouped by date for charting
 * @param dateRange - Date range filter
 */
export function useInsightsByDate(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['insights-by-date', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('campaign_daily_insights')
        .select('date, spend, impressions, clicks, leads_count')
        .order('date', { ascending: true })

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error

      // Group by date and sum metrics
      const grouped = data.reduce((acc, insight) => {
        const date = insight.date
        if (!acc[date]) {
          acc[date] = {
            date,
            spend: 0,
            impressions: 0,
            clicks: 0,
            leads_count: 0,
          }
        }
        acc[date].spend += insight.spend || 0
        acc[date].impressions += insight.impressions || 0
        acc[date].clicks += insight.clicks || 0
        acc[date].leads_count += insight.leads_count || 0
        return acc
      }, {} as Record<string, any>)

      return Object.values(grouped).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      )
    },
    staleTime: 30000,
  })
}

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Get current month date range
 */
export function getCurrentMonthDateRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Get last N days date range
 */
export function getLastNDaysDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

/**
 * Fetch insights with advanced filtering (account + campaign + date range)
 * @param filters - Combined filters for account, campaign, and date range
 */
export function useFilteredInsights(filters?: {
  accountId?: string
  campaignId?: string
  dateRange?: { start: string; end: string }
}, options?: { enabled?: boolean }) {
  const { accountId, campaignId, dateRange } = filters || {}

  return useQuery({
    queryKey: ['filtered-insights', accountId, campaignId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('campaign_daily_insights')
        .select(`
          *,
          ad_campaigns!inner(
            id,
            name,
            status,
            objective,
            ad_account_id,
            ad_accounts!inner(id, business_name, is_active)
          )
        `)
        .eq('ad_campaigns.ad_accounts.is_active', true)
        .order('date', { ascending: true })

      // Apply campaign filter
      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      // Apply account filter (only if no campaign filter)
      if (accountId && !campaignId) {
        query = query.eq('ad_campaigns.ad_account_id', accountId)
      }

      // Apply date range filter
      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform and aggregate by date
      const dailyData = data.reduce((acc, row) => {
        const date = row.date
        if (!acc[date]) {
          acc[date] = {
            date,
            spend: 0,
            impressions: 0,
            clicks: 0,
            leads_count: 0,
          }
        }
        acc[date].spend += row.spend || 0
        acc[date].impressions += row.impressions || 0
        acc[date].clicks += row.clicks || 0
        acc[date].leads_count += row.leads_count || 0
        return acc
      }, {} as Record<string, any>)

      const sortedData = Object.values(dailyData).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      )

      // Calculate derived metrics
      return sortedData.map((day: any) => ({
        ...day,
        ctr: day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0,
        cpc: day.clicks > 0 ? day.spend / day.clicks : 0,
        cpl: day.leads_count > 0 ? day.spend / day.leads_count : 0,
      }))
    },
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch aggregated metrics summary with period comparison
 */
export function useMetricsSummary(filters?: {
  accountId?: string
  campaignId?: string
  dateRange?: { start: string; end: string }
}, options?: { enabled?: boolean }) {
  const { accountId, campaignId, dateRange } = filters || {}
  const range = dateRange || getLastNDaysDateRange(30)

  return useQuery({
    queryKey: ['metrics-summary', accountId, campaignId, range],
    queryFn: async () => {
      // Current period query
      let currentQuery = supabase
        .from('campaign_daily_insights')
        .select(`
          *,
          ad_campaigns!inner(
            ad_account_id,
            ad_accounts!inner(is_active)
          )
        `)
        .gte('date', range.start)
        .lte('date', range.end)
        .eq('ad_campaigns.ad_accounts.is_active', true)

      if (campaignId) {
        currentQuery = currentQuery.eq('campaign_id', campaignId)
      } else if (accountId) {
        currentQuery = currentQuery.eq('ad_campaigns.ad_account_id', accountId)
      }

      const { data: currentData, error: currentError } = await currentQuery

      if (currentError) throw currentError

      // Calculate current period totals
      const current = (currentData || []).reduce(
        (acc, row) => ({
          spend: acc.spend + (row.spend || 0),
          impressions: acc.impressions + (row.impressions || 0),
          clicks: acc.clicks + (row.clicks || 0),
          leads: acc.leads + (row.leads_count || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, leads: 0 }
      )

      // Calculate previous period (same duration)
      const startDate = new Date(range.start)
      const endDate = new Date(range.end)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      const prevEndDate = new Date(startDate)
      prevEndDate.setDate(prevEndDate.getDate() - 1)
      const prevStartDate = new Date(prevEndDate)
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff)

      let prevQuery = supabase
        .from('campaign_daily_insights')
        .select(`
          *,
          ad_campaigns!inner(
            ad_account_id,
            ad_accounts!inner(is_active)
          )
        `)
        .gte('date', prevStartDate.toISOString().split('T')[0])
        .lte('date', prevEndDate.toISOString().split('T')[0])
        .eq('ad_campaigns.ad_accounts.is_active', true)

      if (campaignId) {
        prevQuery = prevQuery.eq('campaign_id', campaignId)
      } else if (accountId) {
        prevQuery = prevQuery.eq('ad_campaigns.ad_account_id', accountId)
      }

      const { data: prevData } = await prevQuery

      const previous = (prevData || []).reduce(
        (acc, row) => ({
          spend: acc.spend + (row.spend || 0),
          leads: acc.leads + (row.leads_count || 0),
        }),
        { spend: 0, leads: 0 }
      )

      // Calculate metrics and changes
      const currentCPL = current.leads > 0 ? current.spend / current.leads : 0
      const prevCPL = previous.leads > 0 ? previous.spend / previous.leads : 0

      return {
        current: {
          spend: current.spend,
          impressions: current.impressions,
          clicks: current.clicks,
          leads: current.leads,
          ctr: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0,
          cpc: current.clicks > 0 ? current.spend / current.clicks : 0,
          cpl: currentCPL,
        },
        previous: {
          spend: previous.spend,
          leads: previous.leads,
          cpl: prevCPL,
        },
        changes: {
          spend: previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend) * 100 : 0,
          leads: previous.leads > 0 ? ((current.leads - previous.leads) / previous.leads) * 100 : 0,
          cpl: prevCPL > 0 ? ((currentCPL - prevCPL) / prevCPL) * 100 : 0,
        },
      }
    },
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  })
}

// NEW: Fetch campaign financials aligned to filters and date range
export function useCampaignFinancialsFiltered(filters?: {
  accountId?: string
  campaignId?: string
  dateRange?: { start: string; end: string }
}, options?: { enabled?: boolean }) {
  const { accountId, campaignId, dateRange } = filters || {}
  const range = dateRange || getLastNDaysDateRange(90)

  return useQuery({
    queryKey: ['campaign-financials-filtered', accountId, campaignId, range],
    queryFn: async () => {
      // 1) Fetch campaigns matching filters (ensures zero rows are represented)
      let campaignsQuery = supabase
        .from('ad_campaigns')
        .select('id, name, status, objective, ad_account_id, ad_accounts!inner(business_name, is_active)')
        .eq('ad_accounts.is_active', true)
        .order('created_at', { ascending: false })

      if (accountId) {
        campaignsQuery = campaignsQuery.eq('ad_account_id', accountId)
      }
      if (campaignId) {
        campaignsQuery = campaignsQuery.eq('id', campaignId)
      }

      const { data: campaigns, error: campaignsError } = await campaignsQuery
      if (campaignsError) throw campaignsError

      const campaignIds = (campaigns || []).map((c: any) => c.id)
      if (campaignIds.length === 0) {
        return [] as CampaignFinancials[]
      }

      // 2) Fetch daily insights within date range for these campaigns
      let insightsQuery = supabase
        .from('campaign_daily_insights')
        .select('campaign_id, date, spend, impressions, clicks, leads_count')
        .gte('date', range.start)
        .lte('date', range.end)
        .in('campaign_id', campaignIds)

      const { data: insights, error: insightsError } = await insightsQuery
      if (insightsError) throw insightsError

      // 3) Fetch leads segmented for metrics within date range
      // 3a) Closed won (faturamento, vendas_fechadas)
      let wonQuery = supabase
        .from('leads')
        .select('campaign_id, value')
        .eq('status', 'fechado_ganho')
        .eq('source', 'meta_ads')
        .in('campaign_id', campaignIds)
        .gte('closed_won_at', range.start)
        .lte('closed_won_at', range.end)
      const { data: wonLeads, error: wonError } = await wonQuery
      if (wonError) throw wonError

      // 3b) Closed lost (vendas_perdidas)
      let lostQuery = supabase
        .from('leads')
        .select('campaign_id')
        .eq('status', 'fechado_perdido')
        .eq('source', 'meta_ads')
        .in('campaign_id', campaignIds)
        .gte('closed_lost_at', range.start)
        .lte('closed_lost_at', range.end)
      const { data: lostLeads, error: lostError } = await lostQuery
      if (lostError) throw lostError

      // 3c) In negotiation/proposal (em_negociacao, pipeline_value)
      let pipelineQuery = supabase
        .from('leads')
        .select('campaign_id, value')
        .in('status', ['negociacao', 'proposta'])
        .eq('source', 'meta_ads')
        .in('campaign_id', campaignIds)
        .gte('updated_at', range.start)
        .lte('updated_at', range.end)
      const { data: pipelineLeads, error: pipelineError } = await pipelineQuery
      if (pipelineError) throw pipelineError

      // 4) Build totals per campaign
      const totals: Record<string, CampaignFinancials> = {}

      for (const c of campaigns || []) {
        totals[c.id] = {
          campaign_id: c.id,
          campaign_name: c.name,
          campaign_status: c.status || null,
          campaign_objective: c.objective || null,
          account_name: c.ad_accounts?.business_name || null,
          investimento: 0,
          impressions: 0,
          clicks: 0,
          leads_gerados: 0,
          vendas_fechadas: 0,
          vendas_perdidas: 0,
          em_negociacao: 0,
          faturamento: 0,
          pipeline_value: 0,
          cpl: null,
          roas: null,
          ctr: 0,
          taxa_conversao: 0,
        }
      }

      for (const row of insights || []) {
        const t = totals[row.campaign_id]
        if (!t) continue
        t.investimento += row.spend || 0
        t.impressions += row.impressions || 0
        t.clicks += row.clicks || 0
        t.leads_gerados += row.leads_count || 0
      }

      for (const row of wonLeads || []) {
        const t = totals[row.campaign_id]
        if (!t) continue
        t.vendas_fechadas += 1
        t.faturamento += row.value || 0
      }

      for (const row of lostLeads || []) {
        const t = totals[row.campaign_id]
        if (!t) continue
        t.vendas_perdidas += 1
      }

      for (const row of pipelineLeads || []) {
        const t = totals[row.campaign_id]
        if (!t) continue
        t.em_negociacao += 1
        t.pipeline_value += row.value || 0
      }

      // Derived metrics
      const result = Object.values(totals).map((t) => {
        const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0
        const cpl = t.leads_gerados > 0 ? t.investimento / t.leads_gerados : null
        const roas = t.investimento > 0 ? t.faturamento / t.investimento : null
        const taxa_conversao = t.leads_gerados > 0 ? (t.vendas_fechadas / t.leads_gerados) * 100 : 0
        return { ...t, ctr, cpl, roas, taxa_conversao }
      })

      // Sort by investment desc to match original view behaviour
      return result.sort((a, b) => b.investimento - a.investimento)
    },
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  })
}
