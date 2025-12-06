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
  thumbnail_url?: string;
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
  from: Date;
  to: Date;
}

export function getLastNDays(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
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
 * Sync ad set insights (métricas) from Meta API
 */
export const useSyncAdSetInsights = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      since,
      until,
      ad_account_ids,
      campaign_ids,
      ad_set_ids,
    }: {
      since?: string;
      until?: string;
      ad_account_ids?: string[];
      campaign_ids?: string[];
      ad_set_ids?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-adset-insights', {
        body: { since, until, ad_account_ids, campaign_ids, ad_set_ids },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['ad-set-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ad-sets'] });
      toast({ title: 'Métricas de Conjuntos', description: 'Insights por conjunto sincronizados.' });
    },
    onError: (error) => {
      console.error('Error syncing ad set insights:', error);
      toast({ title: 'Erro ao Sincronizar Métricas (Conjuntos)', description: 'Tente novamente.', variant: 'destructive' });
    },
  });
};

/**
 * Sync ad insights (métricas por criativo) from Meta API
 */
export const useSyncAdInsights = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      since,
      until,
      ad_account_ids,
      campaign_ids,
      ad_set_ids,
      ad_ids,
    }: {
      since?: string;
      until?: string;
      ad_account_ids?: string[];
      campaign_ids?: string[];
      ad_set_ids?: string[];
      ad_ids?: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-ad-insights', {
        body: { since, until, ad_account_ids, campaign_ids, ad_set_ids, ad_ids },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['ad-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      toast({ title: 'Métricas de Criativos', description: 'Insights por criativo sincronizados.' });
    },
    onError: (error) => {
      console.error('Error syncing ad insights:', error);
      toast({ title: 'Erro ao Sincronizar Métricas (Criativos)', description: 'Tente novamente.', variant: 'destructive' });
    },
  });
};

/**
 * Get ad set metrics aggregated by date range
 */
export const useAdSetMetrics = (
  {
    accountId,
    campaignId,
    adSetId,
    dateRange,
  }: {
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
    dateRange: DateRange;
  },
  options: { enabled?: boolean } = {}
) => {
  return useQuery<AdSetMetrics[]>({
    queryKey: ["adSetMetrics", accountId, campaignId, adSetId, dateRange],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const { data, error } = await supabase.rpc("get_ad_set_metrics", {
        p_account_id: accountId,
        p_campaign_id: campaignId,
        p_ad_set_id: adSetId,
        p_start_date: dateRange.from.toISOString().split("T")[0],
        p_end_date: dateRange.to.toISOString().split("T")[0],
      });

      if (error) {
        console.error("Error fetching ad set metrics:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: options.enabled,
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
          creative_data,
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
  {
    accountId,
    campaignId,
    adSetId,
    dateRange,
  }: {
    accountId?: string;
    campaignId?: string;
    adSetId?: string;
    dateRange: DateRange;
  },
  options: { enabled?: boolean } = {}
) => {
  return useQuery<AdMetrics[]>({
    queryKey: ["adMetrics", accountId, campaignId, adSetId, dateRange],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const { data, error } = await supabase.rpc("get_ad_metrics", {
        p_account_id: accountId,
        p_campaign_id: campaignId,
        p_ad_set_id: adSetId,
        p_start_date: dateRange.from.toISOString().split("T")[0],
        p_end_date: dateRange.to.toISOString().split("T")[0],
      });

      if (error) {
        console.warn("get_ad_metrics indisponível, aplicando fallback via ad_daily_insights.", error);
        // Fallback: agrega métricas diretamente de ad_daily_insights com join em ads
        const startStr = dateRange.from.toISOString().split("T")[0];
        const endStr = dateRange.to.toISOString().split("T")[0];

        let query = supabase
          .from("ad_daily_insights")
          .select(
            `
            ad_id,
            date,
            spend,
            impressions,
            clicks,
            leads_count,
            reach,
            frequency,
            quality_ranking,
            engagement_ranking,
            conversion_ranking,
            ads!inner(
              id,
              name,
              creative_type,
              title,
              body,
              call_to_action,
              link_url,
              image_url,
              video_url,
              thumbnail_url,
              creative_data,
              campaign_id,
              ad_set_id
            )
          `
          )
          .gte("date", startStr)
          .lte("date", endStr)
          .order("date", { ascending: false })
          .limit(5000);

        // Aplica filtros quando possível nas tabelas relacionadas
        if (adSetId) {
          query = query.eq("ads.ad_set_id", adSetId);
        }
        if (campaignId) {
          query = query.eq("ads.campaign_id", campaignId);
        }
        // Se houver accountId sem campaignId, restringe por campanhas da conta
        if (!campaignId && accountId) {
          const { data: camps } = await supabase
            .from("ad_campaigns")
            .select("id")
            .eq("ad_account_id", accountId)
            .limit(5000);
          const campIds = (camps ?? []).map((c: any) => c.id);
          if (campIds.length > 0) {
            query = query.in("ads.campaign_id", campIds);
          }
        }
        // Nota: accountId exige join adicional em ad_campaigns/ad_accounts; se não houver campaignId, filtramos por campanha quando disponível

        const { data: rows, error: fbError } = await query;
        if (fbError) {
          console.error("Erro no fallback de ad_daily_insights:", fbError);
          // Evita quebrar a UI; retorna vazio
          return [];
        }
        if (!rows || rows.length === 0) return [];

        const aggregated: Record<string, (AdMetrics & { _freqSum: number; _freqCount: number; _latestDate?: string })> = {};
        for (const r of rows as any[]) {
          const ad = r.ads;
          if (!ad) continue;
          const key = ad.id;
          if (!aggregated[key]) {
            aggregated[key] = {
              ad_id: ad.id,
              ad_name: ad.name,
              creative_type: ad.creative_type,
              image_url: ad.image_url,
              video_url: ad.video_url,
              thumbnail_url: ad.thumbnail_url,
              spend: 0,
              impressions: 0,
              clicks: 0,
              leads_count: 0,
              cpl: 0,
              cpm: 0,
              cpc: 0,
              ctr: 0,
              quality_ranking: undefined,
              engagement_ranking: undefined,
              conversion_ranking: undefined,
              _freqSum: 0,
              _freqCount: 0,
              _latestDate: undefined,
            } as any;
          }
          aggregated[key].spend += Number(r.spend ?? 0);
          aggregated[key].impressions += Number(r.impressions ?? 0);
          aggregated[key].clicks += Number(r.clicks ?? 0);
          aggregated[key].leads_count += Number(r.leads_count ?? 0);
          // Alcance: somatório simples (valores diários já são únicos)
          // Frequência: média simples sobre o período
          aggregated[key]._freqSum += Number(r.frequency ?? 0);
          aggregated[key]._freqCount += 1;
          // Rankings: usa o registro mais recente por data
          const d = String(r.date || '');
          if (!aggregated[key]._latestDate || d >= aggregated[key]._latestDate) {
            aggregated[key]._latestDate = d;
            if (r.quality_ranking) aggregated[key].quality_ranking = r.quality_ranking;
            if (r.engagement_ranking) aggregated[key].engagement_ranking = r.engagement_ranking;
            if (r.conversion_ranking) aggregated[key].conversion_ranking = r.conversion_ranking;
          }
        }

        // Calcula métricas derivadas
        for (const key of Object.keys(aggregated)) {
          const m = aggregated[key];
          m.cpl = m.leads_count > 0 ? m.spend / m.leads_count : 0;
          m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
          m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
          m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
          // Frequência média
          const freqAvg = m._freqCount > 0 ? m._freqSum / m._freqCount : 0;
          // Remoção de campos internos
          delete (m as any)._freqSum;
          delete (m as any)._freqCount;
          (m as any).frequency = freqAvg;
          delete (m as any)._latestDate;
        }

        return Object.values(aggregated).sort((a, b) => b.spend - a.spend);
      }
      return data || [];
    },
    enabled: options.enabled,
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
