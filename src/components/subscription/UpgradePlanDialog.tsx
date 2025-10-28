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
import { Check, AlertTriangle, TrendingUp, Users, BarChart3, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { SubscriptionPlan } from "@/hooks/useSubscription";
import { useCurrentSubscription } from "@/hooks/useSubscription";
import { CheckoutForm } from "./CheckoutForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { stripNonNumeric } from "@/lib/cpf-cnpj-validator";

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
  const [step, setStep] = useState<"confirm" | "checkout">("confirm");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceedToCheckout = () => {
    setStep("checkout");
  };

  const handleBackToConfirm = () => {
    setStep("confirm");
  };

  const handleCheckoutSubmit = async (data: any) => {
    if (!newPlan || !currentSubscription) return;

    setIsProcessing(true);
    try {
      // Call Edge Function to create subscription in Asaas
      const { data: result, error } = await supabase.functions.invoke(
        "create-asaas-subscription",
        {
          body: {
            subscriptionId: currentSubscription.id,
            planSlug: newPlan.slug,
            billingName: data.billingName,
            billingEmail: data.billingEmail,
            billingCpfCnpj: stripNonNumeric(data.billingCpfCnpj),
            billingPhone: stripNonNumeric(data.billingPhone),
            billingAddress: {
              postalCode: stripNonNumeric(data.postalCode),
              addressNumber: data.addressNumber,
              street: data.street?.trim(),
              province: data.province?.trim(),
              city: data.city?.trim(),
              state: data.state?.trim().toUpperCase(),
              addressComplement: data.complement || undefined,
            },
            billingType: data.paymentMethod,
            creditCard:
              data.paymentMethod === "CREDIT_CARD" && data.creditCard
                ? {
                    holderName: data.creditCard.holderName,
                    number: stripNonNumeric(data.creditCard.number),
                    expiryMonth: (data.creditCard.expiry || "").slice(0, 2),
                    expiryYear: `20${(data.creditCard.expiry || "").slice(3, 5)}`,
                    ccv: stripNonNumeric(data.creditCard.ccv),
                  }
                : undefined,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "✅ Plano atualizado com sucesso!",
        description: `Você agora está no plano ${newPlan.name}. ${
          data.paymentMethod === "PIX" || data.paymentMethod === "BOLETO"
            ? "Você receberá as instruções de pagamento por email."
            : "Seu cartão será cobrado automaticamente."
        }`,
      });

      onOpenChange(false);
      setStep("confirm");

      // Redirect to subscription page to see payment details
      setTimeout(() => {
        window.location.href = "/planos";
      }, 1500);
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "❌ Erro ao processar assinatura",
        description: error.message || "Tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isDowngrade = currentPlan && newPlan && newPlan.price < currentPlan.price;
  const priceDiff = currentPlan && newPlan ? newPlan.price - currentPlan.price : 0;

  // Check if downgrade would exceed limits
  const wouldExceedLimits =
    isDowngrade &&
    currentUsage &&
    newPlan &&
    (currentUsage.ad_accounts > newPlan.max_ad_accounts ||
      currentUsage.users > newPlan.max_users);

  if (!newPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          {step === "checkout" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToConfirm}
              className="absolute left-6 top-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            {step === "confirm"
              ? isDowngrade
                ? "Downgrade de Plano"
                : "Upgrade de Plano"
              : "Finalizar Contratação"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === "confirm"
              ? isDowngrade
                ? "Você está prestes a fazer downgrade do seu plano."
                : "Você está prestes a fazer upgrade do seu plano."
              : "Preencha os dados de cobrança para finalizar"}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-6 py-4">
            {/* Plan Comparison */}
            <div className="grid grid-cols-2 gap-4">
            {/* Current Plan */}
            {currentPlan && (
              <div className="p-4 rounded-lg border border-border bg-muted/20">
                <Badge className="mb-2 bg-muted text-muted-foreground">Plano Atual</Badge>
                <h3 className="font-bold text-lg text-foreground">{currentPlan.name}</h3>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(currentPlan.price)}<span className="text-sm text-muted-foreground">/mês</span>
                </p>
              </div>
            )}

            {/* New Plan */}
            <div className="p-4 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5">
              <Badge className="mb-2 bg-primary text-primary-foreground">Novo Plano</Badge>
              <h3 className="font-bold text-lg text-foreground">{newPlan.name}</h3>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatCurrency(newPlan.price)}<span className="text-sm text-muted-foreground">/mês</span>
              </p>
            </div>
          </div>

          {/* Price Difference */}
          {currentPlan && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-accent/20">
              <p className="text-sm text-muted-foreground">
                Diferença:{" "}
                <span className={`font-bold ${priceDiff > 0 ? "text-primary" : "text-success"}`}>
                  {priceDiff > 0 ? "+" : ""}
                  {formatCurrency(Math.abs(priceDiff))}
                </span>
                {" "}por mês
              </p>
            </div>
          )}

          {/* Feature Changes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Mudanças no plano:</h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Ad Accounts */}
              <FeatureChange
                icon={<BarChart3 className="w-4 h-4" />}
                label="Contas de Anúncio"
                oldValue={currentPlan?.max_ad_accounts}
                newValue={newPlan.max_ad_accounts}
                currentUsage={currentUsage?.ad_accounts}
              />

              {/* Users */}
              <FeatureChange
                icon={<Users className="w-4 h-4" />}
                label="Usuários"
                oldValue={currentPlan?.max_users}
                newValue={newPlan.max_users}
                currentUsage={currentUsage?.users}
              />
            </div>

            {/* CRM Access */}
            {currentPlan && currentPlan.has_crm_access !== newPlan.has_crm_access && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20">
                <Check className="w-5 h-5 text-success" />
                <span className="text-sm text-foreground">
                  {newPlan.has_crm_access
                    ? "✨ Acesso ao CRM será habilitado"
                    : "⚠️ Acesso ao CRM será removido"}
                </span>
              </div>
            )}
          </div>

          {/* Warning if downgrade exceeds limits */}
          {wouldExceedLimits && (
            <Alert className="bg-destructive/10 border-destructive">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <p className="font-semibold">Atenção: Uso atual excede os limites do novo plano!</p>
                <p className="text-sm mt-1">
                  Você precisará remover algumas contas de anúncio ou usuários antes de fazer o
                  downgrade.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          {!wouldExceedLimits && (
            <Alert className="bg-primary/10 border-primary">
              <AlertDescription className="text-foreground">
                <p className="text-sm">
                  {isDowngrade
                    ? "O downgrade será aplicado no final do período atual de cobrança."
                    : "O upgrade será aplicado imediatamente e você terá acesso a todas as novas funcionalidades."}
                </p>
              </AlertDescription>
            </Alert>
          )}
          </div>
        )}

        {step === "confirm" && (
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleProceedToCheckout}
              disabled={wouldExceedLimits}
              className="bg-primary hover:bg-primary/90 flex-1"
            >
              Continuar para Pagamento
            </Button>
          </div>
        )}

        {step === "checkout" && (
          <CheckoutForm
            planName={newPlan.name}
            planPrice={newPlan.price}
            onSubmit={handleCheckoutSubmit}
            isLoading={isProcessing}
          />
        )}
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
