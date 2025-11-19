import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MetricsPageModern from '@/pages/MetricsPageModern'
import { TooltipProvider } from '@/components/ui/tooltip'

vi.mock('@/hooks/useMetaConnectionStatus', () => ({
  useMetaConnectionStatus: () => ({ hasActiveConnection: true, isLoading: false, isFetching: false })
}))

vi.mock('@/hooks/useMetaAuth', () => ({
  useMetaAuth: () => ({
    activeAdAccounts: [{ id: 'acc1' }],
    syncCampaigns: vi.fn(),
    syncDailyInsights: vi.fn(),
    refreshData: vi.fn(),
  })
}))

vi.mock('@/hooks/useUserPermissions', () => ({
  useHasMetricsAccess: () => true,
}))

vi.mock('@/hooks/useMetaMetrics', () => ({
  useAdAccounts: () => ({ data: [{ id: 'acc1', business_name: 'Conta 1', external_id: 'act_1' }], isLoading: false }),
  useAdCampaigns: () => ({ data: [], isLoading: false }),
  getLastNDaysDateRange: (n: number) => {
    const end = new Date()
    const start = new Date(end.getTime() - (n - 1) * 24 * 60 * 60 * 1000)
    const toISO = (d: Date) => d.toISOString().split('T')[0]
    return { start: toISO(start), end: toISO(end) }
  },
}))

vi.mock('@/hooks/useUnifiedMetrics', () => ({
  useUnifiedMetrics: () => ({ data: {
    meta_impressions: 0,
    meta_clicks: 0,
    meta_spend: 0,
    meta_leads: 0,
    crm_total_leads: 0,
    meta_link_clicks: 0,
    meta_post_engagement: 0,
  }, isLoading: false }),
  useUnifiedDailyBreakdown: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useMetaCampaignMetrics', () => ({
  useMetaCampaignOverviewMetrics: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useGetMetrics', () => ({
  useGetMetrics: () => ({ data: { data: [] }, isLoading: false, error: null }),
}))

vi.mock('@/components/metrics/MetaAdsConnectionDialog', () => ({
  MetaAdsConnectionDialog: () => null,
}))

describe('MetricsPageModern – Aba Anúncios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza a aba Anúncios e o título do widget', async () => {
    render(
      <TooltipProvider>
        <MetricsPageModern />
      </TooltipProvider>
    )
    const tab = await screen.findByRole('tab', { name: /Anúncios/i })
    await userEvent.click(tab)
    const title = await screen.findByText(/Desempenho dos Anúncios/i)
    expect(title).toBeInTheDocument()
    const empty = await screen.findByText(/Nenhum dado de anúncio/i)
    expect(empty).toBeInTheDocument()
  })
})
