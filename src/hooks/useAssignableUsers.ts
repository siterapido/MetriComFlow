import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "user_type"
>;

export const useAssignableUsers = () => {
  const { data: organization } = useActiveOrganization();

  return useQuery({
    queryKey: ["assignable-users", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      if (!organization?.id) return [] as ProfileRow[];

      // Buscar apenas membros ATIVOS da organização atual, com seus perfis.
      // Mantemos a regra de negócio: apenas owner e sales podem ser responsáveis.
      const { data, error } = await supabase
        .from("organization_memberships")
        .select(
          `
          profiles:profiles!organization_memberships_profile_id_fkey (
            id,
            full_name,
            email,
            user_type
          )
        `,
        )
        .eq("organization_id", organization.id)
        .eq("is_active", true);

      if (error) throw error;

      // Extrair perfis e filtrar por tipos permitidos (owner, sales, crm_user)
      const profiles = (data ?? [])
        .map((row: any) => row.profiles as ProfileRow | null)
        .filter((p): p is ProfileRow => !!p && !!p.id && !!p.full_name)
        .filter((p) => ["owner", "sales", "crm_user"].includes(p.user_type as string));

      // Remover duplicados por segurança
      const uniqueById = new Map<string, ProfileRow>();
      for (const p of profiles) uniqueById.set(p.id, p);

      return Array.from(uniqueById.values());
    },
    staleTime: 5 * 60 * 1000,
  });
};
