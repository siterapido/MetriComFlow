import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/lib/database.types";

type UserType = Database["public"]["Enums"]["user_type"];

export interface UserPermissions {
  userType: UserType | null;
  isOwner: boolean;
  hasCRMAccess: boolean;
  hasMetricsAccess: boolean;
  canManageUsers: boolean;
  canManageGoals: boolean;
  canDeleteLeads: boolean;
  canManageTeamMembers: boolean;
}

export const useUserPermissions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-permissions", user?.id],
    queryFn: async (): Promise<UserPermissions> => {
      if (!user?.id) {
        return {
          userType: null,
          isOwner: false,
          hasCRMAccess: false,
          hasMetricsAccess: false,
          canManageUsers: false,
          canManageGoals: false,
          canDeleteLeads: false,
          canManageTeamMembers: false,
        };
      }

      // Fetch user profile to get user_type
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const userType = profile?.user_type || "sales";
      const isOwner = userType === "owner";
      const isTrafficManager = userType === "traffic_manager";
      const isSales = userType === "sales";

      return {
        userType,
        isOwner,
        hasCRMAccess: isOwner || isSales,
        hasMetricsAccess: isOwner || isTrafficManager,
        canManageUsers: isOwner,
        canManageGoals: isOwner,
        canDeleteLeads: isOwner,
        canManageTeamMembers: isOwner,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper hook to check if user is owner
export const useIsOwner = () => {
  const { data: permissions } = useUserPermissions();
  return permissions?.isOwner ?? false;
};

// Helper hook to check if user has CRM access
export const useHasCRMAccess = () => {
  const { data: permissions } = useUserPermissions();
  return permissions?.hasCRMAccess ?? false;
};

// Helper hook to check if user has Metrics access
export const useHasMetricsAccess = () => {
  const { data: permissions } = useUserPermissions();
  return permissions?.hasMetricsAccess ?? false;
};

// User type labels for display
export const USER_TYPE_LABELS: Record<UserType, string> = {
  owner: "Proprietário",
  traffic_manager: "Gestor de Tráfego",
  sales: "Vendedor",
};

// User type descriptions
export const USER_TYPE_DESCRIPTIONS: Record<UserType, string> = {
  owner: "Acesso completo a todas as funcionalidades do sistema",
  traffic_manager: "Acesso exclusivo às métricas e análises, sem permissão para acessar o CRM",
  sales: "Acesso completo ao CRM, porém sem permissão para visualizar métricas e análises",
};

// User type permissions breakdown
export const USER_TYPE_PERMISSIONS: Record<UserType, string[]> = {
  owner: [
    "Acesso total ao CRM",
    "Acesso total às métricas e análises",
    "Gerenciar usuários",
    "Gerenciar metas e objetivos",
    "Gerenciar membros da equipe",
    "Deletar leads e dados",
    "Configurar integrações",
  ],
  traffic_manager: [
    "Visualizar métricas de campanhas",
    "Visualizar análises de desempenho",
    "Visualizar metas e objetivos",
    "Configurar integrações de anúncios",
    "SEM acesso ao CRM",
  ],
  sales: [
    "Criar e gerenciar leads",
    "Visualizar pipeline de vendas",
    "Adicionar comentários e anexos",
    "Atualizar status de leads",
    "Visualizar membros da equipe",
    "SEM acesso às métricas",
  ],
};
