#!/usr/bin/env tsx
/**
 * Script to fix organization_id for existing ad_accounts
 * This script associates ad_accounts with the user's current organization
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

async function fixAdAccountsOrganization() {
  console.log('🔍 Finding ad_accounts without organization_id or with wrong organization...\n')

  // Get all ad_accounts with their connected_by user
  const { data: adAccounts, error: accountsError } = await supabase
    .from('ad_accounts')
    .select(`
      id,
      external_id,
      business_name,
      connected_by,
      organization_id,
      is_active
    `)
    .eq('provider', 'meta')

  if (accountsError) {
    console.error('❌ Error querying ad_accounts:', accountsError)
    process.exit(1)
  }

  if (!adAccounts || adAccounts.length === 0) {
    console.log('✅ No ad_accounts found!')
    return
  }

  console.log(`Found ${adAccounts.length} ad_accounts\n`)

  // For each ad_account, get the user's active organization
  let fixedCount = 0
  let errorCount = 0

  for (const account of adAccounts) {
    // Get user's active organization
    const { data: orgMembership, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id, organization:organizations(name)')
      .eq('profile_id', account.connected_by)
      .eq('is_active', true)
      .single()

    if (orgError || !orgMembership) {
      console.error(`   ❌ No active organization for user ${account.connected_by}`)
      errorCount++
      continue
    }

    const correctOrgId = orgMembership.organization_id
    const orgName = (orgMembership.organization as any)?.name || 'Unknown'

    // Check if organization_id needs updating
    if (account.organization_id === correctOrgId) {
      console.log(`   ✓ ${account.business_name} (${account.external_id}) - Already correct (${orgName})`)
      continue
    }

    console.log(`🔧 Updating ${account.business_name} (${account.external_id})`)
    console.log(`   Old org: ${account.organization_id || 'NULL'}`)
    console.log(`   New org: ${correctOrgId} (${orgName})`)

    const { error: updateError } = await supabase
      .from('ad_accounts')
      .update({ organization_id: correctOrgId })
      .eq('id', account.id)

    if (updateError) {
      console.error(`   ❌ Failed: ${updateError.message}`)
      errorCount++
    } else {
      console.log(`   ✅ Success`)
      fixedCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total accounts: ${adAccounts.length}`)
  console.log(`   Fixed: ${fixedCount}`)
  console.log(`   Errors: ${errorCount}`)
  console.log(`   Already correct: ${adAccounts.length - fixedCount - errorCount}`)
  console.log('\n✨ Done!')
}

fixAdAccountsOrganization().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
