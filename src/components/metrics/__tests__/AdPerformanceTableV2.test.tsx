import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdPerformanceTableV2 } from '../AdPerformanceTableV2'

vi.mock('@/hooks/useGetMetrics', () => {
  return {
    useGetMetrics: vi.fn().mockImplementation((_params: any) => ({
      data: { data: [{ id: 'ad1', name: 'Anúncio 1', spend: 10, impressions: 100, clicks: 5, leads_count: 1, link_clicks: 3, post_engagement: 7 }] },
      isLoading: false,
      error: null,
    })),
  }
})

describe('AdPerformanceTableV2', () => {
  const dateRange = { from: new Date('2025-11-01'), to: new Date('2025-11-07') } as any

  it('exibe mensagem quando período está ausente', () => {
    render(
      <AdPerformanceTableV2 adAccountIds={["acc1"]} dateRange={{} as any} /> as any
    )
    expect(screen.getByText(/Selecione um período válido/i)).toBeInTheDocument()
  })

  it('exibe mensagem quando não há contas selecionadas', () => {
    render(
      <AdPerformanceTableV2 adAccountIds={[]} dateRange={dateRange} /> as any
    )
    expect(screen.getByText(/Nenhuma conta publicitária selecionada/i)).toBeInTheDocument()
  })

  it('renderiza a tabela com dados quando parâmetros são válidos', () => {
    render(
      <AdPerformanceTableV2 adAccountIds={["acc1"]} dateRange={dateRange} /> as any
    )
    expect(screen.getByText('Anúncio')).toBeInTheDocument()
    expect(screen.getByText('Anúncio 1')).toBeInTheDocument()
  })
})