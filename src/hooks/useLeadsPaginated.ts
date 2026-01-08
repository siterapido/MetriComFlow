import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState, useCallback } from 'react'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'
import { logDebug } from '@/lib/debug'
import type { LeadWithLabels } from './useLeads'

// Quantidade de leads por página
const LEADS_PER_PAGE = 30

// Interface para controle de paginação por status
export interface LeadsPaginationState {
  [status: string]: {
    page: number
    hasMore: boolean
    totalLoaded: number
  }
}

/**
 * Hook otimizado para leads com paginação por status do pipeline
 *
 * Carrega inicialmente LEADS_PER_PAGE leads por status (30 por padrão)
 * e permite carregar mais conforme necessário.
 */
export function useLeadsPaginated() {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()
  const [paginationState, setPaginationState] = useState<LeadsPaginationState>({})

  /**
   * Carrega leads paginados por status
   *
   * @param status - Status do pipeline (ex: 'novo_lead', 'qualificacao')
   * @param page - Número da página (inicia em 0)
   * @param limit - Quantidade de leads por página
   */
  const fetchLeadsByStatus = async (
    status: string,
    page: number = 0,
    limit: number = LEADS_PER_PAGE
  ): Promise<{ leads: LeadWithLabels[]; hasMore: boolean; totalCount: number }> => {
    logDebug(`[useLeadsPaginated] 🔍 Buscando leads para status '${status}': página ${page}, limite ${limit}`)

    if (!org?.id) {
      throw new Error('Organização ativa não definida')
    }

    // Verificar autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      throw new Error('Erro ao verificar autenticação: ' + sessionError.message)
    }

    if (!session) {
      throw new Error('Você precisa estar autenticado para visualizar os leads.')
    }

    const offset = page * limit

    // Query otimizada: busca apenas os campos necessários para renderização
    const { data, error, count } = await supabase
      .from('leads')
      .select(`
        id,
        title,
        description,
        status,
        value,
        priority,
        source,
        campaign_id,
        external_lead_id,
        assignee_name,
        due_date,
        created_at,
        updated_at,
        position,
        comments_count,
        attachments_count,
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
        )
      `, { count: 'exact' })
      .eq('organization_id', org.id)
      .eq('status', status)
      .order('position', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error(`[useLeadsPaginated] ❌ Erro ao buscar leads [${status}]:`, error)
      throw error
    }

    const hasMore = (count ?? 0) > offset + limit
    const totalCount = count ?? 0

    logDebug(`[useLeadsPaginated] ✅ ${data?.length || 0} leads carregados [${status}] (total: ${totalCount}, hasMore: ${hasMore})`)

    return {
      leads: (data as LeadWithLabels[]) || [],
      hasMore,
      totalCount
    }
  }

  /**
   * Buscar todos os status com primeira página
   */
  const {
    data: allLeadsByStatus,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['leads-paginated', org?.id],
    queryFn: async () => {
      if (!org?.id) {
        logDebug('[useLeadsPaginated] ⏳ Aguardando organização...')
        return null
      }

      const statuses = [
        'novo_lead',
        'qualificacao',
        'reuniao',
        'proposta',
        'negociacao',
        'fechado_ganho',
        'fechado_perdido'
      ]

      logDebug(`[useLeadsPaginated] 🚀 Carregando página inicial para ${statuses.length} status...`)

      // Buscar primeira página de cada status em paralelo
      const results = await Promise.all(
        statuses.map(async (status) => {
          try {
            const { leads, hasMore, totalCount } = await fetchLeadsByStatus(status, 0, LEADS_PER_PAGE)

            // Atualizar estado de paginação
            setPaginationState(prev => ({
              ...prev,
              [status]: {
                page: 0,
                hasMore,
                totalLoaded: leads.length
              }
            }))

            return { status, leads, hasMore, totalCount }
          } catch (error) {
            console.error(`[useLeadsPaginated] Erro ao carregar status '${status}':`, error)
            return { status, leads: [], hasMore: false, totalCount: 0 }
          }
        })
      )

      // Converter para objeto indexado por status
      const indexed = results.reduce((acc, { status, leads, hasMore, totalCount }) => {
        acc[status] = { leads, hasMore, totalCount }
        return acc
      }, {} as Record<string, { leads: LeadWithLabels[]; hasMore: boolean; totalCount: number }>)

      logDebug('[useLeadsPaginated] ✅ Carregamento inicial concluído!')

      return indexed
    },
    enabled: !!org?.id,
    staleTime: 30000, // 30 segundos
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  /**
   * Carregar mais leads de um status específico
   */
  const loadMore = useCallback(async (status: string) => {
    const currentState = paginationState[status]
    if (!currentState || !currentState.hasMore) {
      logDebug(`[useLeadsPaginated] ⚠️ Sem mais leads para carregar [${status}]`)
      return
    }

    const nextPage = currentState.page + 1
    logDebug(`[useLeadsPaginated] 📥 Carregando página ${nextPage} [${status}]...`)

    try {
      const { leads, hasMore } = await fetchLeadsByStatus(status, nextPage, LEADS_PER_PAGE)

      // Atualizar cache do TanStack Query
      queryClient.setQueryData(['leads-paginated', org?.id], (old: any) => {
        if (!old) return old

        return {
          ...old,
          [status]: {
            ...old[status],
            leads: [...old[status].leads, ...leads],
            hasMore
          }
        }
      })

      // Atualizar estado de paginação
      setPaginationState(prev => ({
        ...prev,
        [status]: {
          page: nextPage,
          hasMore,
          totalLoaded: prev[status].totalLoaded + leads.length
        }
      }))

      logDebug(`[useLeadsPaginated] ✅ +${leads.length} leads carregados [${status}]`)
    } catch (error) {
      console.error(`[useLeadsPaginated] ❌ Erro ao carregar mais [${status}]:`, error)
    }
  }, [paginationState, org?.id, queryClient])

  /**
   * Recarregar todos os leads (resetar paginação)
   */
  const refresh = useCallback(async () => {
    logDebug('[useLeadsPaginned] 🔄 Recarregando todos os leads...')
    setPaginationState({})
    await refetch()
  }, [refetch])

  return {
    data: allLeadsByStatus,
    isLoading,
    error,
    loadMore,
    refresh,
    paginationState
  }
}

/**
 * Hook para atualizar lead (mantido do useLeads original)
 */
export const useUpdateLeadPaginated = () => {
  const queryClient = useQueryClient()
  const { data: org } = useActiveOrganization()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      logDebug('[useUpdateLeadPaginated] Atualizando lead:', { id, updates })

      if (!org?.id) throw new Error('Organização ativa não definida')

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', org.id)
        .select()
        .single()

      if (error) throw error

      return data
    },
    onSuccess: () => {
      // Refetch todos os leads paginados
      queryClient.invalidateQueries({ queryKey: ['leads-paginated'] })
    }
  })
}
