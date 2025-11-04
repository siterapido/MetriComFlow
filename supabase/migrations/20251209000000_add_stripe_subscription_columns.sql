-- Restore Stripe subscription linkage columns and claim tracking helpers
-- Context: Needed for payment-link flow to map checkout sessions back to Supabase

ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claim_email TEXT,
  ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS claim_completed_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_subscriptions_claim_token
  ON public.organization_subscriptions(claim_token)
  WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_checkout_session
  ON public.organization_subscriptions(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
