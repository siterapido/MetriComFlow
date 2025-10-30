import { supabase } from "@/lib/supabase";
import type { CurrencyFormatOptions } from "@/lib/formatters";

export type MetaMetricsFilters = {
  period?: string;
  accountId?: string;
  campaignId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
};

export type MetaPrimaryMetric = {
  id: string;
  label: string;
  value: number;
  formatter: "integer" | "currency" | "percentage";
  prefix?: string;
  suffix?: string;
  currencyOptions?: CurrencyFormatOptions;
};

export type MetaEngagementStage = {
  id: string;
  label: string;
  value: number;
};

export type MetaCreativePerformance = {
  id: string;
  name: string;
  uniqueCtr: number;
  impressions: number;
  spend?: number;
};

export type MetaCampaignOverviewRow = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  uniqueCtr: number;
  uniqueCtrRate: number;
  spend?: number;
};

export type MetaInvestmentSlice = {
  id: string;
  label: string;
  value: number;
};

export type MetaInvestmentTimelinePoint = {
  date: string;
  investment: number;
  uniqueCtr: number;
};

export type MetaSummary = {
  primary: MetaPrimaryMetric[];
  cost: MetaPrimaryMetric[];
  funnel: MetaEngagementStage[];
  updatedAt: string;
};

type DateRange = { start: string; end: string };

type CampaignRecord = {
  id: string;
  name: string;
  objective: string | null;
  status: string | null;
  ad_account_id: string;
  ad_accounts?: { id: string; business_name: string | null; is_active: boolean | null } | null;
};

type InsightRecord = {
  campaign_id: string;
  date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  leads_count: number | null;
};

type LeadRecord = {
  id: string;
  status: string;
  value: number | null;
  campaign_id: string | null;
  created_at: string | null;
};

const BRL_OPTIONS: CurrencyFormatOptions = { currency: "BRL", locale: "pt-BR" };
const PIPELINE_STATUSES = new Set(["qualificacao", "proposta", "negociacao"]);
const LOST_STATUS = "fechado_perdido";
const WON_STATUS = "fechado_ganho";

function resolveDateRange(filters?: MetaMetricsFilters): DateRange {
  if (filters?.dateRange?.start && filters?.dateRange?.end) {
    return filters.dateRange;
  }

  const period = Number.parseInt(filters?.period ?? "90", 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(period - 1, 0));

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatDateLabel(isoDate: string, locale = "pt-BR"): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const date = new Date(`${isoDate}T00:00:00Z`);
  return formatter.format(date);
}

async function loadCampaigns(filters?: MetaMetricsFilters) {
  let campaignQuery = supabase
    .from("ad_campaigns")
    .select(
      `
        id,
        name,
        objective,
        status,
        ad_account_id,
        ad_accounts!inner(id, business_name, is_active)
      `,
    )
    .eq("ad_accounts.is_active", true);

  if (filters?.campaignId) {
    campaignQuery = campaignQuery.eq("id", filters.campaignId);
  } else if (filters?.accountId) {
    campaignQuery = campaignQuery.eq("ad_account_id", filters.accountId);
  }

  const { data, error } = await campaignQuery;
  if (error) throw error;
  return (data ?? []) as CampaignRecord[];
}

async function loadInsights(campaignIds: string[], range: DateRange) {
  if (campaignIds.length === 0) return [] as InsightRecord[];

  const { data, error } = await supabase
    .from("campaign_daily_insights")
    .select("campaign_id, date, spend, impressions, clicks, leads_count")
    .in("campaign_id", campaignIds)
    .gte("date", range.start)
    .lte("date", range.end);

  if (error) throw error;
  return (data ?? []) as InsightRecord[];
}

async function loadLeads(campaignIds: string[], range: DateRange) {
  if (campaignIds.length === 0) return [] as LeadRecord[];

  const { data, error } = await supabase
    .from("leads")
    .select("id, status, value, campaign_id, created_at")
    .eq("source", "meta_ads")
    .in("campaign_id", campaignIds)
    .gte("created_at", `${range.start}T00:00:00Z`)
    .lte("created_at", `${range.end}T23:59:59Z`);

  if (error) throw error;
  return (data ?? []) as LeadRecord[];
}

function aggregateCampaignMetrics(campaigns: CampaignRecord[], insights: InsightRecord[]) {
  const totals = new Map<string, {
    campaign: CampaignRecord;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
  }>();

  for (const campaign of campaigns) {
    totals.set(campaign.id, {
      campaign,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
    });
  }

  for (const insight of insights) {
    const target = totals.get(insight.campaign_id);
    if (!target) continue;
    target.spend += Number(insight.spend ?? 0);
    target.impressions += Number(insight.impressions ?? 0);
    target.clicks += Number(insight.clicks ?? 0);
    target.leads += Number(insight.leads_count ?? 0);
  }

  return totals;
}

function summariseLeads(leads: LeadRecord[]) {
  let pipelineCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let wonValue = 0;

  for (const lead of leads) {
    if (PIPELINE_STATUSES.has(lead.status)) {
      pipelineCount += 1;
    } else if (lead.status === WON_STATUS) {
      wonCount += 1;
      wonValue += Number(lead.value ?? 0);
    } else if (lead.status === LOST_STATUS) {
      lostCount += 1;
    }
  }

  return {
    total: leads.length,
    pipelineCount,
    wonCount,
    lostCount,
    wonValue,
  };
}

export async function fetchMetaSummary(filters: MetaMetricsFilters = {}): Promise<MetaSummary> {
  const range = resolveDateRange(filters);
  const campaigns = await loadCampaigns(filters);
  if (!campaigns.length) {
    return { primary: [], cost: [], funnel: [], updatedAt: new Date().toISOString() };
  }

  const campaignIds = campaigns.map((c) => c.id);
  const [insights, leads] = await Promise.all([
    loadInsights(campaignIds, range),
    loadLeads(campaignIds, range),
  ]);

  const totals = aggregateCampaignMetrics(campaigns, insights);

  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalLeadsFromInsights = 0;

  for (const value of totals.values()) {
    totalSpend += value.spend;
    totalImpressions += value.impressions;
    totalClicks += value.clicks;
    totalLeadsFromInsights += value.leads;
  }

  const leadSummary = summariseLeads(leads);
  const leadsTotal = leadSummary.total > 0 ? leadSummary.total : totalLeadsFromInsights;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const cpl = leadsTotal > 0 ? totalSpend / leadsTotal : 0;
  const roas = totalSpend > 0 ? leadSummary.wonValue / totalSpend : 0;

  const primary: MetaPrimaryMetric[] = [
    {
      id: "spend",
      label: "Investimento",
      value: totalSpend,
      formatter: "currency",
      currencyOptions: BRL_OPTIONS,
    },
    {
      id: "leads",
      label: "Leads gerados",
      value: leadsTotal,
      formatter: "integer",
    },
    {
      id: "roas",
      label: "ROAS",
      value: Number.isFinite(roas) && roas > 0 ? roas : 0,
      formatter: "integer",
      suffix: "x",
    },
  ];

  const cost: MetaPrimaryMetric[] = [
    {
      id: "cpl",
      label: "Custo por Lead",
      value: Number.isFinite(cpl) ? cpl : 0,
      formatter: "currency",
      currencyOptions: BRL_OPTIONS,
    },
    {
      id: "cpc",
      label: "Custo por Clique",
      value: Number.isFinite(cpc) ? cpc : 0,
      formatter: "currency",
      currencyOptions: BRL_OPTIONS,
    },
    {
      id: "ctr",
      label: "CTR",
      value: Number.isFinite(ctr) ? ctr : 0,
      formatter: "percentage",
    },
  ];

  const funnel: MetaEngagementStage[] = [
    { id: "captured", label: "Leads capturados", value: leadsTotal },
    { id: "pipeline", label: "Em negociação", value: leadSummary.pipelineCount },
    { id: "won", label: "Fechados", value: leadSummary.wonCount },
  ];

  if (leadSummary.lostCount > 0) {
    funnel.push({ id: "lost", label: "Perdidos", value: leadSummary.lostCount });
  }

  return {
    primary,
    cost,
    funnel,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchCreativeRanking(filters: MetaMetricsFilters = {}): Promise<MetaCreativePerformance[]> {
  const range = resolveDateRange(filters);
  const campaigns = await loadCampaigns(filters);
  const campaignIds = campaigns.map((c) => c.id);
  if (!campaignIds.length) return [];

  const insights = await loadInsights(campaignIds, range);
  const totals = aggregateCampaignMetrics(campaigns, insights);

  const performances: MetaCreativePerformance[] = [];
  for (const { campaign, impressions, clicks, spend } of totals.values()) {
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    performances.push({
      id: campaign.id,
      name: campaign.name,
      impressions,
      uniqueCtr: Number.isFinite(ctr) ? ctr : 0,
      spend,
    });
  }

  return performances.sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)).slice(0, 10);
}

export async function fetchCampaignOverview(filters: MetaMetricsFilters = {}): Promise<MetaCampaignOverviewRow[]> {
  const range = resolveDateRange(filters);
  const campaigns = await loadCampaigns(filters);
  const campaignIds = campaigns.map((c) => c.id);
  if (!campaignIds.length) return [];

  const insights = await loadInsights(campaignIds, range);
  const totals = aggregateCampaignMetrics(campaigns, insights);

  const overview: MetaCampaignOverviewRow[] = [];
  for (const { campaign, spend, impressions, clicks, leads } of totals.values()) {
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    overview.push({
      id: campaign.id,
      name: campaign.name,
      impressions,
      clicks,
      spend,
      cpc: Number.isFinite(cpc) ? cpc : 0,
      cpm: Number.isFinite(cpm) ? cpm : 0,
      uniqueCtr: Number.isFinite(ctr) ? ctr : 0,
      uniqueCtrRate: leads,
    });
  }

  return overview.sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
}

export async function fetchInvestmentTimeline(filters: MetaMetricsFilters = {}): Promise<MetaInvestmentTimelinePoint[]> {
  const range = resolveDateRange(filters);
  const campaigns = await loadCampaigns(filters);
  const campaignIds = campaigns.map((c) => c.id);
  if (!campaignIds.length) return [];

  const insights = await loadInsights(campaignIds, range);
  const grouped = new Map<string, { spend: number; impressions: number; clicks: number }>();

  for (const insight of insights) {
    if (!grouped.has(insight.date)) {
      grouped.set(insight.date, { spend: 0, impressions: 0, clicks: 0 });
    }
    const aggregate = grouped.get(insight.date)!;
    aggregate.spend += Number(insight.spend ?? 0);
    aggregate.impressions += Number(insight.impressions ?? 0);
    aggregate.clicks += Number(insight.clicks ?? 0);
  }

  return Array.from(grouped.entries())
    .map(([date, value]) => {
      const ctr = value.impressions > 0 ? (value.clicks / value.impressions) * 100 : 0;
      return {
        date,
        investment: value.spend,
        uniqueCtr: Number.isFinite(ctr) ? ctr : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchInvestmentSlices(filters: MetaMetricsFilters = {}): Promise<MetaInvestmentSlice[]> {
  const range = resolveDateRange(filters);
  const campaigns = await loadCampaigns(filters);
  const campaignIds = campaigns.map((c) => c.id);
  if (!campaignIds.length) return [];

  const insights = await loadInsights(campaignIds, range);
  if (!insights.length) return [];

  const grouped = new Map<string, number>();
  let totalSpend = 0;

  for (const insight of insights) {
    const spend = Number(insight.spend ?? 0);
    totalSpend += spend;
    grouped.set(insight.date, (grouped.get(insight.date) ?? 0) + spend);
  }

  if (totalSpend === 0) return [];

  const slices = Array.from(grouped.entries())
    .map(([date, spend]) => ({
      id: date,
      label: formatDateLabel(date),
      value: (spend / totalSpend) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  if (slices.length <= 8) {
    return slices;
  }

  const topSlices = slices.slice(0, 8);
  const othersValue = slices.slice(8).reduce((sum, slice) => sum + slice.value, 0);
  topSlices.push({ id: "others", label: "Outros", value: othersValue });
  return topSlices;
}
