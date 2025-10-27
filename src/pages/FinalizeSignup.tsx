import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function FinalizeSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const claim = useMemo(
    () => ({
      claimToken: searchParams.get("claim") || "",
      organizationId: searchParams.get("org") || "",
      subscriptionId: searchParams.get("sub") || "",
    }),
    [searchParams]
  );

  const missingClaim = !claim.claimToken || !claim.organizationId || !claim.subscriptionId;

  const handleFinalize = async () => {
    if (!email || !password) {
      toast.error("Informe email e senha.");
      return;
    }
    if (missingClaim) {
      toast.error("Dados de reivindicação inválidos.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      // Attempt to claim the organization by invoking a backend function (to be implemented)
      const { error: claimError } = await supabase.functions.invoke("claim-account", {
        body: {
          claimToken: claim.claimToken,
          organizationId: claim.organizationId,
          subscriptionId: claim.subscriptionId,
        },
      });
      if (claimError) {
        // The function might not exist yet; inform the user gracefully.
        console.warn("claim-account not available:", claimError);
      }

      toast.success(
        "Cadastro criado! Enviamos um email de confirmação. Após confirmar, você poderá acessar o painel."
      );
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      toast.error(String(err?.message || err));
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
              Crie sua conta para reivindicar sua organização e concluir a ativação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missingClaim && (
              <div className="text-sm text-destructive mb-4">
                Dados de reivindicação inválidos ou ausentes. Volte ao checkout e tente novamente.
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button onClick={handleFinalize} disabled={isSubmitting || missingClaim}>
                {isSubmitting ? "Finalizando..." : "Criar conta e finalizar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}