import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckoutForm, type CheckoutFormData } from "@/components/subscription/CheckoutForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { stripNonNumeric } from "@/lib/cpf-cnpj-validator";

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

  const handleSubmit = async (checkoutData: CheckoutFormData) => {
    if (!plan) {
      toast.error("Plano inválido.");
      return;
    }
    setSubmitting(true);
    try {
      const billingEmail = checkoutData.billingEmail.trim().toLowerCase();
      const sanitizedPhone = stripNonNumeric(checkoutData.billingPhone);
      const sanitizedCpfCnpj = stripNonNumeric(checkoutData.billingCpfCnpj);
      const sanitizedPostalCode = checkoutData.postalCode
        ? stripNonNumeric(checkoutData.postalCode)
        : "";

      const requestBody = {
        planSlug: plan.slug,
        billingName: checkoutData.billingName,
        billingEmail,
        billingCpfCnpj: sanitizedCpfCnpj,
        billingPhone: sanitizedPhone,
        billingAddress: {
          postalCode: sanitizedPostalCode,
          addressNumber: checkoutData.addressNumber,
          street: checkoutData.street?.trim(),
          province: checkoutData.province?.trim(),
          city: checkoutData.city?.trim(),
          state: checkoutData.state ? checkoutData.state.trim().toUpperCase() : undefined,
          addressComplement: checkoutData.complement || undefined,
        },
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

      const response = await fetch(`${supabaseUrl}/functions/v1/create-stripe-checkout`, {
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

      if (!data.checkoutUrl) {
        throw new Error("Checkout da Stripe não retornou URL de pagamento.");
      }
      toast.success("Redirecionando para pagamento seguro...");
      window.location.href = data.checkoutUrl;
      return;
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
              <CheckoutForm
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
