import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useInteractions, useCreateInteraction, useUpdateInteraction, useDeleteInteraction } from '../useInteractions'

const calls: Array<{ method: string; args: any[] }> = []

vi.mock('@/hooks/useActiveOrganization', () => {
  return { useActiveOrganization: () => ({ data: { id: 'org-1' } }) }
})

vi.mock('@/lib/supabase', () => {
  const rows = [
    { id: 'i1', interaction_type: 'call', lead_id: 'l1', organization_id: 'org-1', interaction_date: new Date().toISOString() },
  ]

  const builder: any = {
    select(...args: any[]) { calls.push({ method: 'select', args }); return builder },
    order(...args: any[]) { calls.push({ method: 'order', args }); return builder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return builder },
    single() { calls.push({ method: 'single', args: [] }); return builder },
    then(resolve: any) { return resolve({ data: rows, error: null }) },
  }

  const insertBuilder: any = {
    insert(payload: any) { calls.push({ method: 'insert', args: [payload] }); return insertBuilder },
    select() { return insertBuilder },
    single() { return { then: (resolve: any) => resolve({ data: { id: 'i2' }, error: null }) } },
  }

  const updateBuilder: any = {
    update(updates: any) { calls.push({ method: 'update', args: [updates] }); return updateBuilder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return updateBuilder },
    select() { return updateBuilder },
    single() { return { then: (resolve: any) => resolve({ data: { id: 'i1' }, error: null }) } },
  }

  const deleteBuilder: any = {
    delete() { calls.push({ method: 'delete', args: [] }); return deleteBuilder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return deleteBuilder },
    then(resolve: any) { return resolve({ data: null, error: null }) },
  }

  return {
    supabase: {
      channel: vi.fn(() => ({
        on: vi.fn(() => ({ subscribe: vi.fn(() => ({}) ) })),
        subscribe: vi.fn(() => ({})),
      })),
      removeChannel: vi.fn(),
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
      from: vi.fn((table: string) => {
        if (table === 'interactions') {
          return {
            select: builder.select,
            order: builder.order,
            eq: builder.eq,
            insert: insertBuilder.insert,
            update: updateBuilder.update,
            delete: deleteBuilder.delete,
            single: builder.single,
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

describe('CRM interactions org scoping', () => {
  beforeEach(() => { calls.splice(0, calls.length); vi.clearAllMocks() })

  it('useInteractions filtra por organization_id', async () => {
    const { result } = renderHook(() => useInteractions('l1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy())
    const orgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    const leadFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'lead_id' && c.args[1] === 'l1')
    expect(orgFilter && leadFilter).toBe(true)
  })

  it('useCreateInteraction insere organization_id', async () => {
    const m = renderHook(() => useCreateInteraction(), { wrapper })
    await act(async () => {
      await m.result.current.mutateAsync({ interaction_type: 'call', lead_id: 'l1' } as any)
    })
    const insertCall = calls.find(c => c.method === 'insert')
    expect(insertCall).toBeTruthy()
    expect(insertCall?.args[0].organization_id).toBe('org-1')
  })

  it('useUpdateInteraction aplica filtro por organization_id', async () => {
    const m = renderHook(() => useUpdateInteraction(), { wrapper })
    await act(async () => {
      await m.result.current.mutateAsync({ id: 'i1', content: 'ok' } as any)
    })
    const orgEq = calls.find(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgEq).toBeTruthy()
  })

  it('useDeleteInteraction aplica filtro por organization_id', async () => {
    const m = renderHook(() => useDeleteInteraction(), { wrapper })
    await act(async () => { await m.result.current.mutateAsync('i1') })
    const orgEq = calls.find(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgEq).toBeTruthy()
  })
})
