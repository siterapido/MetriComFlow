import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowUpRight, ArrowDownRight, Target, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatNumber } from "@/lib/formatters";

// --- Glass Card ---
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, gradient, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/5 backdrop-blur-xl transition-all duration-300",
          gradient
            ? "bg-gradient-to-br from-white/5 to-white/0"
            : "bg-card/30",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

// --- Animated Metric Card ---
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ElementType;
  delay?: number;
  color?: "blue" | "green" | "purple" | "orange";
  description?: string;
}

export const AnimatedMetricCard = ({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon: Icon,
  delay = 0,
  color = "blue",
  description,
}: MetricCardProps) => {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };

  const isPositive = trend && trend > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative flex flex-col justify-between p-6 rounded-3xl border border-white/5 bg-card/40 backdrop-blur-md overflow-hidden group hover:border-white/10 hover:bg-card/60 transition-all",
        // colorMap[color]
      )}
    >
        {/* Glow Effect */}
        <div className={cn(
            "absolute -right-6 -top-6 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity duration-500 group-hover:opacity-30",
            color === 'blue' && "bg-blue-500",
            color === 'green' && "bg-green-500",
            color === 'purple' && "bg-purple-500",
            color === 'orange' && "bg-orange-500",
        )} />

      <div className="flex items-start justify-between z-10">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {value}
            </h3>
            {subValue && (
                <span className="text-sm text-muted-foreground">{subValue}</span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl border border-white/5", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(trend !== undefined || description) && (
        <div className="mt-4 flex items-center gap-3 z-10">
            {trend !== undefined && (
                 <div
                 className={cn(
                   "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border",
                   isPositive
                     ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                     : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                 )}
               >
                 {isPositive ? (
                   <ArrowUpRight className="w-3 h-3" />
                 ) : (
                   <ArrowDownRight className="w-3 h-3" />
                 )}
                 {Math.abs(trend)}%
               </div>
            )}
         
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {trendLabel || description || "vs. período anterior"}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// --- Modern Tab Trigger ---
interface ModernTabTriggerProps {
  value: string;
  label: string;
  icon?: React.ElementType;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ModernTabTrigger = ({
  value,
  label,
  icon: Icon,
  isSelected,
  onClick,
}: ModernTabTriggerProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors outline-none select-none rounded-full",
        isSelected ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isSelected && (
        <motion.div
          layoutId="tab-background"
          className="absolute inset-0 bg-primary/10 rounded-full border border-primary/20"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
    </button>
  );
};

// --- Goals Widget ---
interface GoalsWidgetProps {
  goals: any[]; // Typing as any for flexibility, can be strict typed
  loading?: boolean;
}

export const GoalsWidget = ({ goals, loading }: GoalsWidgetProps) => {
  if (loading) {
    return (
      <GlassCard className="p-6 h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando metas...</div>
      </GlassCard>
    );
  }

  const primaryGoal = goals && goals.length > 0 ? goals[0] : null;

  if (!primaryGoal) {
    return (
        <GlassCard className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3 h-full min-h-[140px]">
                <div className="p-3 rounded-full bg-white/5">
                    <Target className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                    <h4 className="font-medium text-white">Nenhuma meta definida</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Configure metas mensais para acompanhar seu progresso.
                    </p>
                </div>
            </div>
        </GlassCard>
    )
  }

  const percentage = Math.min(100, Math.max(0, primaryGoal.percentage || 0));
  const isGood = percentage >= 80;

  return (
    <GlassCard className="p-6 flex flex-col justify-between h-full group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                <Target className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Meta Principal</h3>
        </div>
        {/* <button className="text-muted-foreground hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
        </button> */}
      </div>

      <div className="space-y-4">
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-bold text-white">
                    {formatNumber(percentage)}%
                </span>
                <span className="text-xs text-muted-foreground mb-1">
                    {formatCurrency(primaryGoal.achieved_amount)} / {formatCurrency(primaryGoal.goal_amount)}
                </span>
            </div>
            
            <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={cn(
                        "h-full rounded-full shadow-[0_0_10px_currentColor]",
                        isGood ? "bg-green-500 text-green-500" : "bg-blue-500 text-blue-500"
                    )}
                />
            </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-3 mt-2">
            <span>{primaryGoal.company_name}</span>
            <span className={cn(
                "px-2 py-0.5 rounded-full border",
                primaryGoal.status === 'Excelente' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                primaryGoal.status === 'Em dia' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            )}>
                {primaryGoal.status}
            </span>
        </div>
      </div>
    </GlassCard>
  );
};







