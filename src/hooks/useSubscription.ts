import { useQuery, useMutation, useQueryClient, CancelledError } from "@tanstack/react-query";
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
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  payment_gateway?: string | null;
  billing_name?: string | null;
  billing_email?: string | null;
  billing_cpf_cnpj?: string | null;
  billing_phone?: string | null;
  billing_address?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
  claim_token?: string | null;
  claim_email?: string | null;
  claim_status?: string | null;
  claim_completed_at?: string | null;
  // Joined data
  plan?: SubscriptionPlan;
}

const TEST_PLAN_SLUGS = new Set(["trial"]);

const PRO_PLAN_CAPABILITY_FALLBACK: Pick<SubscriptionPlan, "max_ad_accounts" | "max_users" | "has_crm_access" | "features"> = {
  max_ad_accounts: 20,
  max_users: 10,
  has_crm_access: true,
  features: [
    "Dashboard Geral",
    "Métricas Meta Ads",
    "CRM Completo",
    "Gestão de Leads",
    "Formulários",
    "Metas Avançadas",
    "20 Contas de Anúncio",
    "Equipe de 10 Usuários",
    "Suporte Prioritário",
  ],
};

const normalizePlanCapabilities = (plan: SubscriptionPlan, proTemplate?: SubscriptionPlan | null): SubscriptionPlan => {
  if (!TEST_PLAN_SLUGS.has(plan.slug)) {
    return plan;
  }

  const source = proTemplate ?? PRO_PLAN_CAPABILITY_FALLBACK;
  const normalizedFeatures = Array.isArray(source.features) && source.features.length > 0
    ? [...source.features]
    : [...PRO_PLAN_CAPABILITY_FALLBACK.features];

  return {
    ...plan,
    max_ad_accounts: source.max_ad_accounts ?? PRO_PLAN_CAPABILITY_FALLBACK.max_ad_accounts,
    max_users: source.max_users ?? PRO_PLAN_CAPABILITY_FALLBACK.max_users,
    has_crm_access: source.has_crm_access ?? PRO_PLAN_CAPABILITY_FALLBACK.has_crm_access,
    features: normalizedFeatures,
  };
};

export interface SubscriptionUsage {
  organization_id: string;
  ad_accounts_count: number;
  active_users_count: number;
  last_checked_at: string;
  updated_at: string;
}

export type SubscriptionEventType =
  | "plan_change_requested"
  | "plan_change_confirmed"
  | "plan_change_failed"
  | "payment_failed"
  | "payment_recovered"
  | "subscription_canceled"
  | "subscription_reactivated";

export interface SubscriptionEventLog {
  id: string;
  organization_id: string;
  subscription_id: string;
  event_type: SubscriptionEventType;
  actor_user_id: string | null;
  context: Record<string, any> | null;
  created_at: string;
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
      const rawPlans = (data as SubscriptionPlan[]) || [];
      const proPlan = rawPlans.find((plan) => plan.slug === "pro") || null;
      const sanitizedProPlan = proPlan
        ? { ...proPlan, features: Array.isArray(proPlan.features) ? proPlan.features : [] }
        : null;

      return rawPlans.map((plan) => {
        const safeFeatures = Array.isArray(plan.features) ? plan.features : [];
        const basePlan = { ...plan, features: safeFeatures };
        return normalizePlanCapabilities(basePlan, sanitizedProPlan);
      });
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
      const subscription = (data as unknown as OrganizationSubscription) || null;

      if (subscription?.plan) {
        const sanitizedPlan: SubscriptionPlan = {
          ...subscription.plan,
          features: Array.isArray(subscription.plan.features) ? subscription.plan.features : [],
        };
        subscription.plan = normalizePlanCapabilities(sanitizedPlan);
      }

      return subscription;
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
    queryFn: async ({ signal }): Promise<OrganizationPlanLimits | null> => {
      if (!org?.id) return null;

      const checkForAbort = (error?: { message?: string } | null) => {
        if (signal?.aborted) {
          throw new CancelledError();
        }
        const message = error?.message?.toLowerCase();
        if (message && message.includes("aborterror")) {
          throw new CancelledError();
        }
        if (error) {
          throw error;
        }
      };

      // Get current plan from subscription
      const plan = currentSub?.plan;

      // Count ad accounts
      const adQuery = supabase
        .from("ad_accounts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);

      if (signal) {
        adQuery.abortSignal(signal);
      }

      const adRes = await adQuery;
      checkForAbort(adRes.error);
      const adAccountsCount = adRes.count ?? 0;

      // Count active users
      const usersQuery = supabase
        .from("organization_memberships")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("is_active", true);

      if (signal) {
        usersQuery.abortSignal(signal);
      }

      const usersRes = await usersQuery;
      checkForAbort(usersRes.error);
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
  if (!limits) return false;
  if (limits.subscription_status && !["active", "trial"].includes(limits.subscription_status)) {
    return false;
  }
  return !limits.ad_accounts_limit_reached;
};

/**
 * Check if organization can add a user
 */
export const useCanAddUser = () => {
  const { data: limits } = useOrganizationPlanLimits();
  if (!limits) return false;
  if (limits.subscription_status && !["active", "trial"].includes(limits.subscription_status)) {
    return false;
  }
  return !limits.users_limit_reached;
};

/**
 * Check if organization has CRM access (based on plan)
 */
export const useHasCRMAccess = () => {
  const { data: limits } = useOrganizationPlanLimits();
  if (!limits) return false;
  if (limits.subscription_status && !["active", "trial"].includes(limits.subscription_status)) {
    return false;
  }
  return limits.has_crm_access;
};

/**
 * Fetch subscription event timeline
 */
export const useSubscriptionTimeline = (subscriptionId: string | null) => {
  return useQuery<SubscriptionEventLog[]>({
    queryKey: ["subscription-event-timeline", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return [];

      const { data, error } = await supabase
        .from("subscription_event_logs")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as SubscriptionEventLog[]) ?? [];
    },
    enabled: !!subscriptionId,
    staleTime: 30 * 1000,
  });
};

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Upgrade/Change organization's subscription plan
 * Also handles first-time subscription creation
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
        // Update existing subscription (upgrade/downgrade)
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
        // Create new subscription (first-time subscription)
        // Note: Status will be updated to "active" by payment processing
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const { data, error } = await supabase
          .from("organization_subscriptions")
          .insert({
            organization_id: org.id,
            plan_id: newPlanId,
            status: "trial", // Temporary status, will be updated to "active" after payment
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: null, // No trial for paid subscriptions
            next_billing_date: periodEnd.toISOString(),
            metadata: { first_subscription: true },
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["organization-plan-limits"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });

      const isFirstSubscription = !currentSubscription;
      toast({
        title: isFirstSubscription ? "Plano contratado com sucesso!" : "Plano atualizado com sucesso!",
        description: isFirstSubscription
          ? "Seu plano será ativado assim que o pagamento for confirmado."
          : "Seu novo plano já está ativo.",
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

      const { data, error } = await supabase.functions.invoke("cancel-stripe-subscription", {
        body: {
          subscriptionId: currentSubscription.id,
          reason: reason ?? null,
        },
      });

      if (error) throw new Error(error.message || "Falha ao cancelar assinatura.");
      if (!data?.success) {
        throw new Error(data?.error || "Não foi possível cancelar a assinatura.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });

      toast({
        title: "Assinatura cancelada",
        description: "Seu plano será cancelado no final do período atual.",
      });
      if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({
          event: "subscription_canceled",
          subscriptionId: currentSubscription?.id,
          organizationId: currentSubscription?.organization_id,
        });
      }
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

      const { data, error } = await supabase.functions.invoke("reactivate-stripe-subscription", {
        body: {
          subscriptionId: currentSubscription.id,
        },
      });

      if (error) throw new Error(error.message || "Falha ao reativar assinatura.");
      if (!data?.success) {
        throw new Error(data?.error || "Não foi possível reativar a assinatura.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });

      toast({
        title: "Assinatura reativada!",
        description: "Seu plano continuará ativo após o período atual.",
      });
      if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({
          event: "subscription_reactivated",
          subscriptionId: currentSubscription?.id,
          organizationId: currentSubscription?.organization_id,
        });
      }
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
