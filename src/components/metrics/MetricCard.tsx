import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/formatters";

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'number' | 'percentage' | 'none';
  className?: string;
  iconColor?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  trend,
  format = 'none',
  className,
  iconColor = 'text-primary',
  loading = false,
}: MetricCardProps) {
  // Format value based on type
  const formattedValue = () => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return value;
    }
  };

  // Determine trend color
  const getTrendColor = () => {
    if (!trend || trend === 'neutral') return 'text-muted-foreground';
    return trend === 'up' ? 'text-success' : 'text-destructive';
  };

  // Determine trend icon
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("bg-gradient-to-br from-card to-accent/20 border-border hover-lift", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">
              {formattedValue()}
            </div>
            {(subtitle || change !== undefined) && (
              <div className="flex items-center gap-2 mt-1">
                {change !== undefined && trend && trend !== 'neutral' && (
                  <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{Math.abs(change).toFixed(1)}%</span>
                  </div>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
