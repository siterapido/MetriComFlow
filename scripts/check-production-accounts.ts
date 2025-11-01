import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductionAccounts() {
  console.log('🔍 Checking production ad accounts...\n');

  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('id, external_id, business_name, provider, is_active, organization_id')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching accounts:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No active ad accounts found in production database');
    return;
  }

  console.log(`✅ Found ${accounts.length} active ad account(s):\n`);

  accounts.forEach((account, index) => {
    console.log(`${index + 1}. Account:`);
    console.log(`   ID: ${account.id}`);
    console.log(`   External ID: ${account.external_id}`);
    console.log(`   Business Name: ${account.business_name || '❌ NOT SET'}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Organization ID: ${account.organization_id}`);
    console.log('');
  });

  // Check what would be displayed in the UI
  console.log('📱 UI Display (business_name || external_id):');
  accounts.forEach((account, index) => {
    const displayName = account.business_name || account.external_id;
    console.log(`   ${index + 1}. ${displayName}`);
  });
}

checkProductionAccounts();
