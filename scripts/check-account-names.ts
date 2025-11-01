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

async function checkAccountNames() {
  console.log('🔍 Checking ad account names...\n');

  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('id, external_id, business_name, provider, is_active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching accounts:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No ad accounts found in database');
    return;
  }

  console.log(`Found ${accounts.length} ad account(s):\n`);

  accounts.forEach((account, index) => {
    console.log(`${index + 1}. ${account.is_active ? '✅' : '❌'} Account:`);
    console.log(`   ID: ${account.id}`);
    console.log(`   External ID: ${account.external_id}`);
    console.log(`   Business Name: ${account.business_name || '(not set)'}`);
    console.log(`   Provider: ${account.provider}`);
    console.log(`   Status: ${account.is_active ? 'Active' : 'Inactive'}`);
    console.log('');
  });

  // Check if any accounts are missing business_name
  const missingNames = accounts.filter(a => !a.business_name);
  if (missingNames.length > 0) {
    console.log(`⚠️  ${missingNames.length} account(s) without business_name:`);
    missingNames.forEach(acc => {
      console.log(`   - ${acc.external_id}`);
    });
  } else {
    console.log('✅ All accounts have business_name set!');
  }
}

checkAccountNames();
