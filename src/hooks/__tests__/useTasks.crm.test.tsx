import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTasks, useMyTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../useTasks'

const calls: Array<{ method: string; args: any[] }> = []

vi.mock('@/hooks/useActiveOrganization', () => {
  return { useActiveOrganization: () => ({ data: { id: 'org-1' } }) }
})

vi.mock('@/lib/supabase', () => {
  const rows = [
    { id: 't1', lead_id: 'l1', assigned_to: 'tm1', status: 'open', organization_id: 'org-1', due_date: new Date().toISOString() },
  ]

  const builder: any = {
    select() { calls.push({ method: 'select', args: arguments as any }); return builder },
    order() { calls.push({ method: 'order', args: arguments as any }); return builder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return builder },
    then(resolve: any) { return resolve({ data: rows, error: null }) },
  }

  const insertBuilder: any = {
    insert(payload: any) { calls.push({ method: 'insert', args: [payload] }); return insertBuilder },
    select() { return insertBuilder },
    single() { return { then: (resolve: any) => resolve({ data: { id: 't2' }, error: null }) } },
  }

  const updateBuilder: any = {
    update(updates: any) { calls.push({ method: 'update', args: [updates] }); return updateBuilder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return updateBuilder },
    select() { return updateBuilder },
    single() { return { then: (resolve: any) => resolve({ data: { id: 't1' }, error: null }) } },
  }

  const deleteBuilder: any = {
    delete() { calls.push({ method: 'delete', args: [] }); return deleteBuilder },
    eq(key: string, value: any) { calls.push({ method: 'eq', args: [key, value] }); return deleteBuilder },
    then(resolve: any) { return resolve({ data: null, error: null }) },
  }

  return {
    supabase: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })) },
      from: vi.fn((table: string) => {
        if (table === 'team_members') {
          return {
            select: () => ({ eq: () => ({ single: () => ({ then: (resolve: any) => resolve({ data: { id: 'tm1' } }) }) }) })
          } as any
        }
        if (table === 'tasks') {
          return {
            select: builder.select,
            order: builder.order,
            eq: builder.eq,
            insert: insertBuilder.insert,
            update: updateBuilder.update,
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

describe('CRM tasks org scoping', () => {
  beforeEach(() => { calls.splice(0, calls.length); vi.clearAllMocks() })

  it('useTasks filtra por organization_id', async () => {
    const { result } = renderHook(() => useTasks({ leadId: 'l1' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy())
    const orgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgFilter).toBe(true)
  })

  it('useMyTasks filtra por organization_id', async () => {
    const { result } = renderHook(() => useMyTasks(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBeTruthy())
    const orgFilter = calls.some(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgFilter).toBe(true)
  })

  it('useCreateTask insere organization_id', async () => {
    const m = renderHook(() => useCreateTask(), { wrapper })
    await act(async () => { await m.result.current.mutateAsync({ title: 't', lead_id: 'l1' } as any) })
    const insertCall = calls.find(c => c.method === 'insert')
    expect(insertCall?.args[0].organization_id).toBe('org-1')
  })

  it('useUpdateTask aplica filtro por organization_id', async () => {
    const m = renderHook(() => useUpdateTask(), { wrapper })
    await act(async () => { await m.result.current.mutateAsync({ id: 't1', title: 'x' } as any) })
    const orgEq = calls.find(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgEq).toBeTruthy()
  })

  it('useDeleteTask aplica filtro por organization_id', async () => {
    const m = renderHook(() => useDeleteTask(), { wrapper })
    await act(async () => { await m.result.current.mutateAsync('t1') })
    const orgEq = calls.find(c => c.method === 'eq' && c.args[0] === 'organization_id' && c.args[1] === 'org-1')
    expect(orgEq).toBeTruthy()
  })
})