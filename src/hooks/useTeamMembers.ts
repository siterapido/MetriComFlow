import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/lib/database.types";

export type TeamMember = Tables<'team_members'>;

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as TeamMember[];
    },
    staleTime: 30000,
  });
}