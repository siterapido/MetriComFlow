import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useMemo } from "react";

export interface SalesRepPerformance {
  assignee_id: string;
  assignee_name: string;
  total_revenue: number;
  deals_won: number;
  deals_open: number;
  conversion_rate: number;
}

export interface ActivityMetric {
  type: string;
  count: number;
  user_name?: string;
}

export interface WinLossData {
  status: string;
  count: number;
  value: number;
  reason?: string;
}

interface DateRange {
  start: string;
  end: string;
}

export function useSalesDashboardMetrics(dateRange: DateRange) {
  const { data: org } = useActiveOrganization();

  // 1. Sales Performance (Revenue by Rep)
  const salesPerformanceQuery = useQuery({
    queryKey: ["sales-performance", org?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!org?.id) return [];

      // Fetch leads created or updated in the period, or active
      // For performance, we usually look at closed_won_at for revenue
      // and created_at for volume.
      // Let's look at leads that have ANY activity in the period or are open.
      // Simpler: Fetch all leads that are not 'archived' (if that existed)
      // For dashboard, we typically want "Results in this period".
      
      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, assignee_id, assignee_name, status, value, closed_won_at")
        .eq("organization_id", org.id)
        .gte("closed_won_at", dateRange.start)
        .lte("closed_won_at", dateRange.end)
        .eq("status", "fechado_ganho");

      if (error) throw error;

      // Aggregate by assignee
      const performanceMap = new Map<string, SalesRepPerformance>();

      leads?.forEach((lead) => {
        const id = lead.assignee_id || "unassigned";
        const name = lead.assignee_name || "Sem Responsável";
        
        const current = performanceMap.get(id) || {
          assignee_id: id,
          assignee_name: name,
          total_revenue: 0,
          deals_won: 0,
          deals_open: 0,
          conversion_rate: 0,
        };

        current.total_revenue += Number(lead.value || 0);
        current.deals_won += 1;
        
        performanceMap.set(id, current);
      });

      return Array.from(performanceMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!org?.id,
  });

  // 2. Activity Metrics (Interactions by Type)
  const activityQuery = useQuery({
    queryKey: ["activity-metrics", org?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!org?.id) return [];

      const { data: interactions, error } = await supabase
        .from("interactions")
        .select("interaction_type, user_name")
        .eq("organization_id", org.id)
        .gte("interaction_date", dateRange.start)
        .lte("interaction_date", dateRange.end);

      if (error) throw error;

      // Aggregate by type
      const typeMap = new Map<string, number>();
      
      interactions?.forEach((interaction) => {
        const type = interaction.interaction_type || "other";
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      return Array.from(typeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })).sort((a, b) => b.count - a.count);
    },
    enabled: !!org?.id,
  });

  // 3. Loss Reasons (Why deals are lost)
  const lossAnalysisQuery = useQuery({
    queryKey: ["loss-analysis", org?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!org?.id) return [];

      const { data: leads, error } = await supabase
        .from("leads")
        .select("lost_reason")
        .eq("organization_id", org.id)
        .eq("status", "fechado_perdido")
        .gte("updated_at", dateRange.start) // Assuming updated_at ~ lost time
        .lte("updated_at", dateRange.end);

      if (error) throw error;

      const reasonMap = new Map<string, number>();

      leads?.forEach((lead) => {
        const reason = lead.lost_reason || "Não especificado";
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      });

      return Array.from(reasonMap.entries()).map(([reason, count]) => ({
        reason,
        count,
      })).sort((a, b) => b.count - a.count);
    },
    enabled: !!org?.id,
  });

  return {
    salesPerformance: salesPerformanceQuery.data,
    activityMetrics: activityQuery.data,
    lossAnalysis: lossAnalysisQuery.data,
    isLoading: salesPerformanceQuery.isLoading || activityQuery.isLoading || lossAnalysisQuery.isLoading,
  };
}





