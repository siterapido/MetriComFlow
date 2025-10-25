import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => navigate("/login")}>Voltar ao login</Button>
          <Button onClick={handleAccept} disabled={loading || accepting || !!error || !invitation}>
            {accepting ? "Processando..." : session ? "Aceitar convite" : "Criar conta e entrar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
