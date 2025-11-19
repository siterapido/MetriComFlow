import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useLeadsByStatus, usePipelineStats, useDeleteLead } from '../useLeads'

const calls: Array<{ method: string; args: any[] }> = []

vi.mock('@/hooks/useActiveOrganization', () => {
  return {
    useActiveOrganization: () => ({ data: { id: 'org-1' } }),
  }
})

vi.mock('@/lib/supabase', () => {
  const leadsRows = [
    { id: 'l1', title: 'Lead A', status: 'novo', value: 100, priority: 'alta', assignee_name: 'Ana', created_at: new Date().toISOString(), organization_id: 'org-1' },
    { id: 'l2', title: 'Lead B', status: 'proposta', value: 200, priority: 'media', assignee_name: 'Bruno', created_at: new Date().toISOString(), organization_id: 'org-1' },
    { id: 'l3', title: 'Lead C', status: 'fechado_ganho', value: 300, priority: 'alta', assignee_name: 'Ana', created_at: new Date().toISOString(), organization_id: 'org-1' },
  ]

  const builder: any = {
    select() { calls.push({ method: 'select', args: arguments as any }); return builder },
    order() { calls.push({ method: 'order', args: arguments as any }); return builder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return builder },
    then(resolve: any) { return resolve({ data: leadsRows, error: null }) },
  }

  const deleteBuilder: any = {
    delete() { calls.push({ method: 'delete', args: [] }); return deleteBuilder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return deleteBuilder },
    then(resolve: any) { return resolve({ data: null, error: null }) },
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'leads') {
          return {
            select: builder.select,
            order: builder.order,
            eq: builder.eq,
            delete: deleteBuilder.delete,
            then: builder.then,
          } as any
        }
        return builder
      }),
    },
  }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('CRM hooks de leads (org scoping)', () => {
  beforeEach(() => {
    calls.splice(0, calls.length)
    vi.clearAllMocks()
  })

  it('useLeadsByStatus aplica filtro por organization_id', async () => {
    const { result } = renderHook(() => useLeadsByStatus(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy())

    const hasOrgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(hasOrgFilter).toBe(true)
    const grouped = result.current.data as Record<string, any[]>
    expect(Array.isArray(grouped['novo'])).toBe(true)
  })

  it('usePipelineStats aplica filtro por organization_id e calcula métricas', async () => {
    const { result } = renderHook(() => usePipelineStats(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy())

    const hasOrgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(hasOrgFilter).toBe(true)
    const stats = result.current.data as any
    expect(stats.total).toBe(3)
    expect(stats.byStatus['fechado_ganho']).toBe(1)
    expect(stats.totalValue).toBe(600)
  })

  it('useDeleteLead inclui escopo por organization_id', async () => {
    const del = renderHook(() => useDeleteLead(), { wrapper })
    await act(async () => {
      await del.result.current.mutateAsync('l1')
    })
    const idFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'id' && c.args[1] === 'l1')
    const orgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(idFilter && orgFilter).toBe(true)
  })
})