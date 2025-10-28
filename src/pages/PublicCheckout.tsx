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

      const { data, error } = await supabase.functions.invoke("create-asaas-subscription", {
        body: {
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
        },
      });

      console.log("📦 API Response:", { data, error });

      if (error) {
        console.error("Edge Function error:", error);
        const errorMsg = error.message || "Erro ao comunicar com servidor";
        toast.error(errorMsg);
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
