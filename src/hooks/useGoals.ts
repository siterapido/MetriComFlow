import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import type { Goal, GoalInsert, GoalUpdate, GoalProgress, GoalProgressInsert } from '@/types/goals'

/**
 * Fetch all goals with optional filters
 */
export function useGoals(filters?: {
  status?: 'active' | 'completed' | 'paused' | 'archived'
  period?: { start: string; end: string }
}) {
  const queryClient = useQueryClient()

  // Real-time: refetch when goals change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-goals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => {
        queryClient.refetchQueries({ queryKey: ['goals'], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<Goal[]>({
    queryKey: ['goals', filters?.status, filters?.period],
    queryFn: async () => {
      let query = supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.period) {
        query = query
          .gte('period_start', filters.period.start)
          .lte('period_end', filters.period.end)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Goal[]
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

/**
 * Fetch a single goal by ID
 */
export function useGoal(id: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-goal-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `id=eq.${id}`
      }, () => {
        queryClient.refetchQueries({ queryKey: ['goal', id], type: 'active' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, queryClient])

  return useQuery<Goal>({
    queryKey: ['goal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Goal
    },
    enabled: !!id,
    staleTime: 0,
  })
}

/**
 * Fetch goal progress history
 */
export function useGoalProgress(goalId: string) {
  return useQuery<GoalProgress[]>({
    queryKey: ['goal-progress', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_progress')
        .select('*')
        .eq('goal_id', goalId)
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return (data || []) as GoalProgress[]
    },
    enabled: !!goalId,
    staleTime: 30000,
  })
}

/**
 * Create a new goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goalData: GoalInsert) => {
      const { data: { user } } = await supabase.auth.getUser()

      const insertData = {
        ...goalData,
        created_by: user?.id || null,
      }

      const { data, error } = await supabase
        .from('goals')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data as Goal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

/**
 * Update an existing goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: GoalUpdate }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Goal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goal', data.id] })
    },
  })
}

/**
 * Delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

/**
 * Manually record goal progress
 */
export function useRecordGoalProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (progressData: GoalProgressInsert) => {
      const { data, error } = await supabase
        .from('goal_progress')
        .insert(progressData)
        .select()
        .single()

      if (error) throw error
      return data as GoalProgress
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goal-progress', variables.goal_id] })
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goal_id] })
    },
  })
}

/**
 * Calculate and update goal current_value based on goal_type
 * This function queries the appropriate data sources (CRM, Meta Ads, Revenue)
 * and updates the goal's current_value
 */
export function useCalculateGoalProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goalId: string) => {
      // 1. Fetch the goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError || !goal) throw goalError || new Error('Goal not found')

      // 2. Calculate current_value based on goal_type
      let currentValue = 0

      const periodStart = goal.period_start
      const periodEnd = new Date(goal.period_end)
      periodEnd.setDate(periodEnd.getDate() + 1) // Include the end date
      const periodEndStr = periodEnd.toISOString().split('T')[0]

      switch (goal.goal_type) {
        // ===== CRM METRICS =====
        case 'crm_revenue': {
          const { data: closedLeads } = await supabase
            .from('leads')
            .select('value')
            .eq('status', 'fechado_ganho')
            .gte('closed_won_at', periodStart)
            .lt('closed_won_at', periodEndStr)

          currentValue = (closedLeads || []).reduce((sum: number, lead: any) => sum + (lead.value || 0), 0)
          break
        }

        case 'crm_leads_generated': {
          const { data: leads } = await supabase
            .from('leads')
            .select('id')
            .gte('created_at', periodStart)
            .lt('created_at', periodEndStr)

          currentValue = leads?.length || 0
          break
        }

        case 'crm_leads_converted': {
          const { data: convertedLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('status', 'fechado_ganho')
            .gte('closed_won_at', periodStart)
            .lt('closed_won_at', periodEndStr)

          currentValue = convertedLeads?.length || 0
          break
        }

        case 'crm_conversion_rate': {
          const { data: allLeads } = await supabase
            .from('leads')
            .select('id, status')
            .in('status', ['fechado_ganho', 'fechado_perdido'])
            .gte('created_at', periodStart)
            .lt('created_at', periodEndStr)

          const total = allLeads?.length || 0
          const converted = allLeads?.filter((l: any) => l.status === 'fechado_ganho').length || 0
          currentValue = total > 0 ? (converted / total) * 100 : 0
          break
        }

        case 'crm_pipeline_value': {
          const { data: activeLeads } = await supabase
            .from('leads')
            .select('value')
            .in('status', ['novo_lead', 'qualificacao', 'proposta', 'negociacao'])

          currentValue = (activeLeads || []).reduce((sum: number, lead: any) => sum + (lead.value || 0), 0)
          break
        }

        case 'crm_avg_deal_size': {
          const { data: closedLeads } = await supabase
            .from('leads')
            .select('value')
            .eq('status', 'fechado_ganho')
            .gte('closed_won_at', periodStart)
            .lt('closed_won_at', periodEndStr)

          const total = closedLeads?.length || 0
          const sum = (closedLeads || []).reduce((s: number, lead: any) => s + (lead.value || 0), 0)
          currentValue = total > 0 ? sum / total : 0
          break
        }

        // ===== META ADS METRICS =====
        case 'meta_investment': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('spend')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('spend, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          currentValue = (insights || []).reduce((sum: number, row: any) => sum + (row.spend || 0), 0)
          break
        }

        case 'meta_leads': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('leads_count')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('leads_count, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          currentValue = (insights || []).reduce((sum: number, row: any) => sum + (row.leads_count || 0), 0)
          break
        }

        case 'meta_cpl': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('spend, leads_count')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('spend, leads_count, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          const totalSpend = (insights || []).reduce((sum: number, row: any) => sum + (row.spend || 0), 0)
          const totalLeads = (insights || []).reduce((sum: number, row: any) => sum + (row.leads_count || 0), 0)
          currentValue = totalLeads > 0 ? totalSpend / totalLeads : 0
          break
        }

        case 'meta_roas': {
          // Investment
          let insightsQuery = supabase
            .from('campaign_daily_insights')
            .select('spend')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            insightsQuery = insightsQuery.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            insightsQuery = insightsQuery.select('spend, ad_campaigns!inner(ad_account_id)')
            insightsQuery = insightsQuery.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await insightsQuery
          const investment = (insights || []).reduce((sum: number, row: any) => sum + (row.spend || 0), 0)

          // Revenue from closed leads
          let leadsQuery = supabase
            .from('leads')
            .select('value')
            .eq('status', 'fechado_ganho')
            .gte('closed_won_at', periodStart)
            .lt('closed_won_at', periodEndStr)

          if (goal.meta_campaign_id) {
            leadsQuery = leadsQuery.eq('campaign_id', goal.meta_campaign_id)
          }

          const { data: closedLeads } = await leadsQuery
          const revenue = (closedLeads || []).reduce((sum: number, lead: any) => sum + (lead.value || 0), 0)

          currentValue = investment > 0 ? revenue / investment : 0
          break
        }

        case 'meta_impressions': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('impressions')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('impressions, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          currentValue = (insights || []).reduce((sum: number, row: any) => sum + (row.impressions || 0), 0)
          break
        }

        case 'meta_clicks': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('clicks')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('clicks, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          currentValue = (insights || []).reduce((sum: number, row: any) => sum + (row.clicks || 0), 0)
          break
        }

        case 'meta_ctr': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('clicks, impressions')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('clicks, impressions, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          const totalClicks = (insights || []).reduce((sum: number, row: any) => sum + (row.clicks || 0), 0)
          const totalImpressions = (insights || []).reduce((sum: number, row: any) => sum + (row.impressions || 0), 0)
          currentValue = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
          break
        }

        case 'meta_cpc': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('spend, clicks')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('spend, clicks, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          const totalSpend = (insights || []).reduce((sum: number, row: any) => sum + (row.spend || 0), 0)
          const totalClicks = (insights || []).reduce((sum: number, row: any) => sum + (row.clicks || 0), 0)
          currentValue = totalClicks > 0 ? totalSpend / totalClicks : 0
          break
        }

        case 'meta_cpm': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('spend, impressions')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('spend, impressions, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          const totalSpend = (insights || []).reduce((sum: number, row: any) => sum + (row.spend || 0), 0)
          const totalImpressions = (insights || []).reduce((sum: number, row: any) => sum + (row.impressions || 0), 0)
          currentValue = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
          break
        }

        case 'meta_frequency': {
          let query = supabase
            .from('campaign_daily_insights')
            .select('impressions')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('impressions, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          // Frequency é geralmente calculada como impressões / alcance único
          // Como não temos alcance único no banco, vamos usar uma média simples de impressões por dia
          const totalImpressions = (insights || []).reduce((sum: number, row: any) => sum + (row.impressions || 0), 0)
          const days = insights?.length || 1
          currentValue = days > 0 ? totalImpressions / days : 0
          break
        }

        case 'meta_reach': {
          // Nota: Se você tiver o campo 'reach' na tabela campaign_daily_insights, use ele
          // Por enquanto, vamos estimar baseado nas impressões (regra de thumb: reach ~ 60-70% das impressões)
          let query = supabase
            .from('campaign_daily_insights')
            .select('impressions')
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          if (goal.meta_campaign_id) {
            query = query.eq('campaign_id', goal.meta_campaign_id)
          } else if (goal.meta_account_id) {
            query = query.select('impressions, ad_campaigns!inner(ad_account_id)')
            query = query.eq('ad_campaigns.ad_account_id', goal.meta_account_id)
          }

          const { data: insights } = await query
          const totalImpressions = (insights || []).reduce((sum: number, row: any) => sum + (row.impressions || 0), 0)
          // Estimativa: reach é aproximadamente 65% das impressões
          currentValue = totalImpressions * 0.65
          break
        }

        // ===== REVENUE METRICS =====
        case 'revenue_total': {
          const startDate = new Date(periodStart)
          const year = startDate.getFullYear()

          const { data: records } = await supabase
            .from('revenue_records')
            .select('amount')
            .eq('year', year)
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          currentValue = (records || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
          break
        }

        case 'revenue_by_category': {
          if (!goal.revenue_category) break

          const startDate = new Date(periodStart)
          const year = startDate.getFullYear()

          const { data: records } = await supabase
            .from('revenue_records')
            .select('amount')
            .eq('year', year)
            .eq('category', goal.revenue_category)
            .gte('date', periodStart)
            .lt('date', periodEndStr)

          currentValue = (records || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
          break
        }

        case 'custom':
          // Custom goals need to be updated manually
          return goal
      }

      // 3. Update the goal with the new current_value
      const { data: updatedGoal, error: updateError } = await supabase
        .from('goals')
        .update({ current_value: currentValue })
        .eq('id', goalId)
        .select()
        .single()

      if (updateError) throw updateError
      return updatedGoal as Goal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goal', data.id] })
    },
  })
}

/**
 * Bulk calculate all active goals
 */
export function useBulkCalculateGoals() {
  const calculateProgress = useCalculateGoalProgress()

  return useMutation({
    mutationFn: async () => {
      const { data: goals, error } = await supabase
        .from('goals')
        .select('id')
        .eq('status', 'active')

      if (error) throw error

      const results = []
      for (const goal of goals || []) {
        try {
          const result = await calculateProgress.mutateAsync(goal.id)
          results.push(result)
        } catch (err) {
          console.error(`Failed to calculate goal ${goal.id}:`, err)
        }
      }

      return results
    },
  })
}
