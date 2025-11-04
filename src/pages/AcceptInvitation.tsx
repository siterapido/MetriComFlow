import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface InvitationDetails {
  id: string;
  email: string;
  organization_id: string;
  organization_name: string;
  invited_by: string;
  role: "owner" | "admin" | "manager" | "member";
  user_type: "owner" | "traffic_manager" | "sales";
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
}

function useQueryParam(key: string) {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get(key), [location.search, key]);
}

interface PasswordStrength {
  score: number; // 0-4
  label: "muito fraca" | "fraca" | "média" | "forte" | "muito forte";
  color: "text-destructive" | "text-orange-500" | "text-yellow-500" | "text-blue-500" | "text-success";
  bgColor: "bg-destructive/10" | "bg-orange-500/10" | "bg-yellow-500/10" | "bg-blue-500/10" | "bg-success/10";
}

function validatePassword(password: string): PasswordStrength {
  let score = 0;

  // Comprimento
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Maiúsculas
  if (/[A-Z]/.test(password)) score++;

  // Minúsculas
  if (/[a-z]/.test(password)) score++;

  // Números
  if (/[0-9]/.test(password)) score++;

  // Caracteres especiais
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalizar para 0-4
  const normalizedScore = Math.min(Math.floor(score / 1.5), 4);

  const strengths: PasswordStrength[] = [
    { score: 0, label: "muito fraca", color: "text-destructive", bgColor: "bg-destructive/10" },
    { score: 1, label: "fraca", color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { score: 2, label: "média", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { score: 3, label: "forte", color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { score: 4, label: "muito forte", color: "text-success", bgColor: "bg-success/10" },
  ];

  return strengths[normalizedScore] || strengths[0];
}

export default function AcceptInvitation() {
  const token = useQueryParam("token");
  const navigate = useNavigate();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // Password strength validation
  const passwordStrength = validatePassword(password);
  const isPasswordValid = passwordStrength.score >= 2; // "média" ou melhor

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_invitation_by_token", {
        invitation_token: token,
      });

      if (rpcError) {
        console.error("Erro ao validar convite:", rpcError);
        setError("Não foi possível validar o convite. Verifique o link recebido.");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setError("Convite não encontrado ou já utilizado.");
        setLoading(false);
        return;
      }

      const invitationData = data[0] as InvitationDetails;

      if (invitationData.status !== "pending") {
        setError(`Este convite está ${invitationData.status}.`);
        setLoading(false);
        return;
      }

      if (new Date(invitationData.expires_at) < new Date()) {
        setError("Este convite expirou. Solicite um novo ao administrador.");
        setLoading(false);
        return;
      }

      setInvitation(invitationData);
      setLoading(false);
    };

    void fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) {
      setError("Token inválido");
      return;
    }

    if (!session && (!fullName || !password)) {
      setError("Preencha nome completo e senha para criar sua conta.");
      return;
    }

    // Validar força de senha para novos usuários
    if (!session && password) {
      if (!isPasswordValid) {
        setError(`Senha muito fraca (${passwordStrength.label}). Use pelo menos 8 caracteres com maiúsculas, minúsculas e números.`);
        return;
      }
    }

    setAccepting(true);
    setError(null);

    const payload: Record<string, unknown> = { token };
    if (!session) {
      payload.full_name = fullName;
      payload.password = password;
    }

    const { data, error: functionError } = await supabase.functions.invoke<{
      success: boolean;
      message?: string;
      error?: string;
    }>("accept-invitation", {
      body: payload,
    });

    setAccepting(false);

    if (functionError) {
      console.error("Erro ao aceitar convite:", functionError);
      setError(functionError.message ?? "Não foi possível concluir o convite.");
      return;
    }

    if (!data?.success) {
      setError(data?.error ?? "Não foi possível concluir o convite.");
      return;
    }

    toast.success(data?.message ?? "Convite aceito com sucesso! Faça login para começar." );
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Aceitar convite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {loading && <p>Validando convite...</p>}

          {!loading && error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
              {error}
            </div>
          )}

          {!loading && invitation && !error && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  Você foi convidado para a organização
                  <span className="ml-1 font-medium text-foreground">{invitation.organization_name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Acesso destinado ao email <span className="font-medium text-foreground">{invitation.email}</span>
                </p>
              </div>

              {!session && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      placeholder="Digite seu nome"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={accepting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Defina uma senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Crie uma senha segura"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={accepting}
                      className={password ? (isPasswordValid ? "border-success" : "border-destructive") : ""}
                    />

                    {/* Password strength indicator */}
                    {password && (
                      <div className={`rounded-md p-3 ${passwordStrength.bgColor}`}>
                        <div className="flex items-center gap-2">
                          {isPasswordValid ? (
                            <CheckCircle className={`h-4 w-4 ${passwordStrength.color}`} />
                          ) : (
                            <AlertCircle className={`h-4 w-4 ${passwordStrength.color}`} />
                          )}
                          <span className={`text-sm font-medium ${passwordStrength.color}`}>
                            Força: {passwordStrength.label}
                          </span>
                        </div>

                        {/* Password requirements */}
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className={password.length >= 8 ? "text-success" : ""}>
                            • Mínimo 8 caracteres {password.length >= 8 && "✓"}
                          </div>
                          <div className={/[A-Z]/.test(password) ? "text-success" : ""}>
                            • Pelo menos uma maiúscula {/[A-Z]/.test(password) && "✓"}
                          </div>
                          <div className={/[a-z]/.test(password) ? "text-success" : ""}>
                            • Pelo menos uma minúscula {/[a-z]/.test(password) && "✓"}
                          </div>
                          <div className={/[0-9]/.test(password) ? "text-success" : ""}>
                            • Pelo menos um número {/[0-9]/.test(password) && "✓"}
                          </div>
                        </div>

                        {!isPasswordValid && (
                          <p className="mt-2 text-xs text-destructive font-medium">
                            ⚠️ Sua senha é muito fraca. Adicione mais complexidade.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => navigate("/login")}>Voltar ao login</Button>
          <Button
            onClick={handleAccept}
            disabled={
              loading ||
              accepting ||
              !!error ||
              !invitation ||
              (!session && (!fullName || !password || !isPasswordValid))
            }
          >
            {accepting ? "Processando..." : session ? "Aceitar convite" : "Criar conta e entrar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
