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

      // 1) Respeitar preferência do servidor (profile.active_organization_id)
      const { data: profilePref } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profilePref?.active_organization_id) {
        const { data: preferredMembershipSrv } = await supabase
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
          .eq("organization_id", profilePref.active_organization_id as string)
          .maybeSingle();

        if (preferredMembershipSrv && preferredMembershipSrv.organizations) {
          // Atualiza localStorage para refletir preferência do servidor
          try { if (typeof window !== 'undefined') window.localStorage.setItem('activeOrgId', profilePref.active_organization_id as string) } catch (_) {}
          return {
            id: preferredMembershipSrv.organizations.id,
            name: preferredMembershipSrv.organizations.name,
            slug: preferredMembershipSrv.organizations.slug,
            role: preferredMembershipSrv.role as MembershipRole,
            isOwner:
              preferredMembershipSrv.role === "owner" ||
              preferredMembershipSrv.organizations.owner_id === user.id,
          };
        }
      }

      // 2) Respeitar preferência salva (localStorage)
      let preferredOrgId: string | null = null;
      try {
        preferredOrgId = typeof window !== "undefined"
          ? window.localStorage.getItem("activeOrgId")
          : null;
      } catch (_e) {
        preferredOrgId = null;
      }

      if (preferredOrgId) {
        const { data: preferredMembership } = await supabase
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
          .eq("organization_id", preferredOrgId)
          .maybeSingle();

        if (preferredMembership && preferredMembership.organizations) {
          return {
            id: preferredMembership.organizations.id,
            name: preferredMembership.organizations.name,
            slug: preferredMembership.organizations.slug,
            role: preferredMembership.role as MembershipRole,
            isOwner:
              preferredMembership.role === "owner" ||
              preferredMembership.organizations.owner_id === user.id,
          };
        }
      }

      // 3) Caso não haja preferência válida, escolher a membership mais recente
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
        .order("joined_at", { ascending: false })
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

      // 4) Fallback: organização que o usuário possui (owner)
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
