import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * PÁGINA SIMPLIFICADA DE ACEITAÇÃO DE CONVITE
 *
 * Fluxo:
 * 1. Supabase redireciona para /accept-invitation?token=xxx
 * 2. Token vem na URL de forma segura (criptografado pelo Supabase)
 * 3. Supabase Auth verifica o token automaticamente
 * 4. Se válido, user é redirecionado para /dashboard
 * 5. Trigger handle_new_user cria membership
 *
 * Segurança:
 * ✅ Supabase cuida da validação do token
 * ✅ Sem lógica de expiração custom
 * ✅ Sem BD queries complicadas
 */
export default function SimpleAcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, loading } = useAuth();

  const [status, setStatus] = useState<"loading" | "processing" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");

  // Verificar se user foi autenticado (Supabase já validou o token)
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      // Se não tem token na URL, algo deu errado
      if (!token) {
        setStatus("error");
        setError("Link de convite inválido ou expirado");
        return;
      }

      // Se user já está autenticado, vamos criar a membership
      if (user && session) {
        try {
          setStatus("processing");

          // Assumir que a organização e role já foram passados no user metadata
          // via inviteUserByEmail({ data: { organization_id, role, ... } })
          const orgId = (user.user_metadata?.organization_id as string) || null;
          const role = (user.user_metadata?.role as string) || "member";

          if (!orgId) {
            throw new Error("Informações de organização não encontradas");
          }

          // Supabase já cria o profile e membership via triggers
          // Só precisamos redirecionar
          setStatus("success");

          // Redirecionar após 1 segundo
          setTimeout(() => {
            navigate("/dashboard");
          }, 1000);
        } catch (err) {
          console.error("Erro ao processar convite:", err);
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao processar o convite"
          );
        }
      } else if (!loading) {
        // User não está autenticado
        // Redirecionar para login/registro com o token
        // (Supabase Handle redirecionar automaticamente)
        setStatus("loading");
      }
    };

    checkAuth();
  }, [token, user, session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Completando registro...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Bem-vindo!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Seu registro foi concluído. Redirecionando para o dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Erro ao processar convite
            </CardTitle>
            <CardDescription>Algo deu errado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">
                {error || "O link de convite é inválido ou expirou"}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/")}
              >
                Voltar ao login
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate("/equipe")}
              >
                Ir para equipe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
