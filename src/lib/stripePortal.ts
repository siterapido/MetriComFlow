const DEFAULT_PORTAL_URL = "https://billing.stripe.com/p/login/test_6oU14odZz06ocpc5Sp4ow00";

export const getStripePortalUrl = () => {
  const envUrl = import.meta.env.VITE_STRIPE_PORTAL_URL as string | undefined;
  const baseUrl = (envUrl && envUrl.trim().length > 0 ? envUrl : DEFAULT_PORTAL_URL).trim();

  return baseUrl;
};
