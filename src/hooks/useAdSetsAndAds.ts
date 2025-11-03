/**
 * Hooks para gerenciar Ad Sets e Ads (Criativos) do Meta Ads
 * Inclui sincronização, listagem e métricas de performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useActiveOrganization } from './useActiveOrganization';

// ============================================================================
// TYPES
// ============================================================================

export interface AdSet {
  id: string;
  external_id: string;
  campaign_id: string;
  name: string;
  status: string;
  optimization_goal?: string;
  billing_event?: string;
  bid_strategy?: string;
  targeting?: any;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Ad {
  id: string;
  external_id: string;
  ad_set_id: string;
  campaign_id: string;
  name: string;
  status: string;
  creative_id?: string;
  creative_type?: string;
  title?: string;
  body?: string;
  call_to_action?: string;
  link_url?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  creative_data?: any;
  created_time?: string;
  updated_time?: string;
  created_at: string;
  updated_at: string;
}

export interface AdSetMetrics {
  ad_set_id: string;
  ad_set_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  cpl: number;
  cpm: number;
  cpc: number;
  ctr: number;
  reach?: number;
  frequency?: number;
}

export interface AdMetrics {
  ad_id: string;
  ad_name: string;
  creative_type?: string;
  image_url?: string;
  video_url?: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  cpl: number;
  cpm: number;
  cpc: number;
  ctr: number;
  quality_ranking?: string;
  engagement_ranking?: string;
  conversion_ranking?: string;
}

interface DateRange {
  start: string;
  end: string;
}

// ============================================================================
// AD SETS HOOKS
// ============================================================================

/**
 * Fetch ad sets for a specific campaign
 */
export const useAdSets = (campaignId?: string, options: { enabled?: boolean } = {}) => {
  const { data: org } = useActiveOrganization();

  return useQuery({
    queryKey: ['ad-sets', campaignId, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('ad_sets')
        .select(`
          *,
          ad_campaigns!inner(
            name,
            ad_accounts!inner(organization_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      // Filter by organization
      if (org?.id) {
        query = query.eq('ad_campaigns.ad_accounts.organization_id', org.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AdSet[];
    },
    enabled: !!org?.id && (options.enabled !== false),
  });
};

/**
 * Sync ad sets from Meta API
 */
export const useSyncAdSets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      campaign_ids,
      ad_account_ids,
    }: {
      campaign_ids?: string[];
      ad_account_ids?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-ad-sets', {
        body: { campaign_ids, ad_account_ids },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ad-sets'] });
      toast({
        title: 'Conjuntos Sincronizados',
        description: `${data.synced_ad_sets} conjuntos de anúncios atualizados.`,
      });
    },
    onError: (error) => {
      console.error('Error syncing ad sets:', error);
      toast({
        title: 'Erro ao Sincronizar',
        description: 'Não foi possível sincronizar os conjuntos de anúncios.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Get ad set metrics aggregated by date range
 */
export const useAdSetMetrics = (
  adSetId?: string,
  dateRange?: DateRange,
  options: { enabled?: boolean } = {}
) => {
  const { data: org } = useActiveOrganization();

  return useQuery({
    queryKey: ['ad-set-metrics', adSetId, dateRange, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('ad_set_daily_insights')
        .select(`
          *,
          ad_sets!inner(
            name,
            ad_campaigns!inner(
              ad_accounts!inner(organization_id)
            )
          )
        `);

      if (adSetId) {
        query = query.eq('ad_set_id', adSetId);
      }

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      }

      // Filter by organization
      if (org?.id) {
        query = query.eq('ad_sets.ad_campaigns.ad_accounts.organization_id', org.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate metrics by ad set
      const metricsMap = new Map<string, AdSetMetrics>();

      data?.forEach((insight: any) => {
        const adSetId = insight.ad_set_id;
        const existing = metricsMap.get(adSetId);

        if (existing) {
          existing.spend += insight.spend || 0;
          existing.impressions += insight.impressions || 0;
          existing.clicks += insight.clicks || 0;
          existing.leads_count += insight.leads_count || 0;
          existing.reach = (existing.reach || 0) + (insight.reach || 0);
        } else {
          metricsMap.set(adSetId, {
            ad_set_id: adSetId,
            ad_set_name: insight.ad_sets?.name || 'Unknown',
            spend: insight.spend || 0,
            impressions: insight.impressions || 0,
            clicks: insight.clicks || 0,
            leads_count: insight.leads_count || 0,
            reach: insight.reach || 0,
            frequency: insight.frequency || 0,
            cpl: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
          });
        }
      });

      // Calculate derived metrics
      const metrics = Array.from(metricsMap.values()).map((m) => ({
        ...m,
        cpl: m.leads_count > 0 ? m.spend / m.leads_count : 0,
        cpm: m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0,
        cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      }));

      return metrics;
    },
    enabled: !!org?.id && (options.enabled !== false),
  });
};

// ============================================================================
// ADS (CRIATIVOS) HOOKS
// ============================================================================

/**
 * Fetch ads for a specific ad set or campaign
 */
export const useAds = (
  filters?: { ad_set_id?: string; campaign_id?: string },
  options: { enabled?: boolean } = {}
) => {
  const { data: org } = useActiveOrganization();

  return useQuery({
    queryKey: ['ads', filters, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('ads')
        .select(`
          *,
          ad_sets!inner(
            name,
            ad_campaigns!inner(
              name,
              ad_accounts!inner(organization_id)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.ad_set_id) {
        query = query.eq('ad_set_id', filters.ad_set_id);
      }

      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id);
      }

      // Filter by organization
      if (org?.id) {
        query = query.eq('ad_sets.ad_campaigns.ad_accounts.organization_id', org.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Ad[];
    },
    enabled: !!org?.id && (options.enabled !== false),
  });
};

/**
 * Sync ads (criativos) from Meta API
 */
export const useSyncAds = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ad_set_ids,
      campaign_ids,
      ad_account_ids,
    }: {
      ad_set_ids?: string[];
      campaign_ids?: string[];
      ad_account_ids?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-ads', {
        body: { ad_set_ids, campaign_ids, ad_account_ids },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      toast({
        title: 'Criativos Sincronizados',
        description: `${data.synced_ads} anúncios/criativos atualizados.`,
      });
    },
    onError: (error) => {
      console.error('Error syncing ads:', error);
      toast({
        title: 'Erro ao Sincronizar',
        description: 'Não foi possível sincronizar os criativos.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Get ad (creative) metrics aggregated by date range
 */
export const useAdMetrics = (
  filters?: {
    ad_id?: string;
    ad_set_id?: string;
    campaign_id?: string;
    dateRange?: DateRange;
  },
  options: { enabled?: boolean } = {}
) => {
  const { data: org } = useActiveOrganization();

  return useQuery({
    queryKey: ['ad-metrics', filters, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('ad_daily_insights')
        .select(`
          *,
          ads!inner(
            name,
            creative_type,
            image_url,
            video_url,
            ad_sets!inner(
              ad_campaigns!inner(
                ad_accounts!inner(organization_id)
              )
            )
          )
        `);

      if (filters?.ad_id) {
        query = query.eq('ad_id', filters.ad_id);
      }

      if (filters?.ad_set_id) {
        query = query.eq('ad_set_id', filters.ad_set_id);
      }

      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id);
      }

      if (filters?.dateRange) {
        query = query
          .gte('date', filters.dateRange.start)
          .lte('date', filters.dateRange.end);
      }

      // Filter by organization
      if (org?.id) {
        query = query.eq('ads.ad_sets.ad_campaigns.ad_accounts.organization_id', org.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate metrics by ad
      const metricsMap = new Map<string, AdMetrics>();

      data?.forEach((insight: any) => {
        const adId = insight.ad_id;
        const existing = metricsMap.get(adId);

        if (existing) {
          existing.spend += insight.spend || 0;
          existing.impressions += insight.impressions || 0;
          existing.clicks += insight.clicks || 0;
          existing.leads_count += insight.leads_count || 0;
        } else {
          metricsMap.set(adId, {
            ad_id: adId,
            ad_name: insight.ads?.name || 'Unknown',
            creative_type: insight.ads?.creative_type,
            image_url: insight.ads?.image_url,
            video_url: insight.ads?.video_url,
            spend: insight.spend || 0,
            impressions: insight.impressions || 0,
            clicks: insight.clicks || 0,
            leads_count: insight.leads_count || 0,
            quality_ranking: insight.quality_ranking,
            engagement_ranking: insight.engagement_ranking,
            conversion_ranking: insight.conversion_ranking,
            cpl: 0,
            cpm: 0,
            cpc: 0,
            ctr: 0,
          });
        }
      });

      // Calculate derived metrics
      const metrics = Array.from(metricsMap.values()).map((m) => ({
        ...m,
        cpl: m.leads_count > 0 ? m.spend / m.leads_count : 0,
        cpm: m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0,
        cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      }));

      // Sort by spend (highest first)
      return metrics.sort((a, b) => b.spend - a.spend);
    },
    enabled: !!org?.id && (options.enabled !== false),
  });
};

/**
 * Get creative performance ranking
 * Returns top and bottom performing creatives based on various metrics
 */
export const useCreativePerformance = (
  dateRange?: DateRange,
  options: { enabled?: boolean } = {}
) => {
  const { data: metrics, isLoading } = useAdMetrics(
    { dateRange },
    options
  );

  const analysis = {
    topByLeads: metrics?.slice(0, 10) || [],
    topByCTR: [...(metrics || [])].sort((a, b) => b.ctr - a.ctr).slice(0, 10),
    topByROI: [...(metrics || [])]
      .filter((m) => m.cpl > 0)
      .sort((a, b) => a.cpl - b.cpl)
      .slice(0, 10),
    lowPerformers: [...(metrics || [])]
      .filter((m) => m.spend > 50 && m.leads_count === 0)
      .sort((a, b) => b.spend - a.spend),
  };

  return {
    data: analysis,
    isLoading,
  };
};
