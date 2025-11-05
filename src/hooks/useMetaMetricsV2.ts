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

// Helper: último N dias
const getLastNDaysDateRange = (days: number): { start: string; end: string } => {
  const now = new Date()
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startStr = start.toISOString().split('T')[0]
  const endStr = now.toISOString().split('T')[0]
  return { start: startStr, end: endStr }
}

const DEFAULT_FILTERS: Required<Pick<MetaMetricsFilters, "dateRange" | "period">> = {
  period: "30",
  dateRange: getLastNDaysDateRange(30),
};

const buildFilters = (filters?: MetaMetricsFilters): MetaMetricsFilters => {
  if (!filters) return DEFAULT_FILTERS;
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    dateRange: filters.dateRange ?? DEFAULT_FILTERS.dateRange,
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
