import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdMetrics } from '../useAdSetsAndAds'

vi.mock('@/lib/supabase', () => {
  const rows = [
    {
      ad_id: 'ad-1',
      date: '2025-01-01',
      spend: 100,
      impressions: 10000,
      clicks: 200,
      leads_count: 5,
      reach: 8000,
      frequency: 1.25,
      quality_ranking: 'ABOVE_AVERAGE',
      engagement_ranking: 'AVERAGE',
      conversion_ranking: 'AVERAGE',
      ads: { id: 'ad-1', name: 'Creative A', creative_type: 'IMAGE', image_url: 'img', thumbnail_url: 'thumb', campaign_id: 'camp-1', ad_set_id: 'set-1' }
    },
    {
      ad_id: 'ad-1',
      date: '2025-01-02',
      spend: 50,
      impressions: 4000,
      clicks: 80,
      leads_count: 3,
      reach: 3500,
      frequency: 1.05,
      quality_ranking: 'ABOVE_AVERAGE',
      engagement_ranking: 'ABOVE_AVERAGE',
      conversion_ranking: 'ABOVE_AVERAGE',
      ads: { id: 'ad-1', name: 'Creative A', creative_type: 'IMAGE', image_url: 'img', thumbnail_url: 'thumb', campaign_id: 'camp-1', ad_set_id: 'set-1' }
    },
  ]

  const builder: any = {
    _filters: [],
    select() { return builder },
    gte() { return builder },
    lte() { return builder },
    order() { return builder },
    limit() { return builder },
    eq() { return builder },
    in() { return builder },
  }

  return {
    supabase: {
      rpc: vi.fn(async () => ({ error: { message: 'rpc unavailable' } })),
      from: vi.fn((table: string) => {
        if (table === 'ad_daily_insights') {
          const thenable: any = {
            select: (..._args: any[]) => thenable,
            gte: (..._args: any[]) => thenable,
            lte: (..._args: any[]) => thenable,
            order: (..._args: any[]) => thenable,
            limit: (..._args: any[]) => thenable,
            eq: (..._args: any[]) => thenable,
            in: (..._args: any[]) => thenable,
            then: (resolve: any) => resolve({ data: rows, error: null }),
          }
          return thenable as any
        }
        if (table === 'ad_campaigns') {
          const thenable: any = {
            select: (..._args: any[]) => thenable,
            eq: (..._args: any[]) => thenable,
            limit: (..._args: any[]) => thenable,
            then: (resolve: any) => resolve({ data: [{ id: 'camp-1' }], error: null }),
          }
          return thenable as any
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

describe('useAdMetrics fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agrega métricas e calcula derivados, incluindo frequência média e rankings', async () => {
    const { result } = renderHook(() => useAdMetrics({ accountId: 'acc-1', dateRange: { from: new Date('2025-01-01'), to: new Date('2025-01-10') } }), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBeFalsy())
    const data = result.current.data || []
    expect(data.length).toBe(1)
    const m = data[0] as any
    expect(m.ad_id).toBe('ad-1')
    expect(m.spend).toBe(150)
    expect(m.impressions).toBe(14000)
    expect(m.clicks).toBe(280)
    expect(m.leads_count).toBe(8)
    expect(Number(m.cpl.toFixed(2))).toBe(18.75)
    expect(Number(m.cpm.toFixed(2))).toBe(Number(((150 / 14000) * 1000).toFixed(2)))
    expect(Number(m.cpc.toFixed(2))).toBe(Number((150 / 280).toFixed(2)))
    expect(Number(m.ctr.toFixed(2))).toBe(Number(((280 / 14000) * 100).toFixed(2)))
    // Frequência média: (1.25 + 1.05)/2
    expect(Number(m.frequency.toFixed(2))).toBe(1.15)
    // Ranking mais recente (data desc): segunda linha
    expect(m.quality_ranking).toBe('ABOVE_AVERAGE')
    expect(m.engagement_ranking).toBe('ABOVE_AVERAGE')
    expect(m.conversion_ranking).toBe('ABOVE_AVERAGE')
  })
})