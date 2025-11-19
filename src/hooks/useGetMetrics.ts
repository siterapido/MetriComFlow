
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type Level = 'campaign' | 'adSet' | 'ad';

interface GetMetricsParams {
  since: string;
  until: string;
  ad_account_ids: string[];
  campaign_ids?: string[];
  ad_set_ids?: string[];
  ad_ids?: string[];
  level: Level;
}

// Tipos de resposta esperados do edge function get-metrics
export type MetricsRow = {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  link_clicks: number;
  post_engagement: number;
};

export type GetMetricsResponse = {
  data: MetricsRow[];
};

const getMetrics = async (params: GetMetricsParams): Promise<GetMetricsResponse> => {
  const { data, error } = await supabase.functions.invoke<GetMetricsResponse>('get-metrics', {
    body: JSON.stringify(params),
  });

  if (error) {
    const ctx: any = (error as any)?.context;
    let detail = '';
    if (ctx) {
      if (typeof ctx === 'string') detail = ctx;
      else if (typeof ctx === 'object') detail = ctx.error || JSON.stringify(ctx);
    }
    const msg = detail
      ? `Edge Function error: ${detail}`
      : error.message || 'Edge Function returned a non-2xx status code';
    throw new Error(msg);
  }

  return data as GetMetricsResponse;
};

export const useGetMetrics = (params: GetMetricsParams) => {
  const { user } = useAuth();

  return useQuery<GetMetricsResponse>({
    queryKey: ['metrics', params],
    queryFn: () => getMetrics(params),
    enabled: !!user && !!params.since && !!params.until && params.ad_account_ids.length > 0,
    staleTime: 60000,
    retry: 2,
    keepPreviousData: true,
  });
};
