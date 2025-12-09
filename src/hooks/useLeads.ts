import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useEffect } from 'react'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'
import { logDebug } from '@/lib/debug'

// Type definitions
export type Lead = Tables<'leads'> & {
  lead_labels?: Array<{
    labels: Tables<'labels'>
  }>
  checklist_items?: Tables<'checklist_items'>[]
  comments?: Tables<'comments'>[]
  interactions?: Tables<'interactions'>[]
  tasks?: Tables<'tasks'>[]
  ad_campaigns?: {
    name: string
    external_id: string
  } | null
}

export type LeadWithLabels = Lead

export type LeadInsert = TablesInsert<'leads'>
export type LeadUpdate = TablesUpdate<'leads'>
export type LeadActivity = Tables<'lead_activity'>
export type Comment = Tables<'comments'>

export interface LeadImportPayload {
  title: string
  description?: string | null
  status?: string | null
  value?: number | null
  contract_value?: number | null
  contract_months?: number | null
  contract_type?: 'monthly' | 'annual' | 'one_time' | null
  due_date?: string | null
  expected_close_date?: string | null
  last_contact_date?: string | null
  next_follow_up_date?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null
  lead_score?: number | null
  conversion_probability?: number | null
  product_interest?: string | null
  lead_source_detail?: string | null
  source?: string | null
  campaign_id?: string | null
  external_lead_id?: string | null
  ad_id?: string | null
  adset_id?: string | null
  closed_won_at?: string | null
  closed_lost_at?: string | null
  lost_reason?: string | null
  organization_id?: string | null
  custom_fields?: Record<string, unknown> | null
}

// Novos tipos para CRM
export type LeadStatus = 'novo_lead' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido' | 'follow_up' | 'aguardando_resposta'
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent'
export type LeadSource = 'meta_ads' | 'google_ads' | 'whatsapp' | 'indicacao' | 'site' | 'telefone' | 'email' | 'evento' | 'manual'

// Filtros para leads
export interface LeadFilters {
  source?: LeadSource
  status?: LeadStatus
  priority?: LeadPriority
  assignee_id?: string
  product_interest?: string
  lead_source_detail?: string
  campaign_id?: string
  account_id?: string // ID da conta Meta Ads para filtrar leads por conta
  date_range?: {
    start: string
    end: string
  }
  custom_fields?: {
    Cidade?: string[]
    Estado?: string[]
    Porte?: string[]
    "Nome Fantasia"?: string
  }
}

export function useLeads(filters?: LeadFilters, campaignId?: string) {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  // Real-time: invalidar consultas de leads ao ocorrerem mudanças
  useEffect(() => {
    const channel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['leads', org?.id, filters, campaignId],
    queryFn: async () => {
      logDebug('[useLeads] 🔍 Iniciando busca de leads...')
      logDebug('[useLeads] Filtros:', { filters, campaignId })

      // Verificar autenticação antes de fazer a query
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[useLeads] ❌ Erro ao verificar sessão:', sessionError)
        throw new Error('Erro ao verificar autenticação: ' + sessionError.message)
      }

      if (!session) {
        console.error('[useLeads] ❌ Usuário não autenticado! As políticas RLS bloqueiam acesso sem autenticação.')
        throw new Error('Você precisa estar autenticado para visualizar os leads. Por favor, faça login novamente.')
      }

      logDebug('[useLeads] ✅ Usuário autenticado:', session.user.email)
      logDebug('[useLeads] Token expira em:', new Date(session.expires_at! * 1000).toLocaleString())

      if (!org?.id) {
        throw new Error('Organização ativa não definida. Selecione uma para continuar.')
      }

      let query = supabase
        .from('leads')
        .select(`
          *,
          lead_labels (
            labels (
              id,
              name,
              color
            )
          ),
          checklist_items (
            id,
            title,
            completed
          ),
          comments (
            id,
            content,
            user_name,
            created_at
          ),
          interactions (
            id,
            interaction_type,
            outcome,
            content,
            interaction_date,
            user_id,
            profiles!interactions_user_id_fkey (
              full_name
            )
          ),
          tasks (
            id,
            title,
            description,
            task_type,
            priority,
            due_date,
            status,
            assigned_to,
            profiles!tasks_assigned_to_fkey (
              full_name
            )
          ),
          ad_campaigns (
            name,
            external_id
          )
        `)
        .eq('organization_id', org.id)
        .is('deleted_at', null) // Filtrar leads deletados (soft delete)
        .order('position')

      // Aplicar filtros
      if (filters?.source) {
        query = query.eq('source', filters.source)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id)
      }

      if (filters?.product_interest) {
        query = query.eq('product_interest', filters.product_interest)
      }

      if (filters?.lead_source_detail) {
        query = query.eq('lead_source_detail', filters.lead_source_detail)
      }

      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id)
      }

      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end)
      }

      // Nota: Filtros de custom_fields e account_id serão aplicados no cliente após buscar os dados
      // devido a limitações do Supabase com filtros OR em campos JSONB aninhados e necessidade
      // de buscar campanhas relacionadas à conta

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data, error } = await query

      if (error) {
        console.error('[useLeads] ❌ Erro ao buscar leads:', error)
        console.error('[useLeads] Código:', error.code)
        console.error('[useLeads] Mensagem:', error.message)
        console.error('[useLeads] Detalhes:', error.details)

        if (error.code === 'PGRST301') {
          throw new Error('Acesso negado. Verifique se você está autenticado.')
        }

        throw error
      }

      // Aplicar filtros de custom_fields no cliente
      let filteredData = data || [];
      if (filters?.custom_fields && filteredData.length > 0) {
        const cf = filters.custom_fields;
        
        filteredData = filteredData.filter((lead) => {
          const customFields = lead.custom_fields as Record<string, any> | null;
          if (!customFields) return false;
          
          // Filtro por Cidade
          if (cf.Cidade && cf.Cidade.length > 0) {
            const cidade = customFields.Cidade;
            if (!cidade || !cf.Cidade.includes(cidade)) return false;
          }
          
          // Filtro por Estado
          if (cf.Estado && cf.Estado.length > 0) {
            const estado = customFields.Estado;
            if (!estado || !cf.Estado.includes(estado)) return false;
          }
          
          // Filtro por Porte
          if (cf.Porte && cf.Porte.length > 0) {
            const porte = customFields.Porte;
            if (!porte || !cf.Porte.includes(porte)) return false;
          }
          
          // Filtro por Nome Fantasia (busca por texto - case insensitive)
          if (cf["Nome Fantasia"]) {
            const nomeFantasia = customFields["Nome Fantasia"];
            if (!nomeFantasia || 
                !String(nomeFantasia).toLowerCase().includes(cf["Nome Fantasia"].toLowerCase())) {
              return false;
            }
          }
          
          return true;
        });
      }

      logDebug('[useLeads] ✅ Leads encontrados:', filteredData?.length || 0)
      logDebug('[useLeads] Agrupados por status:', filteredData?.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {} as Record<string, number>))

      if (filteredData && filteredData.length > 0) {
        logDebug('[useLeads] Primeiros 3 leads:', filteredData.slice(0, 3).map(l => ({
          id: l.id,
          title: l.title,
          status: l.status,
          source: l.source,
          priority: l.priority,
          product_interest: l.product_interest,
          lead_score: l.lead_score,
          interactions_count: l.interactions?.length || 0,
          tasks_count: l.tasks?.length || 0,
          comments_count: l.comments_count,
          attachments_count: l.attachments_count
        })))
      }

      return filteredData as Lead[]
    },
    staleTime: 0, // sempre fresco para refletir mudanças imediatas
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export const useCreateLead = () => {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async (values: LeadInsert) => {
      logDebug('[useCreateLead] Criando lead:', values)

      const uuidLikeKey = (k: string) => k.endsWith('_id') || k === 'campaign_id' || k === 'assignee_id'
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

      const sanitizedValues = Object.fromEntries(
        Object.entries(values)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (uuidLikeKey(k)) {
              if (v === null) return [k, null]
              if (typeof v === 'string') {
                const trimmed = v.trim()
                if (!trimmed) return [k, null]
                if (!uuidRegex.test(trimmed)) return [k, null]
                return [k, trimmed]
              }
            }
            return [k, v]
          })
      ) as LeadInsert

      logDebug('[useCreateLead] Payload sanitizado:', sanitizedValues)

      if (!org?.id) throw new Error('Organização ativa não definida')

      // Garantir escopo da organização
      const withOrg: LeadInsert = {
        ...sanitizedValues,
        organization_id: (sanitizedValues as any).organization_id ?? (org.id as any),
      }

      const { data, error } = await supabase
        .from('leads')
        .insert(withOrg)
        .select()
        .single()

      if (error) {
        console.error('[useCreateLead] Erro ao criar lead:', error)
        throw error
      }

      logDebug('[useCreateLead] Lead criado com sucesso:', data)
      return data
    },
    onSuccess: () => {
      logDebug('[useCreateLead] Invalidando queries de leads')

      // Invalidar TODAS as queries de leads (com e sem filtros)
      queryClient.invalidateQueries({ queryKey: ['leads'] })

      // Invalidar queries do dashboard também
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] })

      toast.success('Lead criado com sucesso!')
    },
    onError: (error) => {
      console.error('[useCreateLead] Erro ao criar lead:', error)
      toast.error('Erro ao criar lead')
    }
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async (rows: LeadImportPayload[]) => {
      if (!org?.id) {
        throw new Error("Organização ativa não definida")
      }

      const payload = rows.map((row) => ({
        ...row,
        organization_id: row.organization_id ?? org.id,
      }))

      const { data, error } = await supabase
        .from("leads")
        .insert(payload as TablesInsert<"leads">[])
        .select("id")

      if (error) {
        console.error("[useImportLeads] Erro ao inserir leads:", error)
        throw error
      }

      return data ?? []
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] })
      queryClient.invalidateQueries({ queryKey: ["meta-kpis"] })
      queryClient.invalidateQueries({ queryKey: ["combined-funnel"] })
      queryClient.invalidateQueries({ queryKey: ["pipeline-evolution"] })

      toast.success(`${data.length} leads importados com sucesso!`)
    },
    onError: (error) => {
      toast.error("Erro ao importar os leads")
      console.error("[useImportLeads] Erro ao importar leads:", error)
    },
  })
}

export const useUpdateLead = () => {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LeadUpdate }) => {
      logDebug('[useUpdateLead] Atualizando lead:', { id, updates })

      // Se o status está mudando para "fechado_ganho", adicionar closed_won_at automaticamente
      const finalUpdates = { ...updates }

      if (updates.status === 'fechado_ganho' && !updates.closed_won_at) {
        finalUpdates.closed_won_at = new Date().toISOString()
        logDebug('[useUpdateLead] ✅ Adicionando closed_won_at automaticamente:', finalUpdates.closed_won_at)
      } else if (updates.status && updates.status !== 'fechado_ganho') {
        // Se está mudando PARA FORA de "fechado_ganho", limpar closed_won_at
        finalUpdates.closed_won_at = null
        logDebug('[useUpdateLead] 🔄 Limpando closed_won_at (status mudou para:', updates.status, ')')
      }

      // Sanitização: remover campos undefined (não atualiza) e
      // converter strings vazias em null para colunas UUID (ex: *_id)
      const uuidLikeKey = (k: string) => k.endsWith('_id') || k === 'campaign_id' || k === 'assignee_id'
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

      const sanitizedUpdates = Object.fromEntries(
        Object.entries(finalUpdates)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => {
            if (uuidLikeKey(k)) {
              if (v === null) return [k, null]
              if (typeof v === 'string') {
                const trimmed = v.trim()
                if (!trimmed) return [k, null]
                // Qualquer valor não-UUID (ex.: 'none') vira null
                if (!uuidRegex.test(trimmed)) return [k, null]
                return [k, trimmed]
              }
            }
            return [k, v]
          })
      ) as LeadUpdate

      logDebug('[useUpdateLead] Payload sanitizado:', sanitizedUpdates)

      if (!org?.id) throw new Error('Organização ativa não definida')

      const { data, error } = await supabase
        .from('leads')
        .update(sanitizedUpdates)
        .eq('id', id)
        .eq('organization_id', org.id)
        .select()
        .single()

      if (error) {
        console.error('[useUpdateLead] Erro ao atualizar lead:', error)
        const msg = `[${(error as any)?.code ?? 'ERR'}] ${(error as any)?.message ?? 'Falha ao atualizar lead'}` +
          ((error as any)?.details ? ` - ${(error as any).details}` : '')
        throw new Error(msg)
      }

      logDebug('[useUpdateLead] Lead atualizado com sucesso:', data)
      return data
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })

      const previousLeads = queryClient.getQueryData(['leads'])

      queryClient.setQueryData(['leads'], (old: Lead[] | undefined) => {
        if (!old) return old
        return old.map(lead =>
          lead.id === id ? { ...lead, ...updates } : lead
        )
      })

      return { previousLeads }
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      console.error('[useUpdateLead] Erro ao atualizar lead:', err)
      const anyErr = err as any
      const message = anyErr?.message || anyErr?.error || (anyErr?.code ? `Código: ${anyErr.code}` : 'Erro ao atualizar lead')
      toast.error(message)
    },
    onSettled: () => {
      logDebug('[useUpdateLead] Atualizando queries em tempo real')

      // Refetch queries de leads para atualização imediata
      queryClient.refetchQueries({ queryKey: ['leads'], type: 'active' })

      // Refetch queries do dashboard (status ou valor podem ter mudado)
      queryClient.refetchQueries({ queryKey: ['dashboard-summary'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['pipeline-metrics'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['meta-kpis'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['combined-funnel'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['pipeline-evolution'], type: 'active' })
    }
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async (id: string) => {
      logDebug('[useDeleteLead] Deletando lead:', id)
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('organization_id', org.id)

      if (error) {
        console.error('[useDeleteLead] Erro ao deletar lead:', error)
        throw error
      }

      logDebug('[useDeleteLead] Lead deletado com sucesso')
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })

      const previousLeads = queryClient.getQueryData(['leads']) as Lead[] | undefined

      queryClient.setQueryData(['leads'], (old: Lead[] | undefined) => {
        if (!old) return old
        return old.filter((l) => l.id !== id)
      })

      return { previousLeads }
    },
    onSuccess: () => {
      logDebug('[useDeleteLead] Invalidando queries')

      // Invalidar queries de leads
      queryClient.invalidateQueries({ queryKey: ['leads'] })

      // Invalidar queries do dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] })
      // Invalidar visões adicionais do pipeline
      queryClient.invalidateQueries({ queryKey: ['leads-by-status'] })
      queryClient.invalidateQueries({ queryKey: ['leads-follow-up'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })

      toast.success('Lead removido com sucesso!')
    },
    onError: (error, _id, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
      console.error('[useDeleteLead] Erro ao deletar lead:', error)
      toast.error('Erro ao remover lead')
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['leads'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['dashboard-summary'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['pipeline-metrics'], type: 'active' })
      // Refetch visões adicionais
      queryClient.refetchQueries({ queryKey: ['leads-by-status'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['leads-follow-up'], type: 'active' })
      queryClient.refetchQueries({ queryKey: ['pipeline-stats'], type: 'active' })
    }
  })
}

export function useLeadActivity(leadId?: string) {
  const queryClient = useQueryClient()

  // Real-time: invalidar histórico quando houver novas atividades
  useEffect(() => {
    const channel = supabase
      .channel('realtime-lead-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_activity' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lead-activity'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery<LeadActivity[]>({
    queryKey: ['lead-activity', leadId],
    queryFn: async () => {
      let query = supabase
        .from('lead_activity')
        .select('*')
        .order('created_at', { ascending: false })

      if (leadId) {
        query = query.eq('lead_id', leadId)
      }

      query = query.limit(50)

      const { data, error } = await query

      if (error) throw error
      return data as LeadActivity[]
    },
    enabled: true,
    staleTime: 0,
  })
}

// Hook para buscar leads por status (visão do pipeline)
export function useLeadsByStatus() {
  const { data: org } = useActiveOrganization()
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('realtime-leads-by-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads-by-status'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
  return useQuery({
    queryKey: ['leads-by-status', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('leads')
        .select('id, title, status, value, priority, assignee_name, created_at')
        .eq('organization_id', org.id)
        .order('position')

      if (error) throw error

      const grouped = data.reduce((acc, lead) => {
        if (!acc[lead.status]) acc[lead.status] = []
        acc[lead.status].push(lead)
        return acc
      }, {} as Record<string, typeof data>)

      return grouped
    },
    staleTime: 30000, // 30 segundos
  })
}

// Hook para estatísticas do pipeline
export function usePipelineStats() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['pipeline-stats', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('leads')
        .select('status, value, priority, created_at, closed_won_at')
        .eq('organization_id', org.id)

      if (error) throw error

      const stats = {
        total: data.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        totalValue: 0,
        wonValue: 0,
        conversionRate: 0,
        avgDealSize: 0,
      }

      data.forEach(lead => {
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1
        if (lead.priority) stats.byPriority[lead.priority] = (stats.byPriority[lead.priority] || 0) + 1
        if (lead.value) {
          stats.totalValue += lead.value
          if (lead.status === 'fechado_ganho') stats.wonValue += lead.value
        }
      })

      const wonLeads = stats.byStatus['fechado_ganho'] || 0
      stats.conversionRate = stats.total > 0 ? (wonLeads / stats.total) * 100 : 0
      stats.avgDealSize = wonLeads > 0 ? stats.wonValue / wonLeads : 0

      return stats
    },
    staleTime: 60000, // 1 minuto
  })
}

// Hook para leads com follow-up pendente
export function useLeadsFollowUp() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['leads-follow-up', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, title, assignee_name, next_follow_up_date, last_contact_date, priority')
        .eq('organization_id', org.id)
        .lte('next_follow_up_date', today)
        .neq('status', 'fechado_ganho')
        .neq('status', 'fechado_perdido')
        .order('next_follow_up_date', { ascending: true })

      if (error) throw error
      return data
    },
    staleTime: 300000, // 5 minutos
  })
}

// Hook para atualizar score do lead
export function useUpdateLeadScore() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async ({ leadId, score }: { leadId: string; score: number }) => {
      if (!org?.id) throw new Error('Organização ativa não definida')

      const { data, error } = await supabase
        .from('leads')
        .update({ lead_score: score })
        .eq('id', leadId)
        .eq('organization_id', org.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Score do lead atualizado!')
    },
    onError: () => {
      toast.error('Erro ao atualizar score do lead')
    }
  })
}

// Hook para buscar produtos de interesse disponíveis
export function useProductInterests() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['product-interests', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('leads')
        .select('product_interest')
        .eq('organization_id', org.id)
        .not('product_interest', 'is', null)

      if (error) throw error

      // Extrair valores únicos
      const interests = [...new Set(data.map(item => item.product_interest).filter(Boolean))]
      return interests.sort()
    },
    staleTime: 300000, // 5 minutos
  })
}

// Hook para buscar detalhes de origem disponíveis
export function useLeadSourceDetails() {
  const { data: org } = useActiveOrganization()
  return useQuery({
    queryKey: ['lead-source-details', org?.id],
    queryFn: async () => {
      if (!org?.id) throw new Error('Organização ativa não definida')
      const { data, error } = await supabase
        .from('leads')
        .select('lead_source_detail')
        .eq('organization_id', org.id)
        .not('lead_source_detail', 'is', null)

      if (error) throw error

      // Extrair valores únicos
      const details = [...new Set(data.map(item => item.lead_source_detail).filter(Boolean))]
      return details.sort()
    },
    staleTime: 300000, // 5 minutos
  })
}
