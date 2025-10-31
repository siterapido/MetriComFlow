import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type ClaimState = {
  token: string | null;
  organizationId: string | null;
  subscriptionId: string | null;
  status: string | null;
  sessionId: string | null;
  planSlug: string | null;
};

export default function FinalizeSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryValues = useMemo(() => {
    const claimToken = searchParams.get("claim");
    const organizationId = searchParams.get("org");
    const subscriptionId = searchParams.get("sub");
    const sessionId = searchParams.get("session_id");
    const emailParam = searchParams.get("email");
    const statusParam = searchParams.get("claim_status");

    return {
      claimToken,
      organizationId,
      subscriptionId,
      sessionId,
      emailParam,
      statusParam,
    };
  }, [searchParams]);

  const [email, setEmail] = useState(queryValues.emailParam ?? "");
  const [password, setPassword] = useState("");
  const [claim, setClaim] = useState<ClaimState>({
    token: queryValues.claimToken,
    organizationId: queryValues.organizationId,
    subscriptionId: queryValues.subscriptionId,
    status: queryValues.statusParam ?? (queryValues.claimToken ? "pending" : null),
    sessionId: queryValues.sessionId,
    planSlug: null,
  });
  const [isFetchingClaim, setIsFetchingClaim] = useState<boolean>(
    Boolean(queryValues.sessionId) && !queryValues.claimToken,
  );
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setClaim((prev) => ({
      ...prev,
      token: queryValues.claimToken,
      organizationId: queryValues.organizationId,
      subscriptionId: queryValues.subscriptionId,
      sessionId: queryValues.sessionId,
      status:
        queryValues.statusParam ??
        (queryValues.claimToken
          ? prev.status ?? "pending"
          : prev.status),
    }));
    if (queryValues.emailParam && queryValues.emailParam !== email) {
      setEmail(queryValues.emailParam);
    }
  }, [
    email,
    queryValues.claimToken,
    queryValues.organizationId,
    queryValues.subscriptionId,
    queryValues.sessionId,
    queryValues.statusParam,
    queryValues.emailParam,
  ]);

  useEffect(() => {
    if (!claim.sessionId) {
      setIsFetchingClaim(false);
      return;
    }
    if (claim.token) {
      setIsFetchingClaim(false);
      return;
    }

    let isCancelled = false;
    setIsFetchingClaim(true);
    setClaimError(null);

    supabase.functions
      .invoke("checkout-session-claim", {
        body: { sessionId: claim.sessionId },
      })
      .then(({ data, error }) => {
        if (isCancelled) return;
        if (error) {
          throw new Error(error.message || "Falha ao localizar a sessão de checkout.");
        }
        if (!data?.success) {
          throw new Error(data?.error || "Checkout não encontrado ou expirado.");
        }

        setClaim({
          token: data.claimToken,
          organizationId: data.organizationId,
          subscriptionId: data.subscriptionId,
          status: data.status ?? "pending",
          sessionId: claim.sessionId,
          planSlug: data.planSlug ?? null,
        });
        if (data.email) {
          setEmail(data.email);
        }
      })
      .catch((err) => {
        console.error("checkout-session-claim failed:", err);
        setClaimError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!isCancelled) {
          setIsFetchingClaim(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [claim.sessionId, claim.token]);

  const missingClaim = !claim.token || !claim.organizationId || !claim.subscriptionId;
  const claimCompleted = claim.status === "completed";

  const handleFinalize = async () => {
    if (!email || !password) {
      toast.error("Informe email e senha.");
      return;
    }
    if (missingClaim) {
      toast.error("Dados de compra não encontrados. Verifique o link recebido por email.");
      return;
    }
    if (claimCompleted) {
      toast.info("Este cadastro já foi finalizado. Faça login para continuar.");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("complete-stripe-signup", {
        body: {
          claimToken: claim.token,
          password,
        },
      });
      if (error) {
        throw new Error(error.message || "Falha ao concluir cadastro.");
      }
      if (!data?.success) {
        throw new Error(data?.error || "Não foi possível completar o cadastro.");
      }

      const finalEmail = (data.email as string | undefined) ?? email;
      setEmail(finalEmail);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (signInError) {
        toast.success("Senha definida! Faça login para acessar sua conta.");
        navigate(`/login?email=${encodeURIComponent(finalEmail)}`);
        return;
      }

      toast.success("Cadastro finalizado com sucesso! Bem-vindo ao Insightfy.");
      setClaim((prev) => ({ ...prev, status: "completed" }));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("complete-stripe-signup failed:", err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Finalizar cadastro</CardTitle>
            <CardDescription>
              Pagamento confirmado! Defina uma senha para acessar o Insightfy e gerenciar sua nova organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {claimError && (
              <div className="mb-4 text-sm text-destructive">
                {claimError}
              </div>
            )}

            {isFetchingClaim && (
              <div className="mb-4 text-sm text-muted-foreground">
                Validando sua compra... isso pode levar alguns segundos.
              </div>
            )}

            {claimCompleted && (
              <div className="mb-4 text-sm text-muted-foreground">
                Este cadastro já foi finalizado. Faça login com sua senha para continuar.
              </div>
            )}

            {missingClaim && !isFetchingClaim && !claimError && (
              <div className="mb-4 text-sm text-destructive">
                Não encontramos os dados do checkout. Use o link enviado por email ou conclua o pagamento novamente.
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={isFetchingClaim || claimCompleted}
                  readOnly={Boolean(claim.token)}
                />
                {Boolean(claim.token) && (
                  <p className="text-xs text-muted-foreground">
                    Utilizaremos o mesmo email informado no Stripe para criar sua conta.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Defina uma senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isFetchingClaim || claimCompleted}
                />
              </div>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isFetchingClaim || missingClaim || claimCompleted}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  "Ativar acesso"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
