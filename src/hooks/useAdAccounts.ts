
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/context/SupabaseProvider";
import { useAuth } from "./useAuth";

export function useAdAccounts() {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["adAccounts", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("ad_accounts")
        .select("id, name, account_id, provider")
        .eq("user_id", user.id)
        .eq("provider", "meta");

      if (error) {
        console.error("Error fetching ad accounts:", error);
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!user,
  });
}
