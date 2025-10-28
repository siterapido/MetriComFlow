import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  onSelect?: (planId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PlanCard({ plan, isCurrentPlan, onSelect, disabled, loading }: PlanCardProps) {
  const getIcon = () => {
    if (plan.slug === "pro") return <Crown className="w-6 h-6 text-white" />;
    if (plan.slug === "intermediario") return <Zap className="w-6 h-6 text-white" />;
    return <Star className="w-6 h-6 text-white" />;
  };

  const getButtonText = () => {
    if (isCurrentPlan) return "Plano Atual";
    if (loading) return "Processando...";
    // Show "Contratar" when there's no current plan, otherwise "Selecionar"
    return "Contratar Plano";
  };

  return (
    <Card
      className={`relative overflow-hidden border-2 transition-all duration-300 hover-lift ${
        isCurrentPlan
          ? "border-primary bg-gradient-to-br from-primary/5 to-secondary/5"
          : "border-border bg-gradient-to-br from-card to-accent/20"
      } ${plan.is_popular ? "ring-2 ring-success/50" : ""}`}
    >
      {/* Popular Badge */}
      {plan.is_popular && !isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-success text-success-foreground shadow-lg">
            Mais Popular
          </Badge>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-primary text-primary-foreground shadow-lg">
            Plano Atual
          </Badge>
        </div>
      )}

      <CardHeader className="space-y-4 pb-6">
        {/* Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
          {getIcon()}
        </div>

        {/* Plan Name */}
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">{plan.name}</CardTitle>
          {plan.description && (
            <CardDescription className="text-muted-foreground mt-2">
              {plan.description}
            </CardDescription>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">
            {formatCurrency(plan.price)}
          </span>
          <span className="text-muted-foreground">
            {plan.billing_period === "yearly" ? "/ ano" : "/ mês"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Features List */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground mb-3">Recursos inclusos:</p>

          {/* Key features from limits */}
          <div className="space-y-2">
            <FeatureItem
              text={`${plan.max_ad_accounts} ${plan.max_ad_accounts === 1 ? "conta" : "contas"} de anúncio`}
            />
            <FeatureItem
              text={`${plan.max_users} ${plan.max_users === 1 ? "usuário" : "usuários"}`}
            />
            <FeatureItem
              text={plan.has_crm_access ? "Acesso ao CRM" : "Sem acesso ao CRM"}
              disabled={!plan.has_crm_access}
            />
          </div>

          {/* Additional features from features array */}
          {plan.features && plan.features.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              {plan.features.map((feature, idx) => (
                <FeatureItem key={idx} text={feature} />
              ))}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => onSelect?.(plan.id)}
          disabled={isCurrentPlan || disabled || loading}
          className={`w-full ${
            isCurrentPlan
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeatureItemProps {
  text: string;
  disabled?: boolean;
}

function FeatureItem({ text, disabled }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        disabled ? "bg-muted" : "bg-success/10"
      }`}>
        <Check className={`w-3 h-3 ${disabled ? "text-muted-foreground" : "text-success"}`} />
      </div>
      <span className={`text-sm ${disabled ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {text}
      </span>
    </div>
  );
}
