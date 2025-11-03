-- Remove Stripe checkout integration support
-- This migration reverses the changes made in 20251201_add_stripe_checkout_support.sql

-- Remove Stripe columns from subscription_plans
ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS stripe_price_id,
  DROP COLUMN IF EXISTS stripe_product_id,
  DROP COLUMN IF EXISTS stripe_metadata;

-- Remove Stripe columns from organization_subscriptions
ALTER TABLE public.organization_subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_invoice_id;

-- Remove Stripe columns from subscription_payments
ALTER TABLE public.subscription_payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_invoice_id,
  DROP COLUMN IF EXISTS stripe_hosted_invoice_url,
  DROP COLUMN IF EXISTS stripe_receipt_url;

-- Drop Stripe-specific indexes
DROP INDEX IF EXISTS idx_subscription_payments_stripe_invoice_id;
DROP INDEX IF EXISTS idx_subscription_payments_stripe_payment_intent;

COMMENT ON TABLE public.subscription_payments IS 'Individual payment records for organization subscriptions (Stripe support removed)';