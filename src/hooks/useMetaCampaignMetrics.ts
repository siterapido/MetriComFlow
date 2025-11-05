
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";

export interface CampaignMetricsParams {
  dateRange?: DateRange;
  accountId?: string;
  campaignId?: string;
}

const fetchCampaignMetrics = async ({
  dateRange,
  accountId,
  campaignId,
}: CampaignMetricsParams) => {
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

  if (error) {
    // Fallback: função pode não existir no projeto atual. Tenta usar get_ad_set_metrics.
    console.warn("get_ad_metrics indisponível. Tentando fallback para get_ad_set_metrics.", error);
    const { data: fallbackData, error: fallbackError } = await supabase.rpc("get_ad_set_metrics", rpcParams);
    if (fallbackError) {
      console.error("Erro no fallback get_ad_set_metrics:", fallbackError);
      throw new Error(fallbackError.message);
    }
    return fallbackData;
  }

  return data;
};

export const useMetaCampaignOverviewMetrics = (
  params: CampaignMetricsParams,
  options: { enabled: boolean }
) => {
  return useQuery({
    queryKey: ["metaCampaignOverview", params.dateRange, params.accountId, params.campaignId],
    queryFn: () => fetchCampaignMetrics(params),
    enabled: options.enabled,
  });
};
