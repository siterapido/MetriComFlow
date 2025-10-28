import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckoutForm } from "@/components/subscription/CheckoutForm";
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

  const handleSubmit = async (formData: any) => {
    if (!plan) {
      toast.error("Plano inválido.");
      return;
    }
    setSubmitting(true);
    try {
      const paymentMethod = formData.paymentMethod; // CREDIT_CARD | PIX | BOLETO

      // Parse expiry
      let expiryMonth = "";
      let expiryYear = "";
      if (paymentMethod === "CREDIT_CARD" && formData.creditCard?.expiry) {
        const [mm, yy] = String(formData.creditCard.expiry).split("/");
        expiryMonth = mm;
        // Convert YY to YYYY (assume 20YY)
        expiryYear = yy?.length === 2 ? `20${yy}` : yy;
      }

      const requestBody = {
        planSlug: plan.slug,
        billingName: formData.billingName,
        billingEmail: formData.billingEmail,
        billingCpfCnpj: stripNonNumeric(formData.billingCpfCnpj),
        billingPhone: stripNonNumeric(formData.billingPhone),
        billingAddress: {
          postalCode: stripNonNumeric(formData.postalCode),
          addressNumber: formData.addressNumber,
          street: formData.street?.trim(),
          province: formData.province?.trim(),
          city: formData.city?.trim(),
          state: formData.state?.trim().toUpperCase(),
          addressComplement: formData.complement || undefined,
        },
        billingType: paymentMethod,
        creditCard:
          paymentMethod === "CREDIT_CARD"
            ? {
                holderName: formData.creditCard.holderName,
                number: String(formData.creditCard.number).replace(/\s/g, ""),
                expiryMonth,
                expiryYear,
                ccv: stripNonNumeric(formData.creditCard.ccv),
              }
            : undefined,
      };

      console.log("📤 Sending to Edge Function:", JSON.stringify({
        ...requestBody,
        creditCard: requestBody.creditCard ? { ...requestBody.creditCard, number: '****', ccv: '***' } : undefined
      }, null, 2));

      // Use fetch directly to get better error messages
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

      toast.success("Assinatura criada com sucesso! Redirecionando...");

      // Redirect to finalize signup with claim data
      const nextUrl = `/finalizar-cadastro?org=${encodeURIComponent(
        data.organizationId
      )}&sub=${encodeURIComponent(data.subscriptionId)}&claim=${encodeURIComponent(
        data.claimToken || ""
      )}&email=${encodeURIComponent(formData.billingEmail)}`;
      navigate(nextUrl);
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
