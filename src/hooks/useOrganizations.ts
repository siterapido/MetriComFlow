import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface UserOrganizationItem {
  id: string;
  name: string;
  slug: string | null;
  role: "owner" | "admin" | "manager" | "member";
}

export function useUserOrganizations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-organizations", user?.id],
    queryFn: async (): Promise<UserOrganizationItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(
          `
          role,
          organizations ( id, name, slug, is_active )
        `,
        )
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      const items = (data ?? [])
        .filter((row: any) => row.organizations && row.organizations.is_active)
        .map((row: any) => ({
          id: row.organizations.id as string,
          name: row.organizations.name as string,
          slug: (row.organizations.slug as string | null) ?? null,
          role: row.role as UserOrganizationItem["role"],
        }));

      return items;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useSetActiveOrganization() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return (orgId: string | null) => {
    try {
      if (typeof window !== "undefined") {
        if (orgId) window.localStorage.setItem("activeOrgId", orgId);
        else window.localStorage.removeItem("activeOrgId");
      }
    } catch (error) {
      console.warn("Falha ao atualizar activeOrgId no localStorage", error);
    }

    // Persistir preferência no servidor (perfil do usuário)
    if (user?.id) {
      void supabase
        .from('profiles')
        .update({ active_organization_id: orgId })
        .eq('id', user.id);
    }

    // Invalidar caches relacionados à organização
    qc.invalidateQueries({ queryKey: ["active-organization", user?.id] });
    qc.invalidateQueries({ queryKey: ["user-organizations", user?.id] });
    qc.invalidateQueries({ queryKey: ["team-invitations"] });
    qc.invalidateQueries({ queryKey: ["organization-plan-limits"] });
    qc.invalidateQueries({ queryKey: ["user-permissions"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    qc.invalidateQueries({ queryKey: ["pipeline-metrics"] });
  };
}
