# Stripe Integration - Archived (December 2, 2024)

## Overview

This directory contains documentation and files related to the Stripe payment integration that was removed from the MetriCom Flow project on December 2, 2024.

## What was removed

### Backend Components
- `supabase/functions/create-stripe-checkout/` - Edge Function for creating Stripe checkout sessions
- `supabase/functions/stripe-webhook/` - Edge Function for handling Stripe webhooks
- Database columns: `stripe_*` fields from `subscription_plans`, `organization_subscriptions`, and `subscription_payments` tables

### Frontend Components
- `src/lib/stripePlanProducts.ts` - Stripe product mapping utilities
- Stripe-related imports and usage in:
  - `src/hooks/useSubscription.ts`
  - `src/pages/Index.tsx`
  - `src/components/subscription/InvoiceHistory.tsx`

### Scripts and Configuration
- `scripts/test-stripe-checkout.ts`
- `scripts/test-complete-checkout-flow.ts`
- `scripts/check-test-subscriptions.ts`
- Stripe environment variables from `scripts/sync-envs.sh`

### Documentation
- All Stripe-related documentation files (moved to this archive)

## Reason for Removal

The Stripe integration was removed as part of a strategic decision to simplify the checkout flow and focus on alternative payment solutions. The checkout functionality is being rebuilt with a different approach.

## Migration Applied

- **Migration file**: `supabase/migrations/20251202_remove_stripe_checkout_support.sql`
- **Reverses**: `20251201_add_stripe_checkout_support.sql`

## Current State

- All Stripe references have been removed from the codebase
- The application builds and runs successfully without Stripe dependencies
- Checkout functionality shows "under reconstruction" messages
- Payment history now only shows Asaas-related fields

## Recovery

If Stripe integration needs to be restored in the future:

1. Restore the archived files from this directory
2. Revert the migration `20251202_remove_stripe_checkout_support.sql`
3. Re-apply `20251201_add_stripe_checkout_support.sql`
4. Restore environment variables and secrets
5. Redeploy Edge Functions

## Files Archived

- `CHECKOUT_PRODUCAO.md` - Production checkout documentation
- `CREDIT_CARD_TEST_REPORT.md` - Credit card testing report
- `FEATURE_CONTRACT_PLANS_WITHOUT_SUBSCRIPTION.md` - Plan contracting feature docs
- `FRONTEND_CHECKOUT_COMPLETE.md` - Frontend implementation documentation
- `INTEGRATION_SUCCESS_REPORT.md` - Integration success report
- `TROUBLESHOOTING_CHECKOUT.md` - Checkout troubleshooting guide

---

*Archived on December 2, 2024 by Heitor (dev-agent)*