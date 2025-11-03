/**
 * useUnifiedMetrics - Hook para métricas unificadas do Dashboard (Sprint 2)
 *
 * Combina métricas do Meta Ads (investimento, leads) com métricas do CRM
 * (conversões, receita) para calcular ROI real, CPL real e ROAS real.
 *
 * IMPORTANTE: Este hook calcula métricas do lado do cliente enquanto
 * aguardamos aplicação da migration SQL (20251203000000_unified_dashboard_sprint2.sql).
 * Após aplicação da migration, podemos migrar para consultar as views/funções SQL.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export interface UnifiedMetrics {
  // Meta Ads (top of funnel)
  meta_spend: number
  meta_impressions: number
  meta_clicks: number
  meta_leads: number
  meta_ctr: number // CTR (%)
  meta_cpl: number | null // CPL reportado pelo Meta

  // CRM (bottom of funnel)
  crm_total_leads: number
  crm_qualificados: number
  crm_propostas: number
  crm_negociacoes: number
  crm_fechados_ganho: number
  crm_fechados_perdido: number
  crm_revenue: number
  crm_pipeline_value: number

  // Métricas Unificadas (Real ROI)
  real_cpl: number | null // Investimento Meta / Leads CRM
  real_roas: number | null // Receita CRM / Investimento Meta
  conversion_rate: number // Taxa de conversão real (ganho / total fechado)
  avg_deal_size: number // Ticket médio

  // Metadados
  has_data: boolean
}

export interface UnifiedMetricsFilters {
  dateRange?: { start: string; end: string }
  accountId?: string
  campaignId?: string
}

/**
 * Hook principal para buscar métricas unificadas
 */
export function useUnifiedMetrics(
  filters?: UnifiedMetricsFilters,
  options?: { enabled?: boolean }
) {
  const { data: activeOrg } = useActiveOrganization()

  return useQuery<UnifiedMetrics>({
    queryKey: ['unified-metrics', activeOrg?.id, filters?.dateRange, filters?.accountId, filters?.campaignId],
    queryFn: async () => {
      if (!activeOrg?.id) {
        throw new Error('No active organization')
      }

      // Determinar intervalo de datas
      let startStr: string
      let endStr: string

      if (filters?.dateRange) {
        startStr = filters.dateRange.start
        const endDate = new Date(filters.dateRange.end)
        endDate.setDate(endDate.getDate() + 1) // Incluir todo o dia final
        endStr = endDate.toISOString().split('T')[0]
      } else {
        // Default: últimos 90 dias
        const now = new Date()
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        startStr = start.toISOString().split('T')[0]
        now.setDate(now.getDate() + 1)
        endStr = now.toISOString().split('T')[0]
      }

      console.log('[useUnifiedMetrics] Fetching data:', { startStr, endStr, accountId: filters?.accountId, campaignId: filters?.campaignId })

      // 1. Buscar métricas do Meta Ads (campaign_daily_insights)
      let insightsQuery = supabase
        .from('campaign_daily_insights')
        .select('spend, impressions, clicks, leads_count, ad_campaigns!inner(ad_account_id, ad_accounts!inner(organization_id))')
        .eq('ad_campaigns.ad_accounts.organization_id', activeOrg.id)
        .gte('date', startStr)
        .lt('date', endStr)

      if (filters?.campaignId) {
        insightsQuery = insightsQuery.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        insightsQuery = insightsQuery.eq('ad_campaigns.ad_account_id', filters.accountId)
      }

      const { data: insights, error: insightsErr } = await insightsQuery

      if (insightsErr) {
        console.error('[useUnifiedMetrics] Error fetching insights:', insightsErr)
        // Não lançar erro, retornar zeros
      }

      const meta_spend = (insights || []).reduce((sum, d: any) => sum + (d.spend ?? 0), 0)
      const meta_impressions = (insights || []).reduce((sum, d: any) => sum + (d.impressions ?? 0), 0)
      const meta_clicks = (insights || []).reduce((sum, d: any) => sum + (d.clicks ?? 0), 0)
      const meta_leads = (insights || []).reduce((sum, d: any) => sum + (d.leads_count ?? 0), 0)

      const meta_ctr = meta_impressions > 0 ? (meta_clicks / meta_impressions) * 100 : 0
      const meta_cpl = meta_leads > 0 ? meta_spend / meta_leads : null

      console.log('[useUnifiedMetrics] Meta Ads aggregated:', { meta_spend, meta_impressions, meta_clicks, meta_leads, meta_ctr, meta_cpl })

      // 2. Buscar leads do CRM (todos os leads da org no período)
      let leadsQuery = supabase
        .from('leads')
        .select('status, value, campaign_id, source')
        .eq('organization_id', activeOrg.id)
        .gte('created_at', startStr)
        .lt('created_at', endStr)

      // Se houver filtro de conta/campanha, filtra apenas leads de Meta Ads dessa campanha
      if (filters?.campaignId) {
        leadsQuery = leadsQuery.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        // Buscar campanhas dessa conta
        const { data: campaigns, error: campsErr } = await supabase
          .from('ad_campaigns')
          .select('id')
          .eq('ad_account_id', filters.accountId)

        if (campsErr) {
          console.error('[useUnifiedMetrics] Error fetching campaigns for account filter:', campsErr)
        }

        const campaignIds = (campaigns || []).map((c: any) => c.id)
        if (campaignIds.length > 0) {
          leadsQuery = leadsQuery.in('campaign_id', campaignIds)
        }
      }

      const { data: leads, error: leadsErr } = await leadsQuery

      if (leadsErr) {
        console.error('[useUnifiedMetrics] Error fetching leads:', leadsErr)
      }

      // Agregar métricas do CRM
      const crm_total_leads = leads?.length || 0
      const crm_qualificados = leads?.filter((l: any) => l.status === 'qualificacao').length || 0
      const crm_propostas = leads?.filter((l: any) => l.status === 'proposta').length || 0
      const crm_negociacoes = leads?.filter((l: any) => l.status === 'negociacao').length || 0
      const crm_fechados_ganho = leads?.filter((l: any) => l.status === 'fechado_ganho').length || 0
      const crm_fechados_perdido = leads?.filter((l: any) => l.status === 'fechado_perdido').length || 0

      const crm_revenue = leads
        ?.filter((l: any) => l.status === 'fechado_ganho')
        .reduce((sum, l: any) => sum + (l.value || 0), 0) || 0

      const crm_pipeline_value = leads
        ?.filter((l: any) => !['fechado_ganho', 'fechado_perdido'].includes(l.status))
        .reduce((sum, l: any) => sum + (l.value || 0), 0) || 0

      console.log('[useUnifiedMetrics] CRM aggregated:', {
        crm_total_leads,
        crm_qualificados,
        crm_propostas,
        crm_negociacoes,
        crm_fechados_ganho,
        crm_fechados_perdido,
        crm_revenue,
        crm_pipeline_value
      })

      // 3. Calcular métricas unificadas
      const real_cpl = crm_total_leads > 0 ? meta_spend / crm_total_leads : null
      const real_roas = meta_spend > 0 ? crm_revenue / meta_spend : null

      const total_fechados = crm_fechados_ganho + crm_fechados_perdido
      const conversion_rate = total_fechados > 0 ? (crm_fechados_ganho / total_fechados) * 100 : 0

      const avg_deal_size = crm_fechados_ganho > 0 ? crm_revenue / crm_fechados_ganho : 0

      const has_data = meta_spend > 0 || crm_total_leads > 0

      const result: UnifiedMetrics = {
        meta_spend,
        meta_impressions,
        meta_clicks,
        meta_leads,
        meta_ctr,
        meta_cpl,
        crm_total_leads,
        crm_qualificados,
        crm_propostas,
        crm_negociacoes,
        crm_fechados_ganho,
        crm_fechados_perdido,
        crm_revenue,
        crm_pipeline_value,
        real_cpl,
        real_roas,
        conversion_rate,
        avg_deal_size,
        has_data,
      }

      console.log('[useUnifiedMetrics] Final result:', result)

      return result
    },
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: (options?.enabled ?? true) && !!activeOrg?.id,
  })
}

/**
 * Hook para buscar breakdown diário de métricas unificadas
 * Útil para gráficos de evolução temporal
 */
export interface UnifiedDailyBreakdown {
  date: string
  spend: number
  impressions: number
  clicks: number
  meta_leads: number
  crm_leads_created: number
  crm_leads_qualified: number
  crm_leads_closed_won: number
  revenue: number
  ctr: number
  cpl: number | null
  roas: number | null
}

export function useUnifiedDailyBreakdown(
  filters?: UnifiedMetricsFilters,
  options?: { enabled?: boolean }
) {
  const { data: activeOrg } = useActiveOrganization()

  return useQuery<UnifiedDailyBreakdown[]>({
    queryKey: ['unified-daily-breakdown', activeOrg?.id, filters?.dateRange, filters?.accountId, filters?.campaignId],
    queryFn: async () => {
      if (!activeOrg?.id) {
        throw new Error('No active organization')
      }

      // Determinar intervalo de datas
      let startStr: string
      let endStr: string

      if (filters?.dateRange) {
        startStr = filters.dateRange.start
        const endDate = new Date(filters.dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        endStr = endDate.toISOString().split('T')[0]
      } else {
        // Default: últimos 30 dias
        const now = new Date()
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        startStr = start.toISOString().split('T')[0]
        now.setDate(now.getDate() + 1)
        endStr = now.toISOString().split('T')[0]
      }

      console.log('[useUnifiedDailyBreakdown] Fetching daily data:', { startStr, endStr })

      // 1. Buscar insights diários do Meta
      let insightsQuery = supabase
        .from('campaign_daily_insights')
        .select('date, spend, impressions, clicks, leads_count, ad_campaigns!inner(ad_account_id, ad_accounts!inner(organization_id))')
        .eq('ad_campaigns.ad_accounts.organization_id', activeOrg.id)
        .gte('date', startStr)
        .lt('date', endStr)
        .order('date', { ascending: true })

      if (filters?.campaignId) {
        insightsQuery = insightsQuery.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        insightsQuery = insightsQuery.eq('ad_campaigns.ad_account_id', filters.accountId)
      }

      const { data: insights, error: insightsErr } = await insightsQuery

      if (insightsErr) {
        console.error('[useUnifiedDailyBreakdown] Error fetching insights:', insightsErr)
      }

      // 2. Buscar leads diários do CRM
      let leadsQuery = supabase
        .from('leads')
        .select('created_at, status, value, campaign_id')
        .eq('organization_id', activeOrg.id)
        .gte('created_at', startStr)
        .lt('created_at', endStr)

      if (filters?.campaignId) {
        leadsQuery = leadsQuery.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        const { data: campaigns } = await supabase
          .from('ad_campaigns')
          .select('id')
          .eq('ad_account_id', filters.accountId)

        const campaignIds = (campaigns || []).map((c: any) => c.id)
        if (campaignIds.length > 0) {
          leadsQuery = leadsQuery.in('campaign_id', campaignIds)
        }
      }

      const { data: leads, error: leadsErr } = await leadsQuery

      if (leadsErr) {
        console.error('[useUnifiedDailyBreakdown] Error fetching leads:', leadsErr)
      }

      // 3. Agrupar por data
      const dailyMap: Record<string, UnifiedDailyBreakdown> = {}

      // Processar insights
      insights?.forEach((insight: any) => {
        const date = insight.date
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            spend: 0,
            impressions: 0,
            clicks: 0,
            meta_leads: 0,
            crm_leads_created: 0,
            crm_leads_qualified: 0,
            crm_leads_closed_won: 0,
            revenue: 0,
            ctr: 0,
            cpl: null,
            roas: null,
          }
        }

        dailyMap[date].spend += insight.spend || 0
        dailyMap[date].impressions += insight.impressions || 0
        dailyMap[date].clicks += insight.clicks || 0
        dailyMap[date].meta_leads += insight.leads_count || 0
      })

      // Processar leads
      leads?.forEach((lead: any) => {
        const date = lead.created_at.split('T')[0]
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            spend: 0,
            impressions: 0,
            clicks: 0,
            meta_leads: 0,
            crm_leads_created: 0,
            crm_leads_qualified: 0,
            crm_leads_closed_won: 0,
            revenue: 0,
            ctr: 0,
            cpl: null,
            roas: null,
          }
        }

        dailyMap[date].crm_leads_created += 1
        if (lead.status === 'qualificacao') {
          dailyMap[date].crm_leads_qualified += 1
        }
        if (lead.status === 'fechado_ganho') {
          dailyMap[date].crm_leads_closed_won += 1
          dailyMap[date].revenue += lead.value || 0
        }
      })

      // 4. Calcular métricas derivadas e ordenar
      const result = Object.values(dailyMap)
        .map((day) => ({
          ...day,
          ctr: day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0,
          cpl: day.crm_leads_created > 0 ? day.spend / day.crm_leads_created : null,
          roas: day.spend > 0 ? day.revenue / day.spend : null,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      console.log('[useUnifiedDailyBreakdown] Daily breakdown calculated:', result.length, 'days')

      return result
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: (options?.enabled ?? true) && !!activeOrg?.id,
  })
}
