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
import { Check, AlertTriangle, TrendingUp, Users, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { SubscriptionPlan } from "@/hooks/useSubscription";
import { useCurrentSubscription } from "@/hooks/useSubscription";
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
  const [step] = useState<"confirm" | "checkout">("confirm");
  const [isProcessing, setIsProcessing] = useState(false);

  // Checkout desativado temporariamente para reinimplementação

  const isFirstSubscription = !currentPlan; // New: detect first-time subscription
  const isDowngrade = currentPlan && newPlan && newPlan.price < currentPlan.price;
  const priceDiff = currentPlan && newPlan ? newPlan.price - currentPlan.price : 0;

  // Check if downgrade would exceed limits (only relevant if there's a current plan)
  const wouldExceedLimits =
    !isFirstSubscription &&
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

        {step === "confirm" && (
          <div className="space-y-6 py-4">
            {/* Plan Comparison OR Single Plan Display */}
            {isFirstSubscription ? (
              /* First Subscription: Show only new plan */
              <div className="p-6 rounded-lg border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary/10">
                <Badge className="mb-3 bg-primary text-primary-foreground">Plano Selecionado</Badge>
                <h3 className="font-bold text-2xl text-foreground">{newPlan.name}</h3>
                <p className="text-3xl font-bold text-primary mt-3">
                  {formatCurrency(newPlan.price)}<span className="text-lg text-muted-foreground">/mês</span>
                </p>
                {newPlan.description && (
                  <p className="text-muted-foreground mt-2">{newPlan.description}</p>
                )}
              </div>
            ) : (
              /* Existing Subscription: Show comparison */
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
            )}

          {/* Price Difference (only for upgrades/downgrades) */}
          {!isFirstSubscription && currentPlan && (
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
            <h4 className="font-semibold text-foreground">
              {isFirstSubscription ? "Recursos incluídos:" : "Mudanças no plano:"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Ad Accounts */}
              <FeatureChange
                icon={<BarChart3 className="w-4 h-4" />}
                label="Contas de Anúncio"
                oldValue={isFirstSubscription ? undefined : currentPlan?.max_ad_accounts}
                newValue={newPlan.max_ad_accounts}
                currentUsage={isFirstSubscription ? undefined : currentUsage?.ad_accounts}
              />

              {/* Users */}
              <FeatureChange
                icon={<Users className="w-4 h-4" />}
                label="Usuários"
                oldValue={isFirstSubscription ? undefined : currentPlan?.max_users}
                newValue={newPlan.max_users}
                currentUsage={isFirstSubscription ? undefined : currentUsage?.users}
              />
            </div>

            {/* CRM Access */}
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
                  {isFirstSubscription
                    ? "Seu plano será ativado imediatamente após a confirmação do pagamento. Você terá acesso completo a todos os recursos incluídos."
                    : isDowngrade
                    ? "O downgrade será aplicado no final do período atual de cobrança."
                    : "O upgrade será aplicado imediatamente e você terá acesso a todas as novas funcionalidades."}
                </p>
              </AlertDescription>
            </Alert>
          )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              // Inform that checkout is under reconstruction
              toast({
                title: "Checkout em reconstrução",
                description:
                  "Estamos atualizando o fluxo de pagamento. Em breve estará disponível novamente.",
              });
            }}
            disabled={wouldExceedLimits || isProcessing}
            className="bg-primary hover:bg-primary/90 flex-1"
          >
            Continuar para Pagamento
          </Button>
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
