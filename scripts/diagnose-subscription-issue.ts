/**
 * Diagnostic script to check subscription visibility
 * Usage: npx tsx scripts/diagnose-subscription-issue.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const USER_EMAIL = 'marcosalexandre@insigtfy.com.br';
const USER_PASSWORD = 'your-password-here'; // Replace with actual password for testing

async function main() {
  console.log('🔍 Diagnostic: Subscription Visibility\n');

  // Create client with anon key (simulates frontend)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Sign in as the user
  console.log('📋 Step 1: Signing in as user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  if (authError) {
    console.error('❌ Auth error:', authError);
    console.log('\n⚠️  Cannot continue without valid credentials.');
    console.log('Please update USER_PASSWORD in the script with the actual password.');
    process.exit(1);
  }

  console.log('✅ Signed in as:', authData.user?.email);
  console.log('User ID:', authData.user?.id);

  // 2. Check organizations
  console.log('\n📋 Step 2: Checking organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id');

  if (orgsError) {
    console.error('❌ Error fetching organizations:', orgsError);
  } else {
    console.log('✅ Organizations found:', orgs?.length || 0);
    console.log(JSON.stringify(orgs, null, 2));
  }

  // 3. Check memberships
  console.log('\n📋 Step 3: Checking organization memberships...');
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('id, organization_id, role, is_active, organizations(name)');

  if (membershipError) {
    console.error('❌ Error fetching memberships:', membershipError);
  } else {
    console.log('✅ Memberships found:', memberships?.length || 0);
    console.log(JSON.stringify(memberships, null, 2));
  }

  // 4. Check subscriptions (with explicit org_id)
  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].id;
    console.log(`\n📋 Step 4: Checking subscriptions for org ${orgId}...`);

    const { data: subs, error: subsError } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('organization_id', orgId)
      .in('status', ['active', 'trial', 'past_due']);

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError);
    } else {
      console.log('✅ Subscriptions found:', subs?.length || 0);
      console.log(JSON.stringify(subs, null, 2));
    }
  }

  // 5. Test the exact query from useCurrentSubscription
  console.log('\n📋 Step 5: Testing useCurrentSubscription query...');

  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].id;

    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('organization_id', orgId)
      .in('status', ['active', 'trial', 'past_due'])
      .maybeSingle();

    if (error) {
      console.error('❌ Error:', error);
    } else if (!data) {
      console.log('⚠️  No subscription found (RLS might be blocking)');
    } else {
      console.log('✅ Subscription found!');
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // 6. Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Signed out');

  console.log('\n' + '='.repeat(60));
  console.log('📝 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  console.log('\nIf subscription was not found in Step 5:');
  console.log('1. User needs to LOGOUT and LOGIN again in the browser');
  console.log('2. This refreshes the JWT token with new permissions');
  console.log('3. Clear browser cache and React Query cache');
  console.log('4. Try accessing /planos page again');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
