import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertTriangle, TrendingUp, Users, BarChart3, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { SubscriptionPlan } from "@/hooks/useSubscription";
import { useCurrentSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuth } from "@/hooks/useAuth";
import { getStripePriceIdForPlanSlug } from "@/lib/stripePricing";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan | null;
  newPlan: SubscriptionPlan | null;
  currentUsage?: {
    ad_accounts: number;
    users: number;
  };
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  currentPlan,
  newPlan,
  currentUsage,
}: UpgradePlanDialogProps) {
  const { toast } = useToast();
  const { data: currentSubscription } = useCurrentSubscription();
  const { data: org } = useActiveOrganization();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const pushDataLayer = (payload: Record<string, unknown>) => {
    if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push(payload);
    }
  };

  const isFirstSubscription = !currentPlan;
  const isDowngrade = currentPlan && newPlan && newPlan.price < currentPlan.price;
  const priceDiff = currentPlan && newPlan ? newPlan.price - currentPlan.price : 0;

  const wouldExceedLimits =
    !isFirstSubscription &&
    isDowngrade &&
    currentUsage &&
    newPlan &&
    (currentUsage.ad_accounts > newPlan.max_ad_accounts ||
      currentUsage.users > newPlan.max_users);

  const handleStripeRedirect = async () => {
    if (!newPlan || !user) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para continuar com o pagamento.",
        variant: "destructive",
      });
      return;
    }

    if (wouldExceedLimits) return;

    setIsProcessing(true);

    try {
      const url = new URL(window.location.href);
      const baseUrl = `${url.protocol}//${url.host}`;
      const successUrl = `${baseUrl}/planos?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/planos?checkout_canceled=1`;
      const priceId = getStripePriceIdForPlanSlug(newPlan.slug);

      pushDataLayer({
        event: "subscription_checkout_started",
        planId: newPlan.id,
        planSlug: newPlan.slug,
        currentPlanId: currentSubscription?.plan_id ?? currentPlan?.id ?? null,
      });

      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          planId: newPlan.id,
          planSlug: newPlan.slug,
          planName: newPlan.name,
          priceId,
          organizationId: currentSubscription?.organization_id ?? org?.id ?? null,
          subscriptionId: currentSubscription?.id ?? null,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        throw new Error(error.message || "Falha ao iniciar checkout na Stripe.");
      }

      const checkoutUrl = data?.checkoutUrl;
      if (!checkoutUrl || typeof checkoutUrl !== "string") {
        throw new Error("URL de checkout não retornada pela API.");
      }

      toast({
        title: "Redirecionando para pagamento",
        description: "Abrindo ambiente seguro da Stripe...",
      });

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Erro ao criar checkout Stripe:", err);
      pushDataLayer({
        event: "subscription_checkout_failed",
        planId: newPlan.id,
        planSlug: newPlan.slug,
        message: err instanceof Error ? err.message : String(err),
      });
      toast({
        title: "Erro ao redirecionar",
        description: err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!newPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            {isFirstSubscription
              ? "Contratar Plano"
              : isDowngrade
              ? "Downgrade de Plano"
              : "Upgrade de Plano"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isFirstSubscription
              ? `Você está prestes a contratar o plano ${newPlan.name}.`
              : isDowngrade
              ? "Você está prestes a fazer downgrade do seu plano."
              : "Você está prestes a fazer upgrade do seu plano."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isFirstSubscription ? (
            <div className="p-6 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
              <Badge className="mb-3 bg-primary text-primary-foreground">Plano Selecionado</Badge>
              <h3 className="font-bold text-2xl text-foreground">{newPlan.name}</h3>
              <p className="text-3xl font-bold text-primary mt-3">
                {formatCurrency(newPlan.price)}
                <span className="text-lg text-muted-foreground">/mês</span>
              </p>
              {newPlan.description && (
                <p className="text-muted-foreground mt-2">{newPlan.description}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {currentPlan && (
                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <Badge className="mb-2 bg-muted text-muted-foreground">Plano Atual</Badge>
                  <h3 className="font-bold text-lg text-foreground">{currentPlan.name}</h3>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {formatCurrency(currentPlan.price)}
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                </div>
              )}

              <div className="p-4 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5">
                <Badge className="mb-2 bg-primary text-primary-foreground">Novo Plano</Badge>
                <h3 className="font-bold text-lg text-foreground">{newPlan.name}</h3>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(newPlan.price)}
                  <span className="text-sm text-muted-foreground">/mês</span>
                </p>
              </div>
            </div>
          )}

          {!isFirstSubscription && currentPlan && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-accent/20">
              <p className="text-sm text-muted-foreground">
                Diferença:{" "}
                <span className={`font-bold ${priceDiff > 0 ? "text-primary" : "text-success"}`}>
                  {priceDiff > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(priceDiff))}
                </span>{" "}
                por mês
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">
              {isFirstSubscription ? "Recursos incluídos:" : "Mudanças no plano:"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <FeatureChange
                icon={<BarChart3 className="w-4 h-4" />}
                label="Contas de Anúncio"
                oldValue={isFirstSubscription ? undefined : currentPlan?.max_ad_accounts}
                newValue={newPlan.max_ad_accounts}
                currentUsage={isFirstSubscription ? undefined : currentUsage?.ad_accounts}
              />

              <FeatureChange
                icon={<Users className="w-4 h-4" />}
                label="Usuários"
                oldValue={isFirstSubscription ? undefined : currentPlan?.max_users}
                newValue={newPlan.max_users}
                currentUsage={isFirstSubscription ? undefined : currentUsage?.users}
              />
            </div>

            {isFirstSubscription ? (
              newPlan.has_crm_access && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-sm text-foreground font-medium">
                    ✨ Acesso completo ao CRM incluído
                  </span>
                </div>
              )
            ) : (
              currentPlan && currentPlan.has_crm_access !== newPlan.has_crm_access && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-sm text-foreground">
                    {newPlan.has_crm_access
                      ? "✨ Acesso ao CRM será habilitado"
                      : "⚠️ Acesso ao CRM será removido"}
                  </span>
                </div>
              )
            )}
          </div>

          {wouldExceedLimits && (
            <Alert className="bg-destructive/10 border-destructive">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <p className="font-semibold">Atenção: uso atual excede o novo limite.</p>
                <p className="text-sm mt-1">
                  Reduza contas de anúncio ou usuários antes de prosseguir com o downgrade.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!wouldExceedLimits && (
            <Alert className="bg-primary/10 border-primary">
              <AlertDescription className="text-foreground">
                <p className="text-sm">
                  O pagamento acontece no ambiente da Stripe. Assim que aprovado, atualizaremos seu
                  plano automaticamente.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStripeRedirect}
              disabled={wouldExceedLimits || isProcessing}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                "Redirecionando..."
              ) : (
                <>
                  Ir para Stripe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureChangeProps {
  icon: React.ReactNode;
  label: string;
  oldValue?: number;
  newValue: number;
  currentUsage?: number;
}

function FeatureChange({ icon, label, oldValue, newValue, currentUsage }: FeatureChangeProps) {
  const isIncrease = oldValue !== undefined && newValue > oldValue;
  const isDecrease = oldValue !== undefined && newValue < oldValue;
  const exceedsLimit = currentUsage !== undefined && currentUsage > newValue;

  return (
    <div
      className={`p-3 rounded-lg border ${
        exceedsLimit
          ? "border-destructive bg-destructive/10"
          : "border-border bg-accent/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        {oldValue !== undefined && (
          <span className="text-sm text-muted-foreground line-through">{oldValue}</span>
        )}
        <span className={`text-lg font-bold ${exceedsLimit ? "text-destructive" : "text-foreground"}`}>
          {newValue}
        </span>
        {isIncrease && <span className="text-xs text-success">↑</span>}
        {isDecrease && <span className="text-xs text-warning">↓</span>}
      </div>
      {currentUsage !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">
          Uso atual: {currentUsage}
          {exceedsLimit && <span className="text-destructive font-semibold ml-1">⚠️ Excede limite</span>}
        </p>
      )}
    </div>
  );
}
