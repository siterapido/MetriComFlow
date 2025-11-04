-- Reintroduce Stripe price mapping support for subscription plans
-- Context: The Stripe webhook resolves plans via subscription_plans.stripe_price_id.
--          This migration restores the missing column after the prior rollback.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
COMMENT ON COLUMN public.subscription_plans.stripe_price_id
  IS 'Stripe price identifier used by the checkout webhook to map purchases to plans';
-- Ensure each Stripe price maps to at most one plan while allowing nulls.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_id
  ON public.subscription_plans(stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;
