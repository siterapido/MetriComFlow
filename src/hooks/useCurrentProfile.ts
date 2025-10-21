import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface UpdateProfilePayload {
  fullName: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  timezone?: string | null;
  bio?: string | null;
}

interface ProfileData {
  profile: ProfileRow | null;
  metadata: {
    phoneNumber?: string | null;
    jobTitle?: string | null;
    timezone?: string | null;
    bio?: string | null;
  };
}

const parseMetadata = (metadata: Record<string, any> | undefined | null) => {
  return {
    phoneNumber: metadata?.phone_number ?? null,
    jobTitle: metadata?.job_title ?? null,
    timezone: metadata?.timezone ?? null,
    bio: metadata?.bio ?? null,
  };
};

export const useCurrentProfile = () => {
  const { user } = useAuth();

  return useQuery<ProfileData>({
    queryKey: ["current-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { profile: null, metadata: {} };
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      return {
        profile: data,
        metadata: parseMetadata(user.user_metadata),
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateCurrentProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");

      const { fullName, avatarUrl, phoneNumber, jobTitle, timezone, bio } = payload;

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: avatarUrl ?? null,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone_number: phoneNumber ?? null,
          job_title: jobTitle ?? null,
          timezone: timezone ?? null,
          bio: bio ?? null,
        },
      });

      if (metadataError) throw metadataError;

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações pessoais foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
