import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, AlertCircle, UserPlus, LogIn } from "lucide-react";

interface InvitationDetails {
  id: string;
  email: string;
  organization_id: string;
  organization_name: string;
  invited_by: string;
  role: "owner" | "admin" | "manager" | "member";
  user_type: "owner" | "traffic_manager" | "sales" | "crm_user";
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
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Password strength validation (for signup)
  const passwordStrength = validatePassword(signupPassword);
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

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError("Preencha email e senha para fazer login.");
      return;
    }

    setAccepting(true);
    setError(null);

    // Step 1: Login
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (loginError) {
      setAccepting(false);
      setError("Email ou senha incorretos.");
      return;
    }

    // Step 2: Aceitar convite com sessão autenticada
    await handleAcceptInvitation(true);
  };

  const handleSignup = async () => {
    if (!signupEmail || !fullName || !signupPassword) {
      setError("Preencha todos os campos para criar sua conta.");
      return;
    }

    if (!isPasswordValid) {
      setError(`Senha muito fraca (${passwordStrength.label}). Use pelo menos 8 caracteres com maiúsculas, minúsculas e números.`);
      return;
    }

    await handleAcceptInvitation(false);
  };

  const handleAcceptInvitation = async (isExistingUser: boolean) => {
    if (!token) {
      setError("Token inválido");
      return;
    }

    setAccepting(true);
    setError(null);

    const payload: Record<string, unknown> = { token };

    if (!isExistingUser) {
      payload.email = signupEmail;
      payload.full_name = fullName;
      payload.password = signupPassword;
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

    toast.success(data?.message ?? "Convite aceito com sucesso!");

    if (isExistingUser) {
      // Se já estava logado, redireciona para dashboard
      navigate("/dashboard", { replace: true });
    } else {
      // Se criou nova conta, redireciona para login
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Aceitar convite</CardTitle>
          <CardDescription>
            {invitation && `Você foi convidado para a organização ${invitation.organization_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-center text-muted-foreground">Validando convite...</p>}

          {!loading && error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && invitation && !session && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signup" | "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar conta
                </TabsTrigger>
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Já tenho conta
                </TabsTrigger>
              </TabsList>

              {/* TAB: Criar nova conta */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup_email">Email</Label>
                  <Input
                    id="signup_email"
                    type="email"
                    placeholder="seu-email@empresa.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={accepting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este será seu email para acessar a plataforma
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input
                    id="full_name"
                    placeholder="Digite seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={accepting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup_password">Senha</Label>
                  <Input
                    id="signup_password"
                    type="password"
                    placeholder="Crie uma senha segura"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={accepting}
                    className={signupPassword ? (isPasswordValid ? "border-success" : "border-destructive") : ""}
                  />

                  {/* Password strength indicator */}
                  {signupPassword && (
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
                        <div className={signupPassword.length >= 8 ? "text-success" : ""}>
                          • Mínimo 8 caracteres {signupPassword.length >= 8 && "✓"}
                        </div>
                        <div className={/[A-Z]/.test(signupPassword) ? "text-success" : ""}>
                          • Pelo menos uma maiúscula {/[A-Z]/.test(signupPassword) && "✓"}
                        </div>
                        <div className={/[a-z]/.test(signupPassword) ? "text-success" : ""}>
                          • Pelo menos uma minúscula {/[a-z]/.test(signupPassword) && "✓"}
                        </div>
                        <div className={/[0-9]/.test(signupPassword) ? "text-success" : ""}>
                          • Pelo menos um número {/[0-9]/.test(signupPassword) && "✓"}
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

                <Button
                  className="w-full"
                  onClick={handleSignup}
                  disabled={accepting || !signupEmail || !fullName || !signupPassword || !isPasswordValid}
                >
                  {accepting ? "Criando conta..." : "Criar conta e aceitar convite"}
                </Button>
              </TabsContent>

              {/* TAB: Fazer login com conta existente */}
              <TabsContent value="login" className="space-y-4 mt-4">
                <Alert>
                  <AlertDescription>
                    Se você já possui uma conta, faça login para aceitar o convite.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="login_email">Email</Label>
                  <Input
                    id="login_email"
                    type="email"
                    placeholder="seu-email@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={accepting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login_password">Senha</Label>
                  <Input
                    id="login_password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={accepting}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={accepting || !loginEmail || !loginPassword}
                >
                  {accepting ? "Entrando..." : "Fazer login e aceitar convite"}
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {!loading && invitation && session && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Você já está logado. Clique em "Aceitar convite" para continuar.
                </AlertDescription>
              </Alert>
              <Button
                className="w-full"
                onClick={() => handleAcceptInvitation(true)}
                disabled={accepting}
              >
                {accepting ? "Processando..." : "Aceitar convite"}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
            Voltar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
