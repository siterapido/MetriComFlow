import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, DollarSign, Target, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageValueCardProps {
  title: string;
  totalValue: number;
  leadsCount: number;
  averageValue?: number;
  conversionRate?: number;
  className?: string;
}

export function StageValueCard({
  title,
  totalValue,
  leadsCount,
  averageValue,
  conversionRate,
  className,
}: StageValueCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  return (
    <>
      <Card
        className={cn(
          "bg-card/50 border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group",
          className
        )}
        onClick={() => setIsDetailsOpen(true)}
      >
        <div className="p-2.5 space-y-1.5">
          {/* Title and Count */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">{title}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span className="font-medium">{leadsCount}</span>
            </div>
          </div>

          {/* Total Value - Compact */}
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(totalValue)}
            </span>
            {averageValue !== undefined && averageValue > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ~{formatCurrency(averageValue)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Métricas e análise detalhada desta etapa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-gradient-to-br from-card to-accent/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    Valor Total
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-card to-accent/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    Quantidade
                  </div>
                  <p className="text-2xl font-bold text-foreground">{leadsCount}</p>
                </div>
              </Card>
            </div>

            {/* Average Value */}
            {averageValue !== undefined && averageValue > 0 && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    Ticket Médio
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(averageValue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor médio por lead nesta etapa
                  </p>
                </div>
              </Card>
            )}

            {/* Conversion Rate */}
            {conversionRate !== undefined && conversionRate > 0 && (
              <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Percent className="w-4 h-4" />
                    Taxa de Conversão
                  </div>
                  <p className="text-xl font-bold text-success">
                    {formatPercent(conversionRate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Percentual de leads que avançam para a próxima etapa
                  </p>
                </div>
              </Card>
            )}

            {/* Insights */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Insights</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  • Esta etapa representa{" "}
                  <span className="font-semibold">{leadsCount}</span> oportunidades
                  ativas
                </li>
                {averageValue !== undefined && averageValue > 0 && (
                  <li>
                    • O ticket médio é de{" "}
                    <span className="font-semibold">
                      {formatCurrency(averageValue)}
                    </span>
                  </li>
                )}
                {conversionRate !== undefined && conversionRate > 0 && (
                  <li>
                    • Taxa de conversão:{" "}
                    <span className="font-semibold">
                      {formatPercent(conversionRate)}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
