import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

// Hook para métricas de vendas
export function useSalesMetrics(period: 'month' | 'year' | { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['sales-metrics', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_metrics')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
  });
}

// Hook para vendas por período
export function useSalesByPeriod(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['sales-by-period', startDate, endDate],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          *,
          assignee:team_members(name)
        `)
        .eq('status', 'fechado_ganho')
        .gte('closed_won_at', startDate.toISOString())
        .lte('closed_won_at', endDate.toISOString());

      if (error) throw error;

      const totalSales = leads.length;
      const totalRevenue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const avgDealSize = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Agrupar por vendedor
      const salesByAssignee = leads.reduce((acc, lead) => {
        const assigneeName = lead.assignee?.name || 'Não atribuído';
        if (!acc[assigneeName]) {
          acc[assigneeName] = { count: 0, revenue: 0 };
        }
        acc[assigneeName].count++;
        acc[assigneeName].revenue += lead.value || 0;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      // Agrupar por origem
      const salesBySource = leads.reduce((acc, lead) => {
        const source = lead.source || 'Não informado';
        if (!acc[source]) {
          acc[source] = { count: 0, revenue: 0 };
        }
        acc[source].count++;
        acc[source].revenue += lead.value || 0;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      return {
        totalSales,
        totalRevenue,
        avgDealSize,
        salesByAssignee,
        salesBySource,
      };
    },
  });
}

// Hook para taxa de conversão por vendedor
export function useConversionRateByAssignee(period: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['conversion-rate-assignee', period],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          assignee_id,
          assignee_name,
          status,
          created_at
        `)
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());

      if (error) throw error;

      const conversionRates = leads.reduce((acc, lead) => {
        const assigneeName = lead.assignee_name || 'Não atribuído';
        if (!acc[assigneeName]) {
          acc[assigneeName] = { total: 0, converted: 0, rate: 0 };
        }
        acc[assigneeName].total++;
        if (lead.status === 'fechado_ganho') {
          acc[assigneeName].converted++;
        }
        return acc;
      }, {} as Record<string, { total: number; converted: number; rate: number }>);

      // Calcular taxa de conversão
      Object.keys(conversionRates).forEach(assignee => {
        const data = conversionRates[assignee];
        data.rate = data.total > 0 ? (data.converted / data.total) * 100 : 0;
      });

      return conversionRates;
    },
  });
}

// Hook para taxa de conversão por origem
export function useConversionRateBySource(period: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['conversion-rate-source', period],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          source,
          status,
          created_at
        `)
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());

      if (error) throw error;

      const conversionRates = leads.reduce((acc, lead) => {
        const source = lead.source || 'Não informado';
        if (!acc[source]) {
          acc[source] = { total: 0, converted: 0, rate: 0 };
        }
        acc[source].total++;
        if (lead.status === 'fechado_ganho') {
          acc[source].converted++;
        }
        return acc;
      }, {} as Record<string, { total: number; converted: number; rate: number }>);

      // Calcular taxa de conversão
      Object.keys(conversionRates).forEach(source => {
        const data = conversionRates[source];
        data.rate = data.total > 0 ? (data.converted / data.total) * 100 : 0;
      });

      return conversionRates;
    },
  });
}

// Hook para tempo médio de fechamento
export function useAverageSalesCycle(period: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['avg-sales-cycle', period],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          assignee_name,
          source,
          created_at,
          closed_won_at
        `)
        .eq('status', 'fechado_ganho')
        .gte('closed_won_at', period.start.toISOString())
        .lte('closed_won_at', period.end.toISOString())
        .not('closed_won_at', 'is', null);

      if (error) throw error;

      const salesCycles = leads.map(lead => {
        const createdAt = new Date(lead.created_at!);
        const closedAt = new Date(lead.closed_won_at!);
        const cycleDays = Math.ceil((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          assigneeName: lead.assignee_name || 'Não atribuído',
          source: lead.source || 'Não informado',
          cycleDays,
        };
      });

      // Calcular média geral
      const avgCycle = salesCycles.length > 0 
        ? salesCycles.reduce((sum, cycle) => sum + cycle.cycleDays, 0) / salesCycles.length 
        : 0;

      // Calcular média por vendedor
      const avgByAssignee = salesCycles.reduce((acc, cycle) => {
        if (!acc[cycle.assigneeName]) {
          acc[cycle.assigneeName] = { total: 0, count: 0, avg: 0 };
        }
        acc[cycle.assigneeName].total += cycle.cycleDays;
        acc[cycle.assigneeName].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number; avg: number }>);

      Object.keys(avgByAssignee).forEach(assignee => {
        const data = avgByAssignee[assignee];
        data.avg = data.count > 0 ? data.total / data.count : 0;
      });

      // Calcular média por origem
      const avgBySource = salesCycles.reduce((acc, cycle) => {
        if (!acc[cycle.source]) {
          acc[cycle.source] = { total: 0, count: 0, avg: 0 };
        }
        acc[cycle.source].total += cycle.cycleDays;
        acc[cycle.source].count++;
        return acc;
      }, {} as Record<string, { total: number; count: number; avg: number }>);

      Object.keys(avgBySource).forEach(source => {
        const data = avgBySource[source];
        data.avg = data.count > 0 ? data.total / data.count : 0;
      });

      return {
        avgCycle,
        avgByAssignee,
        avgBySource,
      };
    },
  });
}

// Hook para dados do dashboard
export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const currentMonth = new Date();
      const lastMonth = subMonths(currentMonth, 1);
      
      const currentMonthStart = startOfMonth(currentMonth);
      const currentMonthEnd = endOfMonth(currentMonth);
      const lastMonthStart = startOfMonth(lastMonth);
      const lastMonthEnd = endOfMonth(lastMonth);

      // Dados do mês atual
      const { data: currentMonthLeads, error: currentError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      if (currentError) throw currentError;

      // Dados do mês passado
      const { data: lastMonthLeads, error: lastError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      if (lastError) throw lastError;

      // Calcular métricas do mês atual
      const currentLeadsCount = currentMonthLeads.length;
      const currentSalesCount = currentMonthLeads.filter(lead => lead.status === 'fechado_ganho').length;
      const currentRevenue = currentMonthLeads
        .filter(lead => lead.status === 'fechado_ganho')
        .reduce((sum, lead) => sum + (lead.value || 0), 0);
      const currentConversionRate = currentLeadsCount > 0 ? (currentSalesCount / currentLeadsCount) * 100 : 0;

      // Calcular métricas do mês passado
      const lastLeadsCount = lastMonthLeads.length;
      const lastSalesCount = lastMonthLeads.filter(lead => lead.status === 'fechado_ganho').length;
      const lastRevenue = lastMonthLeads
        .filter(lead => lead.status === 'fechado_ganho')
        .reduce((sum, lead) => sum + (lead.value || 0), 0);
      const lastConversionRate = lastLeadsCount > 0 ? (lastSalesCount / lastLeadsCount) * 100 : 0;

      // Calcular crescimento
      const leadsGrowth = lastLeadsCount > 0 ? ((currentLeadsCount - lastLeadsCount) / lastLeadsCount) * 100 : 0;
      const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
      const conversionGrowth = lastConversionRate > 0 ? ((currentConversionRate - lastConversionRate) / lastConversionRate) * 100 : 0;

      return {
        currentMonth: {
          leadsCount: currentLeadsCount,
          salesCount: currentSalesCount,
          revenue: currentRevenue,
          conversionRate: currentConversionRate,
        },
        lastMonth: {
          leadsCount: lastLeadsCount,
          salesCount: lastSalesCount,
          revenue: lastRevenue,
          conversionRate: lastConversionRate,
        },
        growth: {
          leads: leadsGrowth,
          revenue: revenueGrowth,
          conversion: conversionGrowth,
        },
      };
    },
  });
}

// Hook para relatórios de vendas completos
export function useSalesReports(filters?: {
  startDate?: Date;
  endDate?: Date;
  assignedTo?: string;
}) {
  return useQuery({
    queryKey: ['sales-reports', filters],
    queryFn: async () => {
      const startDate = filters?.startDate || startOfMonth(new Date());
      const endDate = filters?.endDate || endOfMonth(new Date());

      // Buscar leads do período
      let query = supabase
        .from('leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Buscar team members para mapear nomes
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('id, name');
      
      if (teamError) throw teamError;

      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter(l => l.status === 'fechado_ganho') || [];
      const totalRevenue = convertedLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
      const averageDealSize = convertedLeads.length > 0 ? totalRevenue / convertedLeads.length : 0;

      // Calcular tempo médio de fechamento
      const closingTimes = convertedLeads
        .filter(l => l.expected_close_date)
        .map(l => {
          const created = new Date(l.created_at);
          const closed = new Date(l.expected_close_date!);
          return Math.abs(closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
      const averageClosingTime = closingTimes.length > 0 
        ? closingTimes.reduce((sum, time) => sum + time, 0) / closingTimes.length 
        : 0;

      // Receita por fonte
      const revenueBySource = (leads || []).reduce((acc, lead) => {
        const source = lead.source || 'Não informado';
        if (!acc[source]) {
          acc[source] = 0;
        }
        if (lead.status === 'fechado_ganho') {
          acc[source] += lead.value || 0;
        }
        return acc;
      }, {} as Record<string, number>);

      // Receita por vendedor
      const revenueByMember = (leads || []).reduce((acc, lead) => {
        const member = teamMembers?.find(tm => tm.id === lead.assigned_to);
        const memberName = member?.name || 'Não atribuído';
        if (!acc[memberName]) {
          acc[memberName] = 0;
        }
        if (lead.status === 'fechado_ganho') {
          acc[memberName] += lead.value || 0;
        }
        return acc;
      }, {} as Record<string, number>);

      // Conversão por vendedor
      const conversionByMember = (leads || []).reduce((acc, lead) => {
        const member = teamMembers?.find(tm => tm.id === lead.assigned_to);
        const memberName = member?.name || 'Não atribuído';
        if (!acc[memberName]) {
          acc[memberName] = { total: 0, converted: 0 };
        }
        acc[memberName].total++;
        if (lead.status === 'fechado_ganho') {
          acc[memberName].converted++;
        }
        return acc;
      }, {} as Record<string, { total: number; converted: number }>);

      return {
        totalRevenue,
        totalLeads,
        convertedLeads: convertedLeads.length,
        conversionRate,
        averageDealSize,
        averageClosingTime,
        revenueBySource: Object.entries(revenueBySource).map(([name, value]) => ({ name, value })),
        revenueByMember: Object.entries(revenueByMember).map(([name, revenue]) => ({ name, revenue })),
        conversionByMember: Object.entries(conversionByMember).map(([name, data]) => ({
          name,
          conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0
        })),
        monthlyTrend: [] as Array<{ month: string; revenue: number }>
      };
    },
  });
}