import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type MembershipRole = "owner" | "admin" | "manager" | "member";

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string | null;
  role: MembershipRole;
  isOwner: boolean;
}

export function useActiveOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-organization", user?.id],
    queryFn: async (): Promise<ActiveOrganization | null> => {
      if (!user?.id) {
        return null;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("organization_memberships")
        .select(
          `
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            owner_id
          )
        `,
        )
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error("Erro ao buscar membership ativo:", membershipError);
      }

      if (membership && membership.organizations) {
        return {
          id: membership.organizations.id,
          name: membership.organizations.name,
          slug: membership.organizations.slug,
          role: membership.role as MembershipRole,
          isOwner:
            membership.role === "owner" || membership.organizations.owner_id === user.id,
        };
      }

      const { data: ownedOrg, error: ownedOrgError } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (ownedOrgError) {
        console.error("Erro ao buscar organização do owner:", ownedOrgError);
      }

      if (ownedOrg) {
        return {
          id: ownedOrg.id,
          name: ownedOrg.name,
          slug: ownedOrg.slug,
          role: "owner",
          isOwner: true,
        };
      }

      return null;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}
