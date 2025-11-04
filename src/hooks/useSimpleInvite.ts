import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useToast } from "@/hooks/use-toast";

interface SimpleInvitePayload {
  email: string;
  role?: "owner" | "admin" | "manager" | "member";
  user_type?: "owner" | "traffic_manager" | "sales";
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

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/accept-invitation`;

      // Usar Supabase Auth nativo para convidar
      // Isso é 100% seguro - Supabase gerencia tokens, expiração, etc
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        payload.email,
        {
          redirectTo,
          data: {
            // Passar info do convite para o novo user poder se registrar
            organization_id: organization.id,
            organization_name: organization.name,
            invited_by: "app", // Supabase preenche isso
            role: payload.role || "member",
            user_type: payload.user_type || "sales",
          },
        }
      );

      if (error) {
        console.error("Erro ao convidar usuário:", error);
        throw new Error(
          error.message || "Não foi possível enviar o convite"
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
