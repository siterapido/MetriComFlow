import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle } from "lucide-react";

interface UsageMeterProps {
  label: string;
  current: number;
  max: number;
  icon?: React.ReactNode;
  showWarning?: boolean;
}

export function UsageMeter({ label, current, max, icon, showWarning = true }: UsageMeterProps) {
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  const remaining = Math.max(0, max - current);

  const getStatusColor = () => {
    if (isAtLimit) return "text-destructive";
    if (isNearLimit) return "text-warning";
    return "text-success";
  };

  const getProgressColor = () => {
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-warning";
    return "bg-success";
  };

  return (
    <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon && (
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  {icon}
                </div>
              )}
              <p className="text-sm font-medium text-foreground">{label}</p>
            </div>

            {/* Status Icon */}
            {showWarning && (
              <div>
                {isAtLimit ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : isNearLimit ? (
                  <AlertCircle className="w-5 h-5 text-warning" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
              </div>
            )}
          </div>

          {/* Usage Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${getStatusColor()}`}>{current}</span>
              <span className="text-sm text-muted-foreground">/ {max}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Disponíveis: <span className="font-medium text-foreground">{remaining}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={percentage} className="h-2" indicatorClassName={getProgressColor()} />
            <p className="text-xs text-muted-foreground">
              {percentage}% utilizado
              {isNearLimit && !isAtLimit && " - Próximo do limite"}
              {isAtLimit && " - Limite atingido"}
            </p>
          </div>

          {/* Warning Message */}
          {isAtLimit && showWarning && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-destructive font-medium">
                Você atingiu o limite do seu plano. Faça upgrade para adicionar mais.
              </p>
            </div>
          )}

          {isNearLimit && !isAtLimit && showWarning && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-warning font-medium">
                Você está próximo do limite. Considere fazer upgrade.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
