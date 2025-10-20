import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
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

// Hook para buscar todos os usuários
export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as User[];
    },
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

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
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
      // O trigger handle_new_user() vai criar o perfil automaticamente com o user_type
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
        // Tratar erros específicos do Supabase Auth
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

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
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
