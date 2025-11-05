
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

const getMetrics = async (params: GetMetricsParams) => {
  const { data, error } = await supabase.functions.invoke('get-metrics', {
    body: JSON.stringify(params),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const useGetMetrics = (params: GetMetricsParams) => {
  const { user } = useAuth();

  return useQuery(
    ['metrics', params],
    () => getMetrics(params),
    {
      enabled: !!user && !!params.since && !!params.until && params.ad_account_ids.length > 0,
    }
  );
};
