import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export type WeekKey = string // e.g., '2025-45'

export interface AdSetWeekAgg {
  ad_set_id: string
  ad_set_name: string
  week: WeekKey
  spend: number
  impressions: number
  clicks: number
  leads_count: number
  cpl: number
  cpm: number
  cpc: number
  ctr: number
  link_clicks: number
  post_engagement: number
}

export interface AdSetWeeklyResult {
  weeks: WeekKey[]
  byAdSet: Record<string, AdSetWeekAgg[]>
  totalByWeek: Record<WeekKey, Omit<AdSetWeekAgg, 'ad_set_id' | 'ad_set_name'>>
  wowDelta: {
    spend?: number
    leads_count?: number
    cpl?: number
    ctr?: number
  }
}

export function useAdSetWeeklyMetrics(
  filters?: {
    accountId?: string
    campaignId?: string
    adSetIds?: string[]
    dateRange?: { start: string; end: string }
  },
  options?: { enabled?: boolean }
) {
  const { data: activeOrg } = useActiveOrganization()
  const orgId = activeOrg?.id

  return useQuery<AdSetWeeklyResult>({
    queryKey: ['adset-weekly', orgId, filters?.accountId, filters?.campaignId, filters?.adSetIds, filters?.dateRange],
    queryFn: async () => {
      if (!orgId) throw new Error('No active organization')

      // Determinar intervalo de datas (default: últimas 4 semanas)
      let startStr: string
      let endStr: string
      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        startStr = filters.dateRange.start
        endStr = filters.dateRange.end
      } else {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 28)
        startStr = start.toISOString().split('T')[0]
        endStr = end.toISOString().split('T')[0]
      }

      let query = supabase
        .from('ad_set_daily_insights')
        .select(`
          ad_set_id,
          campaign_id,
          date,
          spend,
          impressions,
          clicks,
          leads_count,
          link_clicks,
          post_engagement,
          ad_sets!inner(name,
            ad_campaigns!inner(ad_account_id,
              ad_accounts!inner(organization_id)
            )
          )
        `)
        .eq('ad_sets.ad_campaigns.ad_accounts.organization_id', orgId)
        .gte('date', startStr)
        .lte('date', endStr)
        .limit(50000)

      if (filters?.campaignId) {
        query = query.eq('campaign_id', filters.campaignId)
      } else if (filters?.accountId) {
        query = query.eq('ad_sets.ad_campaigns.ad_account_id', filters.accountId)
      }
      if (filters?.adSetIds && filters.adSetIds.length > 0) {
        query = query.in('ad_set_id', filters.adSetIds)
      }

      const { data: rows, error } = await query
      if (error) throw error

      // Utilitário para chave da semana ISO (ano-semana)
      const weekKeyOf = (d: string): WeekKey => {
        const date = new Date(d + 'T00:00:00Z')
        const target = new Date(date.valueOf())
        const dayNr = (date.getUTCDay() + 6) % 7
        target.setUTCDate(target.getUTCDate() - dayNr + 3)
        const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
        const diff = target.valueOf() - firstThursday.valueOf()
        const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000))
        return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`
      }

      const byAdSet: Record<string, AdSetWeekAgg[]> = {}
      const totalByWeek: Record<WeekKey, Omit<AdSetWeekAgg, 'ad_set_id' | 'ad_set_name'>> = {}
      const weeksSet = new Set<WeekKey>()

      for (const r of rows || []) {
        const wk = weekKeyOf(r.date as string)
        weeksSet.add(wk)
        const key = r.ad_set_id as string
        if (!byAdSet[key]) byAdSet[key] = []
        let rec = byAdSet[key].find(a => a.week === wk)
        if (!rec) {
          rec = {
            ad_set_id: key,
            ad_set_name: (r as any)?.ad_sets?.name || '—',
            week: wk,
            spend: 0,
            impressions: 0,
            clicks: 0,
            leads_count: 0,
            cpl: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
            link_clicks: 0,
            post_engagement: 0,
          }
          byAdSet[key].push(rec)
        }
        rec.spend += Number(r.spend ?? 0)
        rec.impressions += Number(r.impressions ?? 0)
        rec.clicks += Number(r.clicks ?? 0)
        rec.leads_count += Number(r.leads_count ?? 0)
        rec.link_clicks += Number(r.link_clicks ?? 0)
        rec.post_engagement += Number(r.post_engagement ?? 0)

        if (!totalByWeek[wk]) {
          totalByWeek[wk] = {
            week: wk,
            spend: 0,
            impressions: 0,
            clicks: 0,
            leads_count: 0,
            cpl: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
            link_clicks: 0,
            post_engagement: 0,
          } as any
        }
        totalByWeek[wk].spend += Number(r.spend ?? 0)
        totalByWeek[wk].impressions += Number(r.impressions ?? 0)
        totalByWeek[wk].clicks += Number(r.clicks ?? 0)
        totalByWeek[wk].leads_count += Number(r.leads_count ?? 0)
        totalByWeek[wk].link_clicks += Number(r.link_clicks ?? 0)
        totalByWeek[wk].post_engagement += Number(r.post_engagement ?? 0)
      }

      // Derivados
      const calcDerived = (agg: { spend: number; impressions: number; clicks: number; leads_count: number }) => {
        const cpl = agg.leads_count > 0 ? agg.spend / agg.leads_count : 0
        const cpm = agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0
        const cpc = agg.clicks > 0 ? agg.spend / agg.clicks : 0
        const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0
        return { cpl, cpm, cpc, ctr }
      }

      for (const key of Object.keys(byAdSet)) {
        byAdSet[key] = byAdSet[key]
          .sort((a, b) => a.week.localeCompare(b.week))
          .map(a => {
            const d = calcDerived(a)
            return { ...a, ...d }
          })
      }
      for (const wk of Object.keys(totalByWeek)) {
        const t = totalByWeek[wk]
        Object.assign(t, calcDerived(t))
      }

      // Ordenar semanas e limitar às últimas 4
      const weeks = Array.from(weeksSet).sort((a, b) => a.localeCompare(b)).slice(-4)

      // WoW delta (total)
      const wowDelta: AdSetWeeklyResult['wowDelta'] = {}
      if (weeks.length >= 2) {
        const cur = totalByWeek[weeks[weeks.length - 1]]
        const prev = totalByWeek[weeks[weeks.length - 2]]
        const pct = (c?: number, p?: number) => (p && p !== 0 ? ((Number(c ?? 0) - Number(p ?? 0)) / p) * 100 : undefined)
        wowDelta.spend = pct(cur?.spend, prev?.spend)
        wowDelta.leads_count = pct(cur?.leads_count, prev?.leads_count)
        wowDelta.cpl = prev?.cpl && prev.cpl !== 0 ? ((cur?.cpl ?? 0) - prev.cpl) / prev.cpl * 100 : undefined
        wowDelta.ctr = pct(cur?.ctr, prev?.ctr)
      }

      return { weeks, byAdSet, totalByWeek, wowDelta }
    },
    enabled: (options?.enabled ?? true) && !!orgId,
  })
}