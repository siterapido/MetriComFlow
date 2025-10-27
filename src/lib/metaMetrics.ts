import type { CurrencyFormatOptions } from "@/lib/formatters";

/**
 * Shared filter contract for Meta metrics queries.
 * Keeps params serializable so hooks can memoize query keys.
 */
export type MetaMetricsFilters = {
  period?: string;
  accountId?: string;
  campaignId?: string;
  /**
   * ISO date range inclusive. When omitted we fall back to the
   * last 90 days to mirror the original Looker Studio snapshot.
   */
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
  /**
   * Optional helper so the UI can display contextual copy
   * (“Mensagens” render in plain text).
   */
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

/**
 * Mock dataset mirrors the Looker Studio screenshot shared by the user.
 * These structures allow us to iterate fast on the UI while the real API
 * is finalised. Replace with live data integration once the backend
 * endpoints are available.
 */
const mockSummary: MetaSummary = {
  primary: [
    {
      id: "messages",
      label: "Mensagens",
      value: 3533,
      formatter: "integer",
    },
    {
      id: "leadsCost",
      label: "Custo lead",
      value: 3.81,
      formatter: "currency",
      currencyOptions: { currency: "BRL", locale: "pt-BR" },
    },
    {
      id: "clicks",
      label: "Cliques",
      value: 5622,
      formatter: "integer",
    },
  ],
  cost: [
    {
      id: "uniqueCtr",
      label: "Unique CTR (Link Click-Through Rate)",
      value: 1.38,
      formatter: "percentage",
      suffix: "%",
    },
    {
      id: "cpc",
      label: "CPC",
      value: 2.45,
      formatter: "currency",
      currencyOptions: { currency: "BRL", locale: "pt-BR" },
    },
    {
      id: "cpm",
      label: "Custo Mil Imp. (CPM)",
      value: 19.92,
      formatter: "currency",
      currencyOptions: { currency: "BRL", locale: "pt-BR" },
    },
  ],
  funnel: [
    { id: "saved", label: "Salvaram", value: 1 },
    { id: "shared", label: "Compartilharam", value: 266 },
    { id: "commented", label: "Comentaram", value: 2 },
  ],
  updatedAt: "2025-10-27T16:10:50-03:00",
};

const mockCreatives: MetaCreativePerformance[] = [
  {
    id: "creative-01",
    name: "Estático 02 - entrada lacrados",
    uniqueCtr: 77.08,
    impressions: 105_469,
  },
  {
    id: "creative-02",
    name: "video story - Vídeo novo",
    uniqueCtr: 109.66,
    impressions: 98_897,
  },
  {
    id: "creative-03",
    name: "[Estático 01][Iphone 15]",
    uniqueCtr: 167.61,
    impressions: 89_890,
  },
  {
    id: "creative-04",
    name: "[video ipad]",
    uniqueCtr: 94.35,
    impressions: 58_150,
  },
  {
    id: "creative-05",
    name: "Novo anúncio de Engajamento",
    uniqueCtr: 12.60,
    impressions: 23_150,
  },
  {
    id: "creative-06",
    name: "Novo anúncio de Integração",
    uniqueCtr: 65.58,
    impressions: 17_492,
  },
];

const mockCampaigns: MetaCampaignOverviewRow[] = [
  {
    id: "campaign-01",
    name: "[engaj][msg] Campanha 01",
    impressions: 158_925,
    clicks: 1_551,
    cpc: 2.69,
    cpm: 21.91,
    uniqueCtr: 1.27,
    uniqueCtrRate: 312.84,
  },
  {
    id: "campaign-02",
    name: "[engaj][msg] Campanha 02",
    impressions: 151_322,
    clicks: 923,
    cpc: 2.56,
    cpm: 14.64,
    uniqueCtr: 0.86,
    uniqueCtrRate: 82.19,
  },
  {
    id: "campaign-03",
    name: "[mobile][msg] Stories",
    impressions: 87_410,
    clicks: 612,
    cpc: 2.92,
    cpm: 18.44,
    uniqueCtr: 0.71,
    uniqueCtrRate: 54.39,
  },
];

const mockInvestmentSlices: MetaInvestmentSlice[] = [
  { id: "2025-05-11", label: "11 de mai. de 2025", value: 12.6 },
  { id: "2025-04-21", label: "21 de abr. de 2025", value: 4.5 },
  { id: "2025-04-29", label: "29 de abr. de 2025", value: 3.8 },
  { id: "2025-04-20", label: "20 de abr. de 2025", value: 2.7 },
  { id: "2025-04-28", label: "28 de abr. de 2025", value: 2.1 },
  { id: "2025-01-17", label: "17 de jan. de 2025", value: 1.9 },
  { id: "2025-05-01", label: "1 de mai. de 2025", value: 1.5 },
  { id: "2025-05-02", label: "2 de mai. de 2025", value: 1.0 },
  { id: "others", label: "Outros", value: 82.9 },
];

const mockTimeline: MetaInvestmentTimelinePoint[] = [
  { date: "2025-04-20", investment: 4200, uniqueCtr: 0.9 },
  { date: "2025-04-27", investment: 5800, uniqueCtr: 1.1 },
  { date: "2025-05-04", investment: 6100, uniqueCtr: 1.3 },
  { date: "2025-05-11", investment: 7400, uniqueCtr: 1.38 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMetaSummary(filters: MetaMetricsFilters = {}): Promise<MetaSummary> {
  // Simulate async boundary so React Query behaves as expected.
  await delay(120);
  // Filters are currently unused with the mock set; keep signature to ease backend swap.
  void filters;
  return mockSummary;
}

export async function fetchCreativeRanking(
  filters: MetaMetricsFilters = {},
): Promise<MetaCreativePerformance[]> {
  await delay(120);
  void filters;
  return mockCreatives;
}

export async function fetchCampaignOverview(
  filters: MetaMetricsFilters = {},
): Promise<MetaCampaignOverviewRow[]> {
  await delay(140);
  void filters;
  return mockCampaigns;
}

export async function fetchInvestmentTimeline(
  filters: MetaMetricsFilters = {},
): Promise<MetaInvestmentTimelinePoint[]> {
  await delay(160);
  void filters;
  return mockTimeline;
}

export async function fetchInvestmentSlices(
  filters: MetaMetricsFilters = {},
): Promise<MetaInvestmentSlice[]> {
  await delay(80);
  void filters;
  return mockInvestmentSlices;
}
