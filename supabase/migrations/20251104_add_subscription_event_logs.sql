-- Migration: Create subscription event log for auditing plan lifecycle
-- Description: Stores structured events for plan changes, cancellations and billing outcomes
-- Created: 2025-11-04

CREATE TABLE IF NOT EXISTS public.subscription_event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.organization_subscriptions (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'plan_change_requested',
      'plan_change_confirmed',
      'plan_change_failed',
      'payment_failed',
      'payment_recovered',
      'subscription_canceled',
      'subscription_reactivated'
    )
  ),
  actor_user_id UUID REFERENCES auth.users (id),
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS subscription_event_logs_subscription_id_idx
  ON public.subscription_event_logs (subscription_id, created_at DESC);

GRANT SELECT ON public.subscription_event_logs TO authenticated;

COMMENT ON TABLE public.subscription_event_logs IS
  'Timeline of subscription lifecycle events for auditing plan upgrades, downgrades, cancellations and billing states.';
