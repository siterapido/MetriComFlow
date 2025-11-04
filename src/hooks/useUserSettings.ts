import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type DashboardHome = "dashboard" | "leads" | "leads/kanban" | "metricas";

export interface NotificationSettings {
  emailLeads: boolean;
  emailGoals: boolean;
  emailWeeklySummary: boolean;
  slackAlerts: boolean;
  browserPush: boolean;
}

export interface CrmSettings {
  defaultPipelineView: "linear" | "kanban";
  autoAssignNewLeads: boolean;
  showRevenueInPipeline: boolean;
  remindTasks: boolean;
}

export interface MetricsSettings {
  defaultDateRange: "7" | "30" | "90";
  showForecastCards: boolean;
  highlightCAC: boolean;
  preferredCurrency: "BRL" | "USD";
}

export interface UiSettings {
  theme: "system" | "light" | "dark";
  compactTables: boolean;
  language: "pt-BR" | "en-US";
}

export interface PrivacySettings {
  shareEmailWithTeam: boolean;
  sharePhoneWithTeam: boolean;
  twoFactorEnabled: boolean;
}

export interface UserSettings {
  defaultHome: DashboardHome;
  notifications: NotificationSettings;
  crm: CrmSettings;
  metrics: MetricsSettings;
  ui: UiSettings;
  privacy: PrivacySettings;
}

const normalizeDefaultHome = (value: unknown): DashboardHome => {
  switch (value) {
    case "leads":
      return "leads";
    case "leads/kanban":
      return "leads/kanban";
    case "metricas":
      return "metricas";
    case "meta-ads-config":
      return "metricas";
    case "dashboard":
      return "dashboard";
    case "metas":
    default:
      return "dashboard";
  }
};

export const defaultUserSettings: UserSettings = {
  defaultHome: "dashboard",
  notifications: {
    emailLeads: true,
    emailGoals: true,
    emailWeeklySummary: true,
    slackAlerts: false,
    browserPush: true,
  },
  crm: {
    defaultPipelineView: "kanban",
    autoAssignNewLeads: true,
    showRevenueInPipeline: true,
    remindTasks: true,
  },
  metrics: {
    defaultDateRange: "30",
    showForecastCards: true,
    highlightCAC: true,
    preferredCurrency: "BRL",
  },
  ui: {
    theme: "system",
    compactTables: false,
    language: "pt-BR",
  },
  privacy: {
    shareEmailWithTeam: true,
    sharePhoneWithTeam: false,
    twoFactorEnabled: false,
  },
};

const deepMergeSettings = (partial: Partial<UserSettings> | null | undefined): UserSettings => {
  const merged = { ...defaultUserSettings };

  if (!partial) return merged;

  return {
    defaultHome: normalizeDefaultHome(partial.defaultHome ?? merged.defaultHome),
    notifications: {
      ...merged.notifications,
      ...partial.notifications,
    },
    crm: {
      ...merged.crm,
      ...partial.crm,
    },
    metrics: {
      ...merged.metrics,
      ...partial.metrics,
    },
    ui: {
      ...merged.ui,
      ...partial.ui,
    },
    privacy: {
      ...merged.privacy,
      ...partial.privacy,
    },
  };
};

export const mergeUserSettings = (partial?: Partial<UserSettings> | null) => deepMergeSettings(partial);

export const useUserSettings = () => {
  const { user } = useAuth();

  return useQuery<UserSettings>({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user) return defaultUserSettings;

      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const authUser = data.user;
      const stored = (authUser?.user_metadata?.settings ?? null) as Partial<UserSettings> | null;

      return deepMergeSettings(stored);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    initialData: defaultUserSettings,
  });
};

export const useUpdateUserSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!user) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.auth.updateUser({
        data: {
          settings,
        },
      });

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Preferências salvas",
        description: "Suas configurações pessoais foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar preferências",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const DASHBOARD_HOME_PATHS: Record<DashboardHome, string> = {
  dashboard: "/dashboard",
  leads: "/leads/linear",
  "leads/kanban": "/leads/kanban",
  metricas: "/metricas",
};

export const resolveDefaultHomePath = (settings?: UserSettings | null) => {
  if (!settings) return DASHBOARD_HOME_PATHS.dashboard;
  return DASHBOARD_HOME_PATHS[settings.defaultHome] ?? DASHBOARD_HOME_PATHS.dashboard;
};
