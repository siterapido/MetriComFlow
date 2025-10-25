import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useToast } from "@/hooks/use-toast";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface TeamInvitation {
  id: string;
  email: string;
  role: "owner" | "admin" | "manager" | "member";
  user_type: "owner" | "traffic_manager" | "sales";
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  invited_by: string;
  organization_id: string;
  metadata: Record<string, unknown> | null;
  invite_link?: string;
}

export interface InvitationPayload {
  email: string;
  role: "owner" | "admin" | "manager" | "member";
  user_type: "owner" | "traffic_manager" | "sales";
}

export function useInvitations() {
  const queryClient = useQueryClient();
  const { data: organization } = useActiveOrganization();
  const { toast } = useToast();

  const invitationsQuery = useQuery({
    queryKey: ["team-invitations", organization?.id],
    queryFn: async (): Promise<TeamInvitation[]> => {
      if (!organization) return [];

      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar convites pendentes:", error);
        throw error;
      }

      return data ?? [];
    },
    enabled: !!organization?.id,
  });

  const sendInvitation = useMutation({
    mutationFn: async (payload: InvitationPayload) => {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        invite_link?: string;
        message?: string;
        error?: string;
      }>("send-team-invitation", {
        body: payload,
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error ?? "Não foi possível enviar o convite.");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast({
        title: "Convite enviado",
        description: data?.message ?? "O membro receberá um email com instruções.",
      });
    },
    onError: (error) => {
      console.error("Erro ao enviar convite:", error);
      toast({
        title: "Erro ao enviar convite",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast({
        title: "Convite revogado",
        description: "O convite não poderá mais ser utilizado.",
      });
    },
    onError: (error) => {
      console.error("Erro ao revogar convite:", error);
      toast({
        title: "Erro ao revogar convite",
        description: "Não foi possível revogar o convite.",
        variant: "destructive",
      });
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitation: TeamInvitation) => {
      const { error: revokeError } = await supabase
        .from("team_invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      if (revokeError) throw revokeError;

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        invite_link?: string;
        message?: string;
        error?: string;
      }>("send-team-invitation", {
        body: {
          email: invitation.email,
          role: invitation.role,
          user_type: invitation.user_type,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error ?? "Não foi possível reenviar o convite.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      toast({
        title: "Convite reenviado",
        description: "Um novo link foi enviado para o email informado.",
      });
    },
    onError: (error) => {
      console.error("Erro ao reenviar convite:", error);
      toast({
        title: "Erro ao reenviar convite",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    invitations: invitationsQuery.data ?? [],
    isLoading: invitationsQuery.isLoading,
    sendInvitation: sendInvitation.mutateAsync,
    revokeInvitation: revokeInvitation.mutateAsync,
    resendInvitation: resendInvitation.mutateAsync,
    isSending: sendInvitation.isPending,
    isRevoking: revokeInvitation.isPending,
    isResending: resendInvitation.isPending,
  };
}
