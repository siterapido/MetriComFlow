import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useToast } from "@/hooks/use-toast";
import type { Database, Tables } from "@/lib/database.types";

type ProfileRow = Tables<"profiles">;
type MembershipRow = Tables<"organization_memberships">;

export interface TeamMember {
  membershipId: string;
  organizationId: string;
  role: MembershipRow["role"];
  joinedAt: string;
  profile: Pick<
    ProfileRow,
    "id" | "full_name" | "email" | "avatar_url" | "user_type"
  >;
}

interface UpdateMemberRolePayload {
  membershipId: string;
  role: MembershipRow["role"];
}

export function useTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: organization } = useActiveOrganization();
  const { toast } = useToast();

  const membersQuery = useQuery({
    queryKey: ["organization-team", organization?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!organization) return [];

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(
          `
          id,
          organization_id,
          role,
          joined_at,
          is_active,
          profiles (
            id,
            full_name,
            email,
            avatar_url,
            user_type
          )
        `,
        )
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar membros da organização:", error);
        throw error;
      }

      return (
        data?.map((row) => ({
          membershipId: row.id,
          organizationId: row.organization_id,
          role: row.role as MembershipRow["role"],
          joinedAt: row.joined_at,
          profile: {
            id: row.profiles?.id ?? "",
            full_name: row.profiles?.full_name ?? "Usuário",
            email: row.profiles?.email ?? "sem-email",
            avatar_url: row.profiles?.avatar_url ?? null,
            user_type:
              (row.profiles?.user_type as Database["public"]["Enums"]["user_type"]) ?? "sales",
          },
        })) ?? []
      );
    },
    enabled: !!organization?.id,
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("organization_memberships")
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
        })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-team"] });
      toast({
        title: "Membro removido",
        description: "O membro não terá mais acesso à organização.",
      });
    },
    onError: (error) => {
      console.error("Erro ao remover membro:", error);
      toast({
        title: "Erro ao remover membro",
        description: "Não foi possível concluir a remoção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ membershipId, role }: UpdateMemberRolePayload) => {
      const { error } = await supabase
        .from("organization_memberships")
        .update({ role })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-team"] });
      toast({
        title: "Função atualizada",
        description: "As permissões do membro foram atualizadas.",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar função:", error);
      toast({
        title: "Erro ao atualizar função",
        description: "Não foi possível atualizar a função. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMemberUserType = useMutation({
    mutationFn: async ({
      profileId,
      userType,
    }: {
      profileId: string;
      userType: Database["public"]["Enums"]["user_type"];
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ user_type: userType })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-team"] });
      toast({
        title: "Tipo de usuário atualizado",
        description: "As permissões do usuário foram ajustadas.",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar tipo de usuário:", error);
      toast({
        title: "Erro ao atualizar tipo de usuário",
        description: "Não foi possível atualizar o tipo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    isOwner: organization?.isOwner ?? false,
    currentUserId: user?.id ?? null,
    removeMember: removeMember.mutateAsync,
    updateMemberRole: updateMemberRole.mutateAsync,
    updateMemberUserType: updateMemberUserType.mutateAsync,
    removing: removeMember.isPending,
    updatingRole: updateMemberRole.isPending,
    updatingUserType: updateMemberUserType.isPending,
  };
}
