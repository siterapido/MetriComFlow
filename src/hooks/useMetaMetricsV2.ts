import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCampaignOverview,
  fetchCreativeRanking,
  fetchInvestmentSlices,
  fetchInvestmentTimeline,
  fetchMetaSummary,
  type MetaMetricsFilters,
} from "@/lib/metaMetrics";

const DEFAULT_PERIOD = "90";

const getDateRangeForPeriod = (period: string) => {
  const days = Number.parseInt(period, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(days - 1, 0));

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const buildFilters = (filters?: MetaMetricsFilters): MetaMetricsFilters => {
  const period = filters?.period ?? DEFAULT_PERIOD;
  const dateRange = filters?.dateRange ?? getDateRangeForPeriod(period);

  return {
    ...filters,
    period,
    dateRange,
  };
};

type QueryConfig = {
  enabled?: boolean;
};

export function useMetaSummary(
  filters?: MetaMetricsFilters,
  config?: QueryConfig,
) {
  const mergedFilters = useMemo(() => buildFilters(filters), [filters]);

  return useQuery({
    queryKey: ["meta-summary", mergedFilters],
    queryFn: () => fetchMetaSummary(mergedFilters),
    enabled: config?.enabled ?? true,
  });
}

export function useMetaCreativeRanking(
  filters?: MetaMetricsFilters,
  config?: QueryConfig,
) {
  const mergedFilters = useMemo(() => buildFilters(filters), [filters]);

  return useQuery({
    queryKey: ["meta-creative-ranking", mergedFilters],
    queryFn: () => fetchCreativeRanking(mergedFilters),
    enabled: config?.enabled ?? true,
  });
}

export function useMetaCampaignOverview(
  filters?: MetaMetricsFilters,
  config?: QueryConfig,
) {
  const mergedFilters = useMemo(() => buildFilters(filters), [filters]);

  return useQuery({
    queryKey: ["meta-campaign-overview", mergedFilters],
    queryFn: () => fetchCampaignOverview(mergedFilters),
    enabled: config?.enabled ?? true,
  });
}

export function useMetaInvestmentTimeline(
  filters?: MetaMetricsFilters,
  config?: QueryConfig,
) {
  const mergedFilters = useMemo(() => buildFilters(filters), [filters]);

  return useQuery({
    queryKey: ["meta-investment-timeline", mergedFilters],
    queryFn: () => fetchInvestmentTimeline(mergedFilters),
    enabled: config?.enabled ?? true,
  });
}

export function useMetaInvestmentSlices(
  filters?: MetaMetricsFilters,
  config?: QueryConfig,
) {
  const mergedFilters = useMemo(() => buildFilters(filters), [filters]);

  return useQuery({
    queryKey: ["meta-investment-slices", mergedFilters],
    queryFn: () => fetchInvestmentSlices(mergedFilters),
    enabled: config?.enabled ?? true,
  });
}
