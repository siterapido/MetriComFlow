/**
 * Script to update user to owner type and create Pro plan subscription
 * Usage: npx tsx scripts/update-user-to-owner-pro.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const USER_EMAIL = 'marcosalexandre@insigtfy.com.br';

async function main() {
  console.log('🔧 Starting user update to owner with Pro plan...\n');

  // 1. Get user ID
  console.log('📋 Step 1: Getting user profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, user_type')
    .eq('email', USER_EMAIL)
    .single();

  if (profileError || !profile) {
    console.error('❌ Error getting profile:', profileError);
    process.exit(1);
  }

  console.log('✅ Found profile:', profile);
  const userId = profile.id;

  // 2. Update user_type to owner (using service role)
  console.log('\n📋 Step 2: Updating user_type to owner...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ user_type: 'owner', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Error updating user_type:', updateError);
    process.exit(1);
  }

  console.log('✅ User type updated to "owner"');

  // 3. Check if user already has an organization
  console.log('\n📋 Step 3: Checking for existing organization...');
  const { data: existingOrg, error: orgCheckError } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (orgCheckError) {
    console.error('❌ Error checking organization:', orgCheckError);
    process.exit(1);
  }

  let organizationId: string;

  if (existingOrg) {
    console.log('✅ Found existing organization:', existingOrg);
    organizationId = existingOrg.id;
  } else {
    // Create new organization
    console.log('📋 Creating new organization...');
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: "Marcos Alexandre's Organization",
        slug: `marcos-alexandre-org-${Date.now()}`,
        owner_id: userId,
      })
      .select('id, name')
      .single();

    if (createOrgError || !newOrg) {
      console.error('❌ Error creating organization:', createOrgError);
      process.exit(1);
    }

    console.log('✅ Organization created:', newOrg);
    organizationId = newOrg.id;

    // Create organization membership
    console.log('\n📋 Step 4: Creating organization membership...');
    const { error: membershipError } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: organizationId,
        profile_id: userId,
        role: 'owner',
        is_active: true,
      });

    if (membershipError) {
      console.error('❌ Error creating membership:', membershipError);
      process.exit(1);
    }

    console.log('✅ Membership created with role "owner"');
  }

  // 5. Get Pro plan
  console.log('\n📋 Step 5: Getting Pro plan...');
  const { data: proPlan, error: planError } = await supabase
    .from('subscription_plans')
    .select('id, name, slug, price')
    .eq('slug', 'pro')
    .single();

  if (planError || !proPlan) {
    console.error('❌ Error getting Pro plan:', planError);
    process.exit(1);
  }

  console.log('✅ Found Pro plan:', proPlan);

  // 6. Check if subscription already exists
  console.log('\n📋 Step 6: Checking for existing subscription...');
  const { data: existingSub, error: subCheckError } = await supabase
    .from('organization_subscriptions')
    .select('id, status, plan_id')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trial', 'past_due'])
    .maybeSingle();

  if (subCheckError) {
    console.error('❌ Error checking subscription:', subCheckError);
    process.exit(1);
  }

  if (existingSub) {
    console.log('⚠️  Found existing subscription:', existingSub);

    // Update to Pro plan
    console.log('📋 Updating subscription to Pro plan...');
    const { error: updateSubError } = await supabase
      .from('organization_subscriptions')
      .update({
        plan_id: proPlan.id,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);

    if (updateSubError) {
      console.error('❌ Error updating subscription:', updateSubError);
      process.exit(1);
    }

    console.log('✅ Subscription updated to Pro plan');
  } else {
    // Create new subscription
    console.log('📋 Creating new Pro subscription...');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { data: newSub, error: createSubError } = await supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: organizationId,
        plan_id: proPlan.id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        metadata: { script_created: true, created_by: 'admin' },
      })
      .select('id, status')
      .single();

    if (createSubError || !newSub) {
      console.error('❌ Error creating subscription:', createSubError);
      process.exit(1);
    }

    console.log('✅ Subscription created:', newSub);
  }

  // 7. Verify final configuration
  console.log('\n📋 Step 7: Verifying final configuration...');
  const { data: finalCheck, error: finalError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      user_type,
      organization_memberships!inner(
        organization_id,
        role,
        is_active,
        organizations!inner(
          id,
          name,
          slug,
          organization_subscriptions!inner(
            id,
            status,
            subscription_plans!inner(
              name,
              slug,
              price
            )
          )
        )
      )
    `)
    .eq('email', USER_EMAIL)
    .single();

  if (finalError) {
    console.error('❌ Error verifying configuration:', finalError);
    process.exit(1);
  }

  console.log('\n✅ FINAL CONFIGURATION:');
  console.log(JSON.stringify(finalCheck, null, 2));

  console.log('\n🎉 SUCCESS! User updated to owner with Pro plan');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
