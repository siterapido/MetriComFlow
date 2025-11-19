import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetMetrics, type GetMetricsResponse } from '../useGetMetrics';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

vi.mock('../useAuth', () => {
  return {
    useAuth: () => ({ user: { id: 'test-user' } }),
  };
});

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useGetMetrics', () => {
  const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna dados quando parâmetros são válidos (uma conta)', async () => {
    const mockData: GetMetricsResponse = { data: [{ id: 'set1', name: 'Set 1', spend: 10, impressions: 100, clicks: 5, leads_count: 1, link_clicks: 3, post_engagement: 2 }] };
    invoke.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useGetMetrics({
      since: '2025-01-01',
      until: '2025-01-31',
      ad_account_ids: ['acc1'],
      level: 'adSet',
    }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('suporta múltiplas contas sem erro', async () => {
    const mockData: GetMetricsResponse = { data: [
      { id: 'set1', name: 'Set 1', spend: 10, impressions: 100, clicks: 5, leads_count: 1, link_clicks: 3, post_engagement: 2 },
      { id: 'set2', name: 'Set 2', spend: 20, impressions: 200, clicks: 10, leads_count: 2, link_clicks: 6, post_engagement: 4 },
    ] };
    invoke.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useGetMetrics({
      since: '2025-01-01',
      until: '2025-01-31',
      ad_account_ids: ['acc1', 'acc2'],
      level: 'adSet',
    }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.length).toBe(2);
  });

  it('não executa quando parâmetros obrigatórios faltam', async () => {
    const { result } = renderHook(() => useGetMetrics({
      since: '',
      until: '',
      ad_account_ids: [],
      level: 'adSet',
    } as any), { wrapper });

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});