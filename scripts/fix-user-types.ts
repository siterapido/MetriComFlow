#!/usr/bin/env tsx
/**
 * Script to fix user_type for existing users who should be owners
 * This script uses service_role to bypass RLS restrictions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- VITE_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixUserTypes() {
  console.log('🔍 Finding users with sales type who are organization owners...\n')

  // Find users who are sales but have owner role in organization_memberships
  const { data: usersToFix, error: queryError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      user_type,
      organization_memberships!organization_memberships_profile_id_fkey!inner(role, organization_id)
    `)
    .eq('user_type', 'sales')
    .eq('organization_memberships.role', 'owner')
    .eq('organization_memberships.is_active', true)

  if (queryError) {
    console.error('❌ Error querying users:', queryError)
    process.exit(1)
  }

  if (!usersToFix || usersToFix.length === 0) {
    console.log('✅ No users need fixing!')
    return
  }

  console.log(`Found ${usersToFix.length} users to fix:\n`)
  usersToFix.forEach(user => {
    console.log(`  - ${user.email} (${user.full_name})`)
  })
  console.log()

  // Update each user's type to owner
  for (const user of usersToFix) {
    console.log(`🔧 Updating ${user.email} to owner...`)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ user_type: 'owner' })
      .eq('id', user.id)

    if (updateError) {
      console.error(`   ❌ Failed: ${updateError.message}`)
    } else {
      console.log(`   ✅ Success`)
    }
  }

  console.log('\n✨ Done!')
}

fixUserTypes().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
