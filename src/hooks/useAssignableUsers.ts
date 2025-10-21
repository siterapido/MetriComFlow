import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email" | "user_type"
>;

export const useAssignableUsers = () => {
  return useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_type")
        .in("user_type", ["owner", "sales"]);

      if (error) throw error;

      return (data ?? []).filter(
        (profile): profile is ProfileRow => Boolean(profile.id && profile.full_name)
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};
