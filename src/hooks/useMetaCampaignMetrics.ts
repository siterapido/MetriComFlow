
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export interface CampaignMetricsParams {
  dateRange?: DateRange;
  accountId?: string;
  campaignId?: string;
}

const fetchCampaignMetrics = async ({
  dateRange,
  accountId,
  campaignId,
  orgId,
}: CampaignMetricsParams & { orgId?: string }) => {
  const today = new Date();
  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(subDays(today, 30), "yyyy-MM-dd");
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(today, "yyyy-MM-dd");

  const rpcParams = {
    p_start_date: startDate,
    p_end_date: endDate,
    ...(accountId && { p_account_id: accountId }),
    ...(campaignId && { p_campaign_id: campaignId }),
  };

  const { data, error } = await supabase.rpc("get_ad_metrics", rpcParams);

  if (!error && Array.isArray(data) && data.length > 0) return data;

  // Fallback 1: tentar get_ad_set_metrics
  try {
    const { data: fallbackData, error: fallbackError } = await supabase.rpc("get_ad_set_metrics", rpcParams);
    if (!fallbackError && Array.isArray(fallbackData) && fallbackData.length > 0) return fallbackData;
  } catch (_) {}

  // Fallback 2: agregar diretamente campaign_daily_insights por campanha com escopo de organização
  try {
    let q = supabase
      .from("campaign_daily_insights")
      .select(`
        campaign_id,
        date,
        spend,
        impressions,
        clicks,
        leads_count,
        ad_campaigns!inner(name, ad_account_id, ad_accounts!inner(organization_id))
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .limit(50000);
    if (orgId) q = q.eq("ad_campaigns.ad_accounts.organization_id", orgId);
    if (campaignId) q = q.eq("campaign_id", campaignId);
    else if (accountId) q = q.eq("ad_campaigns.ad_account_id", accountId);
    const { data: rows, error: qErr } = await q;
    if (qErr) return [];
    if (!rows || rows.length === 0) return [];
    const agg = new Map<string, any>();
    for (const r of rows as any[]) {
      const id = r.campaign_id as string;
      const cur = agg.get(id) ?? { id, name: r.ad_campaigns?.name ?? "—", impressions: 0, clicks: 0, spend: 0 };
      cur.impressions += Number(r.impressions ?? 0);
      cur.clicks += Number(r.clicks ?? 0);
      cur.spend += Number(r.spend ?? 0);
      agg.set(id, cur);
    }
    const mapped = Array.from(agg.values()).map((m) => ({
      id: m.id,
      name: m.name,
      impressions: m.impressions,
      clicks: m.clicks,
      cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
      cpm: m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      unique_ctr_rate: 0,
    }));
    return mapped;
  } catch (_) {
    return [];
  }
};

export const useMetaCampaignOverviewMetrics = (
  params: CampaignMetricsParams,
  options: { enabled: boolean }
) => {
  const { data: org } = useActiveOrganization();
  return useQuery({
    queryKey: ["metaCampaignOverview", params.dateRange, params.accountId, params.campaignId, org?.id],
    queryFn: () => fetchCampaignMetrics({ ...params, orgId: org?.id }),
    enabled: options.enabled,
    staleTime: 0,
  });
};
