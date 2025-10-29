import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AccountCreationStep, type AccountData } from "./AccountCreationStep";
import { PaymentStep, type PaymentData } from "./PaymentStep";
import { CheckCircle, User, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface TwoStepCheckoutProps {
  planName: string;
  planPrice: number;
  onSubmit: (accountData: AccountData, paymentData: PaymentData) => Promise<void>;
  isLoading?: boolean;
}

type CheckoutStep = "account" | "payment";

export function TwoStepCheckout({
  planName,
  planPrice,
  onSubmit,
  isLoading = false,
}: TwoStepCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("account");
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [userCreated, setUserCreated] = useState(false);

  // Verificar se o usuário já está logado ao carregar o componente
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Se o usuário já está logado, pular para a etapa de pagamento
        const userData: AccountData = {
          billingName: user.user_metadata?.full_name || "",
          billingEmail: user.email || "",
          billingCpfCnpj: user.user_metadata?.document || "",
          billingPhone: user.user_metadata?.phone || "",
          billingAddress: "",
          billingNumber: "",
          billingComplement: "",
          billingNeighborhood: "",
          billingCity: "",
          billingState: "",
          billingCep: "",
          accountPassword: "", // Não precisamos da senha aqui
          confirmPassword: "",
        };
        setAccountData(userData);
        setUserCreated(true);
        setCurrentStep("payment");
        toast.info("Usuário já logado. Prosseguindo para o pagamento.");
      }
    };

    checkUser();
  }, []);

  const handleAccountSubmit = async (data: AccountData, userWasCreated?: boolean) => {
    setAccountData(data);
    setUserCreated(userWasCreated || false);
    setCurrentStep("payment");
  };

  const handlePaymentSubmit = async (data: PaymentData) => {
    if (!accountData) {
      throw new Error("Dados da conta não encontrados");
    }
    await onSubmit(accountData, data);
  };

  const handleBackToAccount = () => {
    // Se o usuário foi criado, não permitir voltar para a etapa de criação de conta
    if (userCreated) {
      toast.info("Conta já criada. Não é possível voltar para a etapa anterior.");
      return;
    }
    setCurrentStep("account");
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case "account":
        return 50;
      case "payment":
        return 100;
      default:
        return 0;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "account":
        return "Criação da Conta";
      case "payment":
        return userCreated ? "Pagamento" : "Pagamento";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "account":
        return "Preencha seus dados pessoais e de endereço";
      case "payment":
        return "Finalize sua assinatura no checkout seguro da Stripe";
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header com progresso */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Checkout - {planName}</h1>
          <p className="text-muted-foreground">
            {userCreated 
              ? "Sua conta foi criada! Agora finalize sua assinatura" 
              : "Complete sua assinatura em apenas 2 etapas simples"
            }
          </p>
          
          {/* Indicador de progresso */}
          <div className="space-y-2">
            <div className="flex justify-center items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === "account" 
                    ? "bg-primary text-primary-foreground" 
                    : accountData 
                      ? "bg-green-600 text-white" 
                      : "bg-muted text-muted-foreground"
                }`}>
                  {accountData ? <CheckCircle className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === "account" ? "text-primary" : accountData ? "text-green-600" : "text-muted-foreground"
                }`}>
                  Conta {userCreated ? "✓" : ""}
                </span>
              </div>
              
              <div className="w-16 h-0.5 bg-muted">
                <div className={`h-full transition-all duration-300 ${
                  accountData ? "w-full bg-green-600" : "w-0 bg-primary"
                }`} />
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === "payment" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === "payment" ? "text-primary" : "text-muted-foreground"
                }`}>
                  Pagamento
                </span>
              </div>
            </div>
            
            <Progress value={getStepProgress()} className="w-full max-w-md mx-auto" />
          </div>
        </div>

        {/* Conteúdo da etapa atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === "account" ? (
                <User className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
              Etapa {currentStep === "account" ? "1" : "2"}: {getStepTitle()}
            </CardTitle>
            <CardDescription>
              {getStepDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === "account" && (
              <AccountCreationStep
                onNext={handleAccountSubmit}
                isLoading={isLoading}
                initialData={accountData}
              />
            )}
            
            {currentStep === "payment" && accountData && (
              <PaymentStep
                planName={planName}
                planPrice={planPrice}
                accountData={{
                  billingName: accountData.billingName,
                  billingEmail: accountData.billingEmail,
                  billingCpfCnpj: accountData.billingCpfCnpj,
                  billingPhone: accountData.billingPhone,
                }}
                onSubmit={handlePaymentSubmit}
                onBack={userCreated ? undefined : handleBackToAccount}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}