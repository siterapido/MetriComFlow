import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Users, BarChart3, Loader2, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { PlanCard } from "@/components/subscription/PlanCard";
import { UsageMeter } from "@/components/subscription/UsageMeter";
import { UpgradePlanDialog } from "@/components/subscription/UpgradePlanDialog";
import { InvoiceHistory } from "@/components/subscription/InvoiceHistory";
import {
  useSubscriptionPlans,
  useCurrentSubscription,
  useOrganizationPlanLimits,
  useIsOnTrial,
  useTrialDaysRemaining,
  type SubscriptionPlan,
  type OrganizationPlanLimits,
} from "@/hooks/useSubscription";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export default function SubscriptionPlans() {
  const location = useLocation();
  const { data: org } = useActiveOrganization();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSubscription, isLoading: subscriptionLoading } = useCurrentSubscription();
  const { data: limits, isLoading: limitsLoading } = useOrganizationPlanLimits();
  const isOnTrial = useIsOnTrial();
  const trialDaysRemaining = useTrialDaysRemaining();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const isLoading = plansLoading || subscriptionLoading || limitsLoading;

  const currentPlan = currentSubscription?.plan as SubscriptionPlan | undefined;

  // Garantir tipagem segura de "limits" para evitar problemas de NoInfer do react-query
  const limitsSafe: OrganizationPlanLimits | null =
    limits && typeof limits === "object" &&
    "current_ad_accounts" in (limits as Record<string, unknown>) &&
    "current_users" in (limits as Record<string, unknown>)
      ? (limits as OrganizationPlanLimits)
      : null;

  const handleSelectPlan = (planId: string) => {
    const plan = plans?.find((p) => p.id === planId);
    if (plan && plan.id !== currentPlan?.id) {
      setSelectedPlan(plan);
      setUpgradeDialogOpen(true);
    }
  };

  // Se vier com ?plan=slug|id nos params, abre o checkout diretamente
  useEffect(() => {
    if (!plans || plans.length === 0) return;
    const params = new URLSearchParams(location.search);
    const planParam = params.get("plan");
    if (!planParam) return;
    const plan = plans.find((p) => p.slug === planParam || p.id === planParam);
    if (plan && plan.id !== currentPlan?.id) {
      setSelectedPlan(plan);
      setUpgradeDialogOpen(true);
    }
  }, [plans, location.search, currentPlan?.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[500px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Upgrade Dialog */}
      <UpgradePlanDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentPlan={currentPlan || null}
        newPlan={selectedPlan}
        currentUsage={{
          ad_accounts: limitsSafe?.current_ad_accounts || 0,
          users: limitsSafe?.current_users || 0,
        }}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Planos e Assinatura
            </h1>
            <p className="text-muted-foreground mt-1">
              {org ? `Gerencie o plano de ${org.name}` : "Escolha o plano ideal para sua equipe"}
            </p>
          </div>
        </div>

        {/* Current Plan Badge */}
        {currentPlan && (
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm">
              Plano Atual: {currentPlan.name}
            </Badge>
            {isOnTrial && (
              <Badge className="bg-warning text-warning-foreground px-4 py-2 text-sm">
                <Clock className="w-4 h-4 mr-1" />
                Trial: {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"} restantes
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Payment Status Alerts */}
      {!currentSubscription && (
        <Alert className="bg-accent/20 border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            Nenhum plano ativo no momento. Escolha um plano abaixo para habilitar limites e recursos.
          </AlertDescription>
        </Alert>
      )}
      {currentSubscription?.status === "past_due" && (
        <Alert className="bg-destructive/10 border-destructive">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <p className="font-semibold">Pagamento Vencido!</p>
            <p className="text-sm mt-1">
              Seu pagamento está em atraso. Regularize sua situação para continuar usando os
              recursos do plano. Verifique o histórico de pagamentos abaixo.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {currentSubscription?.status === "canceled" && (
        <Alert className="bg-destructive/10 border-destructive">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <p className="font-semibold">Assinatura Cancelada</p>
            <p className="text-sm mt-1">
              Sua assinatura foi cancelada. Contrate um novo plano para continuar usando o sistema.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {currentSubscription?.status === "active" && !isOnTrial && (
        <Alert className="bg-success/10 border-success">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            <p className="font-semibold">Assinatura Ativa ✓</p>
            <p className="text-sm mt-1">
              Seu plano está ativo e funcionando normalmente. Próxima cobrança:{" "}
              {currentSubscription.next_billing_date
                ? new Date(currentSubscription.next_billing_date).toLocaleDateString("pt-BR")
                : "A definir"}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Alert */}
      {isOnTrial && (
        <Alert className="bg-warning/10 border-warning">
          <Clock className="h-4 w-4 text-warning" />
          <AlertDescription className="text-foreground">
            <p className="font-semibold">Você está no período de teste!</p>
            <p className="text-sm mt-1">
              Seu trial termina em {trialDaysRemaining}{" "}
              {trialDaysRemaining === 1 ? "dia" : "dias"}. Escolha um plano para continuar
              aproveitando todos os recursos.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Owner Only Warning */}
      {!org?.isOwner && (
        <Alert className="bg-accent/20 border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            Apenas proprietários (owners) podem alterar o plano da organização. Entre em contato
            com o administrador para fazer upgrade.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Usage Stats */}
      {limitsSafe && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <p className="text-xl font-bold text-foreground">{limitsSafe.plan_name || "Nenhum"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <UsageMeter
            label="Contas de Anúncio"
            current={limitsSafe.current_ad_accounts}
            max={limitsSafe.max_ad_accounts}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
            showWarning={!!currentPlan}
          />

          <UsageMeter
            label="Usuários Ativos"
            current={limitsSafe.current_users}
            max={limitsSafe.max_users}
            icon={<Users className="h-5 w-5 text-primary" />}
            showWarning={!!currentPlan}
          />
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Escolha seu plano</h2>

        {!plans || plans.length === 0 ? (
          <Alert className="bg-accent/20 border-border">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-foreground">
              Nenhum plano disponível no momento. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.id === currentPlan?.id}
                onSelect={handleSelectPlan}
                disabled={!org?.isOwner}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invoice History */}
      {currentSubscription && (
        <div className="mt-8">
          <InvoiceHistory subscriptionId={currentSubscription.id} />
        </div>
      )}

      {/* Feature Comparison Table */}
      {plans && plans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Comparação de Recursos</h2>

          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">
                        Recurso
                      </th>
                      {plans.map((plan) => (
                        <th
                          key={plan.id}
                          className="text-center p-4 text-sm font-semibold text-foreground"
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-4 text-sm text-foreground">Contas de Anúncio</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4 text-sm text-foreground">
                          {plan.max_ad_accounts}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="p-4 text-sm text-foreground">Usuários</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4 text-sm text-foreground">
                          {plan.max_users}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 text-sm text-foreground">Acesso ao CRM</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.has_crm_access ? (
                            <span className="text-success font-semibold">✓</span>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="p-4 text-sm text-foreground">Dashboard Geral</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4 text-success font-semibold">
                          ✓
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4 text-sm text-foreground">Métricas Meta Ads</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4 text-success font-semibold">
                          ✓
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="p-4 text-sm text-foreground">Suporte Prioritário</td>
                      {plans.map((plan) => (
                        <td key={plan.id} className="text-center p-4">
                          {plan.slug === "pro" ? (
                            <span className="text-success font-semibold">✓</span>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
