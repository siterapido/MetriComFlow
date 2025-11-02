import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuth } from "@/hooks/useAuth";

export const useUpdateOrganizationName = () => {
  const queryClient = useQueryClient();
  const { data: org } = useActiveOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newNameRaw: string) => {
      const newName = newNameRaw.trim();
      if (!org?.id) throw new Error("Organização não encontrada");
      if (!newName) throw new Error("O nome não pode ser vazio");

      const { error } = await supabase
        .from("organizations")
        .update({ name: newName })
        .eq("id", org.id);
      if (error) throw error;
      return newName;
    },
    onMutate: async (newName) => {
      // Cancel ongoing fetches for org data to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["active-organization"] });

      // Snapshot previous value
      const previousOrg = queryClient.getQueryData<any>(["active-organization", user?.id]);

      // Optimistically update cached organization name
      if (previousOrg && typeof previousOrg === "object") {
        queryClient.setQueryData(["active-organization", user?.id], {
          ...previousOrg,
          name: (newName ?? "").trim(),
        });
      }

      return { previousOrg } as const;
    },
    onError: (_err, _newName, context) => {
      // Rollback optimistic update if needed
      if (context?.previousOrg) {
        queryClient.setQueryData(["active-organization", user?.id], context.previousOrg);
      }
    },
    onSuccess: () => {
      // Invalidate dependent queries so the new name propagates everywhere
      queryClient.invalidateQueries({ queryKey: ["active-organization"] });
      queryClient.invalidateQueries({ queryKey: ["organization-plan-limits"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      // Common pages that might show org metadata
      queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
    },
  });
};

