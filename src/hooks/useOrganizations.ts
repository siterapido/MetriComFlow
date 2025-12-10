import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  created_at: string;
  updated_at: string;
}

export function useOrganizations() {
  const { data: permissions } = useUserPermissions();
  const queryClient = useQueryClient();

  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ["organizations", "all"],
    queryFn: async () => {
      // NOTE: This relies on RLS. 
      // Normal users: get only their orgs.
      // Super admins: get ALL orgs (via is_super_admin policy).
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!permissions,
  });

  const createOrganization = useMutation({
    mutationFn: async (vars: { name: string; slug?: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: vars.name,
          // slug if you have it in schema, otherwise ignoring. 
          // Based on schema, only 'name' is in 000_users_and_organizations.sql.
          // If 'slug' was added later, fine. I'll inspect schema if needed.
          // For now, I only assume 'name'.
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organização criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar organização");
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async (vars: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ name: vars.name })
        .eq("id", vars.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organização atualizada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar organização");
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organização removida com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover organização");
    },
  });

  return {
    organizations,
    isLoading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization
  };
}
