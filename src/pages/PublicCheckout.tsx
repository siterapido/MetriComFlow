import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TwoStepCheckout } from "@/components/subscription/TwoStepCheckout";
import { type AccountData } from "@/components/subscription/AccountCreationStep";
import { type PaymentData } from "@/components/subscription/PaymentStep";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { stripNonNumeric } from "@/lib/cpf-cnpj-validator";
import { formatDateTime } from "@/lib/formatters";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_period: "monthly" | "yearly";
};

export default function PublicCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFinalizeUrl, setPendingFinalizeUrl] = useState<string | null>(null);
  const [loggedInAfterCheckout, setLoggedInAfterCheckout] = useState(false);

  const planParam = useMemo(() => searchParams.get("plan") || "", [searchParams]);

  useEffect(() => {
    const fetchPlan = async () => {
      setLoadingPlan(true);
      try {
        if (!planParam) {
          toast("Selecione um plano na página inicial para continuar.");
          return;
        }
        // Try by slug first
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("id, name, slug, price, billing_period")
          .eq("slug", planParam)
          .single();

        let planData: Plan | null = data as Plan | null;

        if (error) {
          // Fallback: try by id
          const res = await supabase
            .from("subscription_plans")
            .select("id, name, slug, price, billing_period")
            .eq("id", planParam)
            .single();
          planData = res.data as Plan | null;
        }

        if (!planData) {
          toast.error("Plano não encontrado. Volte e selecione um plano.");
          return;
        }
        setPlan(planData);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar plano.");
      } finally {
        setLoadingPlan(false);
      }
    };
    fetchPlan();
  }, [planParam]);

  const handleSubmit = async (accountData: AccountData, paymentData: PaymentData) => {
    if (!plan) {
      toast.error("Plano inválido.");
      return;
    }
    setSubmitting(true);
    try {
      setPendingFinalizeUrl(null);
      setLoggedInAfterCheckout(false);
      const paymentMethod = paymentData.paymentMethod; // CREDIT_CARD
      const password = accountData.accountPassword;
      const email = accountData.billingEmail.trim().toLowerCase();
      const sanitizedPhone = stripNonNumeric(accountData.billingPhone);
      const sanitizedCpfCnpj = stripNonNumeric(accountData.billingCpfCnpj);
      const sanitizedPostalCode = stripNonNumeric(accountData.postalCode);

      let loggedIn = false;
      let accountReady = false;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: accountData.billingName,
            phone: sanitizedPhone,
            document: sanitizedCpfCnpj,
          },
        },
      });

      if (signUpError) {
        const msg = String(signUpError.message || signUpError).toLowerCase();
        const isAlreadyRegistered =
          msg.includes("already") || msg.includes("registrado") || msg.includes("existing");

        if (isAlreadyRegistered) {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            throw new Error(
              "Email já cadastrado. Use sua senha atual ou recupere o acesso para continuar."
            );
          }
          accountReady = true;
          loggedIn = true;
        } else {
          throw signUpError;
        }
      } else {
        accountReady = true;
        const currentSession = signUpData?.session;
        if (currentSession) {
          loggedIn = true;
        } else {
          const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!loginError && sessionData.session) {
            loggedIn = true;
          } else if (loginError) {
            console.warn("Falha ao obter sessão após signUp:", loginError);
          }
        }

        // Promote new user to owner with organization creation
        if (signUpData?.user) {
          try {
            const { error: promoteError } = await supabase.functions.invoke("promote-owner", {
              body: { userId: signUpData.user.id }
            });
            if (promoteError) {
              console.warn("Falha ao promover usuário a owner:", promoteError);
            } else {
              console.log("Usuário promovido a owner com sucesso");
            }
          } catch (promoteErr) {
            console.warn("Erro ao promover usuário:", promoteErr);
          }
        }
      }

      if (!accountReady) {
        throw new Error("Não foi possível validar sua conta. Tente novamente em instantes.");
      }

      // Parse expiry
      let expiryMonth = "";
      let expiryYear = "";
      if (paymentMethod === "CREDIT_CARD" && paymentData.creditCard?.expiry) {
        const [mm, yy] = String(paymentData.creditCard.expiry).split("/");
        expiryMonth = mm;
        // Convert YY to YYYY (assume 20YY)
        expiryYear = yy?.length === 2 ? `20${yy}` : yy;
      }

      const creditCardData = paymentData.creditCard;

      const requestBody = {
        planSlug: plan.slug,
        billingName: accountData.billingName,
        billingEmail: email,
        billingCpfCnpj: sanitizedCpfCnpj,
        billingPhone: sanitizedPhone,
        billingAddress: {
          postalCode: sanitizedPostalCode,
          addressNumber: accountData.addressNumber,
          street: accountData.street?.trim(),
          province: accountData.province?.trim(),
          city: accountData.city?.trim(),
          state: accountData.state?.trim().toUpperCase(),
          addressComplement: accountData.complement || undefined,
        },
        billingType: paymentMethod,
        creditCard:
          paymentMethod === "CREDIT_CARD" && creditCardData
            ? {
                holderName: creditCardData.holderName ?? "",
                number: String(creditCardData.number ?? "").replace(/\s/g, ""),
                expiryMonth,
                expiryYear,
                ccv: stripNonNumeric(creditCardData.ccv ?? ""),
              }
            : undefined,
      };

      console.log("📤 Sending to Edge Function:", JSON.stringify({
        ...requestBody,
        creditCard: requestBody.creditCard ? { ...requestBody.creditCard, number: '****', ccv: '***' } : undefined
      }, null, 2));

      // Use fetch directly to get better error messages
      // Sanitize env vars to avoid header/query issues with stray newlines
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim();
      const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuração do Supabase ausente. Verifique suas variáveis de ambiente.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-asaas-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("📦 Response Status:", response.status, response.statusText);
      console.log("📦 Response Body:", responseText);

      let data;
      let error = null;

      try {
        data = JSON.parse(responseText);
      } catch {
        error = new Error(`Invalid response: ${responseText}`);
      }

      // Check for HTTP errors
      if (!response.ok || error) {
        const errorMsg = data?.error || error?.message || "Erro ao processar pagamento";
        console.error("❌ Checkout failed:", errorMsg);
        toast.error(errorMsg, {
          description: "Por favor, verifique os dados e tente novamente."
        });
        throw new Error(errorMsg);
      }

      if (!data?.success) {
        console.error("API returned error:", data);
        const errorMsg = data?.error || "Falha ao criar assinatura.";

        // Show user-friendly error without technical details
        toast.error(errorMsg, {
          duration: 10000,
          description: "Por favor, verifique os dados informados e tente novamente."
        });
        throw new Error(errorMsg);
      }

      if (!data.organizationId || !data.subscriptionId || !data.claimToken) {
        throw new Error("Retorno inválido do checkout. Entre em contato com o suporte.");
      }

      let claimSucceeded = false;

      setLoggedInAfterCheckout(loggedIn);

      if (loggedIn) {
        const { data: claimData, error: claimError } = await supabase.functions.invoke("claim-account", {
          body: {
            claimToken: data.claimToken,
            organizationId: data.organizationId,
            subscriptionId: data.subscriptionId,
          },
        });

        if (claimError) {
          console.warn("Falha ao invocar claim-account:", claimError);
        }

        if (claimData?.success) {
          claimSucceeded = true;
        }
      }

      const finalizeUrl = `/finalizar-cadastro?org=${encodeURIComponent(
        data.organizationId
      )}&sub=${encodeURIComponent(data.subscriptionId)}&claim=${encodeURIComponent(
        data.claimToken || ""
      )}&email=${encodeURIComponent(email)}`;



      if (claimSucceeded) {
        toast.success("Assinatura criada! Redirecionando para o painel...");
        navigate("/dashboard");
        return;
      }

      toast.success(
        loggedIn
          ? "Assinatura criada! Finalize a configuração da sua conta em seguida."
          : "Assinatura criada! Verifique seu email e finalize o cadastro."
      );
      navigate(finalizeUrl);
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      toast.error(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>
              Conclua a contratação do seu plano. Após o pagamento, você poderá finalizar seu cadastro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPlan && <div className="text-sm text-muted-foreground">Carregando plano...</div>}
            {!loadingPlan && !plan && (
              <div className="space-y-3">
                <div className="text-sm text-destructive">Plano inválido ou não informado.</div>
                <Button onClick={() => navigate("/", { replace: true })}>Voltar para início</Button>
              </div>
            )}
            {!loadingPlan && plan && (
              <TwoStepCheckout
                planName={plan.name}
                planPrice={plan.price}
                onSubmit={handleSubmit}
                isLoading={submitting}
              />
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  );
}
