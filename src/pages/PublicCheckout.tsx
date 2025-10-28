import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckoutForm, type CheckoutFormData } from "@/components/subscription/CheckoutForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { stripNonNumeric } from "@/lib/cpf-cnpj-validator";
import { Copy, ExternalLink, QrCode, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

type PixPaymentDetails = {
  paymentId?: string | null;
  status?: string | null;
  dueDate?: string | null;
  pixExpiresAt?: string | null;
  copyPasteCode?: string | null;
  qrCodeImage?: string | null;
  paymentLink?: string | null;
};

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
  const [pixDetails, setPixDetails] = useState<PixPaymentDetails | null>(null);
  const [pendingFinalizeUrl, setPendingFinalizeUrl] = useState<string | null>(null);
  const [loggedInAfterCheckout, setLoggedInAfterCheckout] = useState(false);
  const [pixClaimSuccess, setPixClaimSuccess] = useState(false);

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

  const handleSubmit = async (formData: CheckoutFormData) => {
    if (!plan) {
      toast.error("Plano inválido.");
      return;
    }
    setSubmitting(true);
    try {
      setPixDetails(null);
      setPendingFinalizeUrl(null);
      setPixClaimSuccess(false);
      setLoggedInAfterCheckout(false);
      const paymentMethod = formData.paymentMethod; // CREDIT_CARD | PIX
      const password = formData.accountPassword;
      const email = formData.billingEmail.trim().toLowerCase();
      const sanitizedPhone = stripNonNumeric(formData.billingPhone);
      const sanitizedCpfCnpj = stripNonNumeric(formData.billingCpfCnpj);
      const sanitizedPostalCode = stripNonNumeric(formData.postalCode);

      let loggedIn = false;
      let accountReady = false;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: formData.billingName,
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
      }

      if (!accountReady) {
        throw new Error("Não foi possível validar sua conta. Tente novamente em instantes.");
      }

      // Parse expiry
      let expiryMonth = "";
      let expiryYear = "";
      if (paymentMethod === "CREDIT_CARD" && formData.creditCard?.expiry) {
        const [mm, yy] = String(formData.creditCard.expiry).split("/");
        expiryMonth = mm;
        // Convert YY to YYYY (assume 20YY)
        expiryYear = yy?.length === 2 ? `20${yy}` : yy;
      }

      const creditCardData = formData.creditCard;

      const requestBody = {
        planSlug: plan.slug,
        billingName: formData.billingName,
        billingEmail: email,
        billingCpfCnpj: sanitizedCpfCnpj,
        billingPhone: sanitizedPhone,
        billingAddress: {
          postalCode: sanitizedPostalCode,
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
                holderName: creditCardData?.holderName ?? "",
                number: String(creditCardData?.number ?? "").replace(/\s/g, ""),
                expiryMonth,
                expiryYear,
                ccv: stripNonNumeric(creditCardData?.ccv ?? ""),
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

      if (paymentMethod === "PIX") {
        const pixPayload: PixPaymentDetails | null = data.pixDetails
          ? {
              ...data.pixDetails,
              paymentLink: data.pixDetails.paymentLink ?? data.paymentLink ?? null,
            }
          : data.paymentLink
          ? {
              paymentLink: data.paymentLink,
            }
          : null;

        setPixDetails(pixPayload);
        setPendingFinalizeUrl(finalizeUrl);
        setPixClaimSuccess(claimSucceeded);

        if (pixPayload?.copyPasteCode || pixPayload?.paymentLink) {
          toast.success("Cobrança via PIX gerada! Utilize o QR Code ou código para pagar.");
        } else {
          toast.success("Cobrança via PIX criada. Enviamos as instruções por email.");
        }

        return;
      }

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
              <CheckoutForm
                planName={plan.name}
                planPrice={plan.price}
                onSubmit={handleSubmit}
                isLoading={submitting}
                onPaymentMethodChange={(method) => {
                  if (method !== "PIX") {
                    setPixDetails(null);
                    setPendingFinalizeUrl(null);
                    setPixClaimSuccess(false);
                  }
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {pixDetails && (
        <div className="max-w-3xl mx-auto mt-6">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <QrCode className="w-5 h-5 text-primary" />
                Pagamento PIX gerado
              </CardTitle>
              <CardDescription>
                Escaneie o QR Code ou copie o código para concluir o pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="rounded-lg border border-border bg-muted/40 flex items-center justify-center p-4 min-h-[220px]">
                  {pixDetails.qrCodeImage ? (
                    <img
                      src={
                        pixDetails.qrCodeImage.startsWith("http") || pixDetails.qrCodeImage.startsWith("data:")
                          ? pixDetails.qrCodeImage
                          : `data:image/png;base64,${pixDetails.qrCodeImage}`
                      }
                      alt="QR Code PIX"
                      className="max-w-full max-h-[200px]"
                    />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      QR Code indisponível. Utilize o código copia e cola.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Status do pagamento: <span className="font-medium text-foreground">{pixDetails.status || "PENDING"}</span>
                    </div>
                    {pixDetails.pixExpiresAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Código válido até {formatDateTime(pixDetails.pixExpiresAt)}
                      </div>
                    )}
                    {!pixDetails.pixExpiresAt && pixDetails.dueDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Vencimento em {formatDateTime(pixDetails.dueDate)}
                      </div>
                    )}
                  </div>

                  {pixDetails.copyPasteCode && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-foreground">PIX Copia e Cola</span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <div className="bg-muted border border-border rounded-md p-3 text-xs font-mono break-all select-all">
                            {pixDetails.copyPasteCode}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(pixDetails.copyPasteCode || "");
                              toast.success("Código PIX copiado!");
                            } catch (copyErr) {
                              console.error(copyErr);
                              toast.error("Não foi possível copiar o código PIX.");
                            }
                          }}
                          className="shrink-0"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar código
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {pixDetails.paymentLink && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => window.open(pixDetails.paymentLink ?? "", "_blank", "noopener")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir link PIX
                      </Button>
                    )}
                    {pendingFinalizeUrl && (
                      <Button
                        type="button"
                        onClick={() => navigate(pendingFinalizeUrl)}
                        disabled={!loggedInAfterCheckout && !pixClaimSuccess}
                      >
                        Finalizar cadastro
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Assim que o pagamento for confirmado, você receberá um email. {pixClaimSuccess
                      ? "Sua conta já está vinculada à organização."
                      : "Finalize o cadastro após o pagamento para acessar o painel."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
