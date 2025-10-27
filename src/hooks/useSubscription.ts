import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useActiveOrganization } from "./useActiveOrganization";
import { toast } from "@/hooks/use-toast";

// =====================================================
// TYPES
// =====================================================

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "trial";
export type BillingPeriod = "monthly" | "yearly";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billing_period: BillingPeriod;
  max_ad_accounts: number;
  max_users: number;
  has_crm_access: boolean;
  features: string[];
  display_order: number;
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  payment_method: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  next_billing_date: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  cancellation_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
}

export interface SubscriptionUsage {
  organization_id: string;
  ad_accounts_count: number;
  active_users_count: number;
  last_checked_at: string;
  updated_at: string;
}

export interface OrganizationPlanLimits {
  organization_id: string;
  organization_name: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  max_ad_accounts: number;
  max_users: number;
  has_crm_access: boolean;
  features: string[] | null;
  current_ad_accounts: number;
  current_users: number;
  subscription_status: SubscriptionStatus | null;
  current_period_end: string | null;
  remaining_ad_accounts: number;
  remaining_users: number;
  ad_accounts_limit_reached: boolean;
  users_limit_reached: boolean;
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Fetch all available subscription plans
 */
export const useSubscriptionPlans = () => {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data as SubscriptionPlan[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch current organization's active subscription
 */
export const useCurrentSubscription = () => {
  const { data: org } = useActiveOrganization();

  return useQuery<OrganizationSubscription | null>({
    queryKey: ["current-subscription", org?.id],
    queryFn: async (): Promise<OrganizationSubscription | null> => {
      if (!org?.id) return null;

      const { data, error } = await supabase
        .from("organization_subscriptions")
        .select(
          `
          *,
          plan:subscription_plans(*)
        `
        )
        .eq("organization_id", org.id)
        .in("status", ["active", "trial", "past_due"])
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as OrganizationSubscription) || null;
    },
    enabled: !!org?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Fetch organization's subscription usage (ad accounts, users)
 */
export const useSubscriptionUsage = () => {
  const { data: org } = useActiveOrganization();

  return useQuery<SubscriptionUsage | null>({
    queryKey: ["subscription-usage", org?.id],
    queryFn: async (): Promise<SubscriptionUsage | null> => {
      if (!org?.id) return null;

      const { data, error } = await supabase
        .from("subscription_usage")
        .select("*")
        .eq("organization_id", org.id)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as SubscriptionUsage) || null;
    },
    enabled: !!org?.id,
    staleTime: 30 * 1000, // 30 seconds (refresh frequently for accurate counts)
  });
};

/**
 * Fetch organization's plan limits (combined view)
 * SIMPLIFIED: Direct queries instead of view to avoid RLS/performance issues
 */
export const useOrganizationPlanLimits = () => {
  const { data: org } = useActiveOrganization();
  const { data: currentSub } = useCurrentSubscription();

  return useQuery<OrganizationPlanLimits | null>({
    queryKey: ["organization-plan-limits", org?.id],
    queryFn: async (): Promise<OrganizationPlanLimits | null> => {
      if (!org?.id) return null;

      // Get current plan from subscription
      const plan = currentSub?.plan;

      // Count ad accounts
      const adRes = await supabase
        .from("ad_accounts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);
      if (adRes.error) throw adRes.error;
      const adAccountsCount = adRes.count ?? 0;

      // Count active users
      const usersRes = await supabase
        .from("organization_memberships")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("is_active", true);
      if (usersRes.error) throw usersRes.error;
      const usersCount = usersRes.count ?? 0;

      const currentAdAccounts = adAccountsCount || 0;
      const currentUsers = usersCount || 0;
      const maxAdAccounts = plan?.max_ad_accounts || 0;
      const maxUsers = plan?.max_users || 0;

      return {
        organization_id: org.id,
        organization_name: org.name,
        plan_id: plan?.id || null,
        plan_name: plan?.name || null,
        plan_slug: plan?.slug || null,
        max_ad_accounts: maxAdAccounts,
        max_users: maxUsers,
        has_crm_access: plan?.has_crm_access || false,
        features: plan?.features || null,
        current_ad_accounts: currentAdAccounts,
        current_users: currentUsers,
        subscription_status: currentSub?.status || null,
        current_period_end: currentSub?.current_period_end || null,
        remaining_ad_accounts: Math.max(0, maxAdAccounts - currentAdAccounts),
        remaining_users: Math.max(0, maxUsers - currentUsers),
        ad_accounts_limit_reached: currentAdAccounts >= maxAdAccounts,
        users_limit_reached: currentUsers >= maxUsers,
      };
    },
    enabled: !!org?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    keepPreviousData: true,
  });
};

/**
 * Check if organization can add an ad account
 */
export const useCanAddAdAccount = () => {
  const { data: limits } = useOrganizationPlanLimits();
  return !limits?.ad_accounts_limit_reached;
};

/**
 * Check if organization can add a user
 */
export const useCanAddUser = () => {
  const { data: limits } = useOrganizationPlanLimits();
  return !limits?.users_limit_reached;
};

/**
 * Check if organization has CRM access (based on plan)
 */
export const useHasCRMAccess = () => {
  const { data: limits } = useOrganizationPlanLimits();
  return limits?.has_crm_access ?? false;
};

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Upgrade/Change organization's subscription plan
 */
export const useUpgradePlan = () => {
  const queryClient = useQueryClient();
  const { data: org } = useActiveOrganization();
  const { data: currentSubscription } = useCurrentSubscription();

  return useMutation({
    mutationFn: async (newPlanId: string) => {
      if (!org?.id) throw new Error("Organization not found");

      // Check if subscription exists
      if (currentSubscription) {
        // Update existing subscription
        const { data, error } = await supabase
          .from("organization_subscriptions")
          .update({
            plan_id: newPlanId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSubscription.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new subscription
        const { data, error } = await supabase
          .from("organization_subscriptions")
          .insert({
            organization_id: org.id,
            plan_id: newPlanId,
            status: "trial", // Start with trial
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["organization-plan-limits"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });

      toast({
        title: "Plano atualizado com sucesso!",
        description: "Seu novo plano já está ativo.",
      });
    },
    onError: (error: any) => {
      console.error("Error upgrading plan:", error);
      toast({
        title: "Erro ao atualizar plano",
        description: error.message || "Ocorreu um erro ao atualizar seu plano. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Cancel subscription at period end
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { data: currentSubscription } = useCurrentSubscription();

  return useMutation({
    mutationFn: async (reason?: string) => {
      if (!currentSubscription?.id) throw new Error("No active subscription found");

      const { data, error } = await supabase
        .from("organization_subscriptions")
        .update({
          cancel_at_period_end: true,
          cancellation_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSubscription.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });

      toast({
        title: "Assinatura cancelada",
        description: "Seu plano será cancelado no final do período atual.",
      });
    },
    onError: (error: any) => {
      console.error("Error canceling subscription:", error);
      toast({
        title: "Erro ao cancelar assinatura",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

/**
 * Reactivate a canceled subscription
 */
export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { data: currentSubscription } = useCurrentSubscription();

  return useMutation({
    mutationFn: async () => {
      if (!currentSubscription?.id) throw new Error("No subscription found");

      const { data, error } = await supabase
        .from("organization_subscriptions")
        .update({
          cancel_at_period_end: false,
          cancellation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSubscription.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });

      toast({
        title: "Assinatura reativada!",
        description: "Seu plano continuará ativo após o período atual.",
      });
    },
    onError: (error: any) => {
      console.error("Error reactivating subscription:", error);
      toast({
        title: "Erro ao reativar assinatura",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });
};

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Check if current user is on a trial subscription
 */
export const useIsOnTrial = () => {
  const { data: subscription } = useCurrentSubscription();
  return subscription?.status === "trial";
};

/**
 * Get days remaining in trial
 */
export const useTrialDaysRemaining = () => {
  const { data: subscription } = useCurrentSubscription();

  if (subscription?.status !== "trial" || !subscription.trial_end) {
    return 0;
  }

  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Get usage percentages
 */
export const useUsagePercentages = () => {
  const { data: limits } = useOrganizationPlanLimits();

  if (!limits) {
    return {
      adAccountsPercentage: 0,
      usersPercentage: 0,
    };
  }

  return {
    adAccountsPercentage: limits.max_ad_accounts > 0
      ? Math.round((limits.current_ad_accounts / limits.max_ad_accounts) * 100)
      : 0,
    usersPercentage: limits.max_users > 0
      ? Math.round((limits.current_users / limits.max_users) * 100)
      : 0,
  };
};
