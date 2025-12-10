import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import type { Database } from "@/lib/database.types";

type UserType = Database["public"]["Enums"]["user_type"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface User extends Profile {
  user_type: UserType;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  user_type: UserType;
}

export interface UpdateUserData {
  id: string;
  full_name?: string;
  user_type?: UserType;
  avatar_url?: string;
}

// Hook para buscar usuários da mesma organização
export const useUsers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["users", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Buscar organizações do usuário atual
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("profile_id", user.id)
        .eq("is_active", true);

      if (membershipsError) throw membershipsError;

      // 2. Se o usuário não pertence a nenhuma organização, mostrar apenas ele mesmo
      if (!memberships || memberships.length === 0) {
        const { data: ownProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        return [ownProfile] as User[];
      }

      // 3. Buscar IDs das organizações
      const orgIds = memberships.map(m => m.organization_id);

      // 4. Buscar todos os membros dessas organizações
      const { data: orgMembers, error: orgMembersError } = await supabase
        .from("organization_memberships")
        .select("profile_id")
        .in("organization_id", orgIds)
        .eq("is_active", true);

      if (orgMembersError) throw orgMembersError;

      // 5. Buscar perfis desses membros
      const profileIds = [...new Set(orgMembers.map(m => m.profile_id))];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", profileIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as User[];
    },
    enabled: !!user?.id,
  });
};

// Hook para buscar um usuário específico
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as User;
    },
    enabled: !!userId,
  });
};

// Hook para criar um novo usuário
export const useCreateUser = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Obtemos a organização ativa para vincular o novo usuário
  const { data: activeOrg } = useActiveOrganization();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      // Snapshot da sessão atual para evitar troca de usuário após o signUp
      const { data: currentSessionData } = await supabase.auth.getSession();
      const currentSession = currentSessionData?.session;

      // 1. Verificar se o email já existe
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", userData.email)
        .maybeSingle();

      if (existingUser) {
        throw new Error("Este email já está cadastrado no sistema.");
      }

      // 2. Criar usuário no auth com user_type nos metadados
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            user_type: userData.user_type,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new Error("Este email já está cadastrado no sistema.");
        }
        if (authError.message.includes("invalid email")) {
          throw new Error("Email inválido.");
        }
        if (authError.message.includes("password")) {
          throw new Error("A senha deve ter no mínimo 6 caracteres.");
        }
        throw new Error(authError.message);
      }

      if (!authData.user) throw new Error("Falha ao criar usuário");

      // 3. Vincular usuário à organização ativa (se houver)
      if (activeOrg?.id) {
        const { error: membershipError } = await supabase
          .from("organization_memberships")
          .insert({
            organization_id: activeOrg.id,
            profile_id: authData.user.id,
            role: "member", // Default role
            is_active: true,
          });

        if (membershipError) {
          console.error("Erro ao vincular usuário à organização:", membershipError);
          // Não lançamos erro aqui para não falhar o fluxo principal, mas logamos
          toast({
            title: "Aviso",
            description: "Usuário criado, mas houve erro ao vinculá-lo à organização.",
            variant: "destructive"
          });
        }
      }

      // 4. Restaurar sessão anterior (proprietário)
      if (currentSession) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });

        if (restoreError) {
          toast({
            title: "Sessão restaurada parcialmente",
            description:
              "Usuário criado, mas houve um problema ao restaurar sua sessão. Faça login novamente, se necessário.",
          });
        }
      } else {
        await supabase.auth.signOut();
      }

      return authData.user;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Invalidate organization team to prompt refresh in TeamManagement
      queryClient.invalidateQueries({ queryKey: ["organization-team"] });

      if (variables?.user_type === "sales" || variables?.user_type === "owner") {
        queryClient.invalidateQueries({ queryKey: ["assignable-users"] });
      }
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado e adicionado à equipe com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para atualizar um usuário
export const useUpdateUser = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      const { id, ...updates } = userData;

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    },
    onMutate: async (userData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["users"] });
      await queryClient.cancelQueries({ queryKey: ["users", userData.id] });

      // Snapshot previous values
      const previousUsers = queryClient.getQueryData<User[]>(["users"]);
      const previousUser = queryClient.getQueryData<User>(["users", userData.id]);

      // Optimistically update
      if (previousUsers) {
        queryClient.setQueryData<User[]>(["users"], (old) =>
          old?.map((user) =>
            user.id === userData.id ? { ...user, ...userData } : user
          ) || []
        );
      }

      if (previousUser) {
        queryClient.setQueryData<User>(["users", userData.id], {
          ...previousUser,
          ...userData,
        });
      }

      return { previousUsers, previousUser };
    },
    onError: (error: Error, userData, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(["users"], context.previousUsers);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(["users", userData.id], context.previousUser);
      }

      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

// Hook para deletar um usuário
export const useDeleteUser = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Chamar Edge Function para deletar usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao deletar usuário");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário deletado",
        description: `O usuário ${data.email} foi removido com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
