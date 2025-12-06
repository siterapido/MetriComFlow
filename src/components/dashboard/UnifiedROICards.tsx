import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { TrendingUp, TrendingDown, DollarSign, Users, MousePointerClick, Activity } from "lucide-react";
import { UnifiedMetrics } from "@/hooks/useUnifiedMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface UnifiedROICardsProps {
  unifiedMetrics: UnifiedMetrics | undefined;
  loading: boolean;
}

export function UnifiedROICards({ unifiedMetrics, loading }: UnifiedROICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Investimento (Ads)",
      value: formatCurrency(unifiedMetrics?.totalSpend || 0),
      icon: DollarSign,
      trend: "+12.5%", // Mock trend logic can be real later
      trendUp: false, // For spend, up is usually "bad" or just volume
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20"
    },
    {
      title: "Receita (CRM)",
      value: formatCurrency(unifiedMetrics?.totalRevenue || 0),
      icon: Activity,
      trend: "+24.3%",
      trendUp: true,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20"
    },
    {
      title: "ROAS Geral",
      value: `${formatNumber(unifiedMetrics?.roas || 0)}x`,
      icon: TrendingUp,
      trend: "+5.2%",
      trendUp: true,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20"
    },
    {
      title: "Leads Totais",
      value: formatNumber(unifiedMetrics?.totalLeads || 0),
      icon: Users,
      trend: "+18.2%",
      trendUp: true,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/20"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ y: -5 }}
          className={`
            relative overflow-hidden rounded-3xl p-6 
            glass-card border border-white/5 hover:border-white/20
            transition-all duration-300 group
          `}
        >
          {/* Background Glow */}
          <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 ${metric.bg}`}></div>
          
          <div className="flex items-center justify-between space-y-0 pb-2 mb-2 relative z-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide">
              {metric.title}
            </h3>
            <div className={`p-2 rounded-xl ${metric.bg} ${metric.color} shadow-sm`}>
                 <metric.icon className="h-4 w-4" />
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="text-2xl font-bold text-white tracking-tight mb-1">
                {metric.value}
            </div>
            
            <div className="flex items-center text-xs">
                <span className={`flex items-center font-medium ${metric.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                    {metric.trendUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                    {metric.trend}
                </span>
                <span className="text-muted-foreground ml-2">vs. mês anterior</span>
            </div>
          </div>
          
          {/* Bottom highlight bar */}
          <div className={`absolute bottom-0 left-0 h-1 w-full ${metric.bg} opacity-50`}></div>
        </motion.div>
      ))}
    </div>
  );
}
