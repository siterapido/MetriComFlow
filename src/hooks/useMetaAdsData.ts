/**
 * Hook Unificado para acesso COMPLETO aos dados do Meta Ads
 *
 * Gerencia:
 * - Campanhas, Ad Sets, Ads (estrutura)
 * - Métricas agregadas (RPC)
 * - Cache otimizado
 * - Sincronização
 * - Invalidação centralizada
 *
 * USO:
 * ```typescript
 * const {
 *   campaigns,
 *   adSets,
 *   ads,
 *   metrics,
 *   isLoading,
 *   sync,
 *   invalidateAll,
 * } = useMetaAdsData({
 *   accountId: 'uuid',
 *   campaignId: 'uuid',
 *   adSetId: 'uuid',
 *   dateRange: { from: Date, to: Date },
 * });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveOrganization } from './useActiveOrganization';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface MetaAdsFilters {
  accountId?: string;
  campaignId?: string;
  adSetId?: string;
  dateRange: { from: Date; to: Date };
}

export interface Campaign {
  id: string;
  external_id: string;
  name: string;
  objective?: string;
  status: string;
  ad_account_id: string;
}

export interface AdSet {
  id: string;
  external_id: string;
  campaign_id: string;
  name: string;
  status: string;
  optimization_goal?: string;
  targeting?: any;
  daily_budget?: number;
  lifetime_budget?: number;
}

export interface Ad {
  id: string;
  external_id: string;
  ad_set_id: string;
  campaign_id: string;
  name: string;
  status: string;
  creative_type?: string;
  title?: string;
  body?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
}

export interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  cpl: number;
  cpm: number;
  cpc: number;
  ctr: number;
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

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useMetaAdsData = (filters: MetaAdsFilters) => {
  const { data: org } = useActiveOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ==========================================================================
  // 1. CAMPANHAS
  // ==========================================================================
  const campaigns = useQuery({
    queryKey: ['meta-campaigns', filters.accountId, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('ad_campaigns')
        .select('*, ad_accounts!inner(organization_id, business_name, external_id)')
        .eq('ad_accounts.organization_id', org!.id)
        .order('created_at', { ascending: false });

      if (filters.accountId) {
        query = query.eq('ad_account_id', filters.accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Campaign[];
    },
    enabled: !!org?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - estrutura não muda frequentemente
    gcTime: 30 * 60 * 1000, // 30 minutos (antes era cacheTime)
  });

  // ==========================================================================
  // 2. AD SETS
  // ==========================================================================
  const adSets = useQuery({
    queryKey: ['meta-ad-sets', filters.campaignId, org?.id],
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
        .eq('ad_campaigns.ad_accounts.organization_id', org!.id)
        .order('created_at', { ascending: false });

      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AdSet[];
    },
    enabled: !!org?.id && !!filters.campaignId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ==========================================================================
  // 3. ADS (CRIATIVOS)
  // ==========================================================================
  const ads = useQuery({
    queryKey: ['meta-ads', filters.adSetId, filters.campaignId, org?.id],
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
        .eq('ad_sets.ad_campaigns.ad_accounts.organization_id', org!.id)
        .order('created_at', { ascending: false });

      if (filters.adSetId) {
        query = query.eq('ad_set_id', filters.adSetId);
      } else if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ad[];
    },
    enabled: !!org?.id && (!!filters.adSetId || !!filters.campaignId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ==========================================================================
  // 4. MÉTRICAS AGREGADAS (TODAS DE UMA VEZ)
  // ==========================================================================
  const metrics = useQuery({
    queryKey: ['meta-metrics-all', filters, org?.id],
    queryFn: async () => {
      const startDate = filters.dateRange.from.toISOString().split('T')[0];
      const endDate = filters.dateRange.to.toISOString().split('T')[0];

      // Buscar métricas de campanhas (sempre)
      const { data: campaignMetrics } = await supabase.rpc('get_campaign_metrics', {
        p_account_id: filters.accountId || null,
        p_campaign_id: filters.campaignId || null,
        p_start_date: startDate,
        p_end_date: endDate,
      }).catch(() => ({ data: [] }));

      // Buscar métricas de ad sets (se campanha selecionada)
      const { data: adSetMetrics } = filters.campaignId
        ? await supabase.rpc('get_ad_set_metrics', {
            p_account_id: filters.accountId || null,
            p_campaign_id: filters.campaignId || null,
            p_ad_set_id: filters.adSetId || null,
            p_start_date: startDate,
            p_end_date: endDate,
          }).catch(() => ({ data: [] }))
        : { data: [] };

      // Buscar métricas de ads (se campanha ou ad set selecionado)
      const { data: adMetrics } = (filters.campaignId || filters.adSetId)
        ? await supabase.rpc('get_ad_metrics', {
            p_account_id: filters.accountId || null,
            p_campaign_id: filters.campaignId || null,
            p_ad_set_id: filters.adSetId || null,
            p_start_date: startDate,
            p_end_date: endDate,
          }).catch(() => ({ data: [] }))
        : { data: [] };

      return {
        campaigns: (campaignMetrics || []) as CampaignMetrics[],
        adSets: (adSetMetrics || []) as AdSetMetrics[],
        ads: (adMetrics || []) as AdMetrics[],
      };
    },
    enabled: !!org?.id && !!filters.dateRange,
    staleTime: 2 * 60 * 1000, // Métricas: 2 minutos (mais volátil)
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // ==========================================================================
  // 5. RESUMO GERAL (KPIs)
  // ==========================================================================
  const summary = useMemo(() => {
    if (!metrics.data) return null;

    const allCampaigns = metrics.data.campaigns;

    const totalSpend = allCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalImpressions = allCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = allCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalLeads = allCampaigns.reduce((sum, c) => sum + (c.leads_count || 0), 0);

    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      leads_count: totalLeads,
      cpl: avgCPL,
      cpm: avgCPM,
      cpc: avgCPC,
      ctr: avgCTR,
    };
  }, [metrics.data]);

  // ==========================================================================
  // 6. SINCRONIZAÇÃO COMPLETA
  // ==========================================================================
  const sync = useMutation({
    mutationFn: async ({
      syncStructure = true,
      syncMetrics = true,
    }: {
      syncStructure?: boolean;
      syncMetrics?: boolean;
    }) => {
      const accountIds = filters.accountId ? [filters.accountId] : undefined;
      const campaignIds = filters.campaignId ? [filters.campaignId] : undefined;

      const results = {
        adSets: 0,
        ads: 0,
        adSetInsights: 0,
        adInsights: 0,
      };

      // Sincronizar estrutura
      if (syncStructure) {
        // Ad Sets
        const { data: adSetsResult } = await supabase.functions.invoke('sync-ad-sets', {
          body: { ad_account_ids: accountIds, campaign_ids: campaignIds },
        });
        results.adSets = adSetsResult?.synced_ad_sets || 0;

        // Aguardar 1s (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ads
        const { data: adsResult } = await supabase.functions.invoke('sync-ads', {
          body: { ad_account_ids: accountIds, campaign_ids: campaignIds },
        });
        results.ads = adsResult?.synced_ads || 0;

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Sincronizar métricas
      if (syncMetrics) {
        const since = filters.dateRange.from.toISOString().split('T')[0];
        const until = filters.dateRange.to.toISOString().split('T')[0];

        // Ad Set Insights
        await supabase.functions.invoke('sync-adset-insights', {
          body: { since, until, ad_account_ids: accountIds, campaign_ids: campaignIds },
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ad Insights
        await supabase.functions.invoke('sync-ad-insights', {
          body: { since, until, ad_account_ids: accountIds, campaign_ids: campaignIds },
        });
      }

      return results;
    },
    onSuccess: (results) => {
      // Invalidar todas as queries
      queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['meta-ad-sets'] });
      queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
      queryClient.invalidateQueries({ queryKey: ['meta-metrics-all'] });

      toast({
        title: '✅ Sincronização Completa',
        description: `${results.adSets} conjuntos, ${results.ads} criativos sincronizados.`,
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Erro na Sincronização',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  // ==========================================================================
  // 7. UTILIDADES
  // ==========================================================================

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['meta-campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['meta-ad-sets'] });
    queryClient.invalidateQueries({ queryKey: ['meta-ads'] });
    queryClient.invalidateQueries({ queryKey: ['meta-metrics-all'] });
  };

  const refetchAll = () => {
    campaigns.refetch();
    adSets.refetch();
    ads.refetch();
    metrics.refetch();
  };

  // Status consolidado
  const isLoading = campaigns.isLoading || adSets.isLoading || ads.isLoading || metrics.isLoading;
  const isError = campaigns.isError || adSets.isError || ads.isError || metrics.isError;
  const isSyncing = sync.isPending;

  // ==========================================================================
  // RETORNO
  // ==========================================================================

  return {
    // Dados estruturais
    campaigns: campaigns.data || [],
    adSets: adSets.data || [],
    ads: ads.data || [],

    // Métricas
    metrics: metrics.data,
    summary,

    // Status
    isLoading,
    isError,
    isSyncing,

    // Ações
    sync: sync.mutateAsync,
    invalidateAll,
    refetchAll,
  };
};

// ============================================================================
// HOOK AUXILIAR: Apenas Summary (otimizado para dashboard)
// ============================================================================

export const useMetaAdsSummary = (filters: Pick<MetaAdsFilters, 'accountId' | 'campaignId' | 'dateRange'>) => {
  const { data: org } = useActiveOrganization();

  return useQuery({
    queryKey: ['meta-summary', filters, org?.id],
    queryFn: async () => {
      const startDate = filters.dateRange.from.toISOString().split('T')[0];
      const endDate = filters.dateRange.to.toISOString().split('T')[0];

      const { data } = await supabase.rpc('get_campaign_metrics', {
        p_account_id: filters.accountId || null,
        p_campaign_id: filters.campaignId || null,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      const campaigns = (data || []) as CampaignMetrics[];

      const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads_count || 0), 0);

      return {
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        leads_count: totalLeads,
        cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      };
    },
    enabled: !!org?.id && !!filters.dateRange,
    staleTime: 2 * 60 * 1000,
  });
};
