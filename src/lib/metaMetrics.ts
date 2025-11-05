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
  image_url?: string;
  thumbnail_url?: string;
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
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+1",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+1",
  },
  {
    id: "creative-02",
    name: "video story - Vídeo novo",
    uniqueCtr: 109.66,
    impressions: 98_897,
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+2",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+2",
  },
  {
    id: "creative-03",
    name: "[Estático 01][Iphone 15]",
    uniqueCtr: 167.61,
    impressions: 89_890,
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+3",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+3",
  },
  {
    id: "creative-04",
    name: "[video ipad]",
    uniqueCtr: 94.35,
    impressions: 58_150,
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+4",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+4",
  },
  {
    id: "creative-05",
    name: "Novo anúncio de Engajamento",
    uniqueCtr: 12.60,
    impressions: 23_150,
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+5",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+5",
  },
  {
    id: "creative-06",
    name: "Novo anúncio de Integração",
    uniqueCtr: 65.58,
    impressions: 17_492,
    image_url: "https://via.placeholder.com/400x400.png?text=Creative+6",
    thumbnail_url: "https://via.placeholder.com/150x150.png?text=Creative+6",
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

// Mock data (será substituído pela busca real no Supabase)
const mockCreatives: MetaCreativePerformance[] = [
  {
    id: '1',
    name: 'Criativo 1: Imagem de um consultório moderno',
    uniqueCtr: 1.8,
    impressions: 15000,
    image_url: 'https://via.placeholder.com/400x400.png?text=Criativo+1',
    thumbnail_url: 'https://via.placeholder.com/150x150.png?text=Criativo+1',
  },
  {
    id: '2',
    name: 'Criativo 2: Vídeo de depoimento de paciente',
    uniqueCtr: 2.5,
    impressions: 25000,
    image_url: 'https://via.placeholder.com/400x400.png?text=Criativo+2',
    thumbnail_url: 'https://via.placeholder.com/150x150.png?text=Criativo+2',
  },
  {
    id: '3',
    name: 'Criativo 3: Carrossel de antes e depois',
    uniqueCtr: 3.1,
    impressions: 18000,
    image_url: 'https://via.placeholder.com/400x400.png?text=Criativo+3',
    thumbnail_url: 'https://via.placeholder.com/150x150.png?text=Criativo+3',
  },
  {
    id: '4',
    name: 'Criativo 4: Oferta especial de clareamento',
    uniqueCtr: 1.5,
    impressions: 32000,
    image_url: 'https://via.placeholder.com/400x400.png?text=Criativo+4',
    thumbnail_url: 'https://via.placeholder.com/150x150.png?text=Criativo+4',
  },
];

/**
 * Busca o ranking de performance de criativos de uma conta de anúncios.
 * @param {string} adAccountId - O ID da conta de anúncios.
 * @param {string} dateRange - O período de análise (ex: 'last_30_days').
 * @returns {Promise<MetaCreativePerformance[]>}
 */
export const fetchCreativeRanking = async (
  adAccountId: string,
  dateRange: string,
): Promise<MetaCreativePerformance[]> => {
  console.log(
    `Buscando ranking de criativos para a conta ${adAccountId} no período ${dateRange}...`,
  );

  const { startDate, endDate } = (() => {
    const now = new Date();
    if (dateRange === 'last_7_days') {
      const startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      return { startDate, endDate: now };
    }
    const startDate = new Date();
    startDate.setDate(now.getDate() - 30);
    return { startDate, endDate: now };
  })();

  // Etapa 1: Buscar campanhas da conta
  const { data: campaignsData, error: campaignsError } = await supabase
    .from('ad_campaigns')
    .select('id')
    .eq('ad_account_id', adAccountId);

  if (campaignsError) {
    console.error('Erro ao buscar campanhas:', campaignsError);
    throw new Error(`Falha ao buscar campanhas: ${campaignsError.message}`);
  }

  const campaignIds = campaignsData.map((c: any) => c.id);

  if (campaignIds.length === 0) {
    return [];
  }

  // Etapa 2: Buscar conjuntos de anúncios das campanhas
  const { data: adSetsData, error: adSetsError } = await supabase
    .from('ad_sets')
    .select('id')
    .in('campaign_id', campaignIds);

  if (adSetsError) {
    console.error('Erro ao buscar conjuntos de anúncios:', adSetsError);
    throw new Error(
      `Falha ao buscar conjuntos de anúncios: ${adSetsError.message}`,
    );
  }

  const adSetIds = adSetsData.map((as: any) => as.id);

  if (adSetIds.length === 0) {
    return [];
  }

  // Etapa 3: Buscar anúncios dos conjuntos de anúncios
  const { data: adsData, error: adsError } = await supabase
    .from('ads')
    .select('id')
    .in('ad_set_id', adSetIds);

  if (adsError) {
    console.error('Erro ao buscar anúncios:', adsError);
    throw new Error(`Falha ao buscar anúncios: ${adsError.message}`);
  }

  const adIds = adsData.map((ad: any) => ad.id);

  if (adIds.length === 0) {
    return [];
  }

  // Etapa 4: Buscar os insights diários para os ad_ids encontrados
  const { data, error } = await supabase
    .from('ad_daily_insights')
    .select(
      `
      date,
      spend,
      impressions,
      clicks,
      ads (
        id,
        name,
        status,
        creative_type,
        thumbnail_url,
        image_url
      )
    `,
    )
    .in('ad_id', adIds)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Erro ao buscar insights de criativos:', error);
    throw new Error(`Falha ao buscar dados de criativos: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  const creativeMetrics = data.reduce(
    (acc, insight) => {
      const ad = insight.ads;
      if (!ad) return acc;

      if (!acc[ad.id]) {
        acc[ad.id] = {
          id: ad.id,
          name: ad.name,
          impressions: 0,
          clicks: 0,
          spend: 0,
          image_url: ad.image_url,
          thumbnail_url: ad.thumbnail_url,
        };
      }

      acc[ad.id].impressions += insight.impressions || 0;
      acc[ad.id].clicks += insight.clicks || 0;
      acc[ad.id].spend += parseFloat(insight.spend || '0');

      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        name: string;
        impressions: number;
        clicks: number;
        spend: number;
        image_url: string | null;
        thumbnail_url: string | null;
      }
    >,
  );

  const creativeRanking: MetaCreativePerformance[] = Object.values(
    creativeMetrics,
  ).map(metric => ({
    ...metric,
    uniqueCtr:
      metric.impressions > 0
        ? (metric.clicks / metric.impressions) * 100
        : 0,
  }));

  return creativeRanking.sort((a, b) => b.impressions - a.impressions);
};

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
