import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useToast } from "@/hooks/use-toast";

interface SimpleInvitePayload {
  email: string;
  role?: "owner" | "admin" | "manager" | "member";
  user_type?: "owner" | "traffic_manager" | "sales" | "crm_user";
}

/**
 * SOLUÇÃO SIMPLES E SEGURA
 *
 * Usa Supabase Auth nativo inviteUserByEmail ao invés de tabela custom.
 *
 * Fluxo:
 * 1. Owner/Admin chama inviteUserByEmail
 * 2. Supabase envia email com magic link (token criptografado)
 * 3. Novo user clica link e é redirecionado para /accept-invitation
 * 4. Seu app verifica token e cria membership com role
 *
 * Segurança:
 * ✅ Tokens criptografados pelo Supabase
 * ✅ Email verification obrigatória
 * ✅ Expiração automática (24h)
 * ✅ Sem triggers complexos
 * ✅ Auditoria nativa do Supabase
 */
export function useSimpleInvite() {
  const { data: organization } = useActiveOrganization();
  const { toast } = useToast();

  const inviteMutation = useMutation({
    mutationFn: async (payload: SimpleInvitePayload) => {
      if (!organization) {
        throw new Error("Nenhuma organização ativa");
      }

      // Convite deve ser feito no servidor usando SERVICE_ROLE
      // Chama Edge Function `send-invite` passando o token do usuário atual
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const { data, error } = await supabase.functions.invoke(
        "send-invite",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            email: payload.email,
            role: payload.role || "member",
            user_type: payload.user_type || "sales",
            organization_id: organization.id,
          },
        }
      );

      if (error) {
        console.error("Erro ao convidar usuário:", error);
        throw new Error(
          (error as any)?.message || "Não foi possível enviar o convite"
        );
      }

      return {
        success: true,
        email: payload.email,
        message: `Convite enviado para ${payload.email}. Link válido por 24 horas.`,
      };
    },

    onSuccess: (data) => {
      toast({
        title: "Convite enviado",
        description: data.message,
        variant: "default",
      });
    },

    onError: (error) => {
      toast({
        title: "Erro ao enviar convite",
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  return {
    inviteUser: inviteMutation.mutate,
    inviteUserAsync: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    error: inviteMutation.error,
    isSuccess: inviteMutation.isSuccess,
  };
}
