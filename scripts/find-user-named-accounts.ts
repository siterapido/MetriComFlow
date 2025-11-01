import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findUserNamedAccounts() {
  console.log('🔍 Searching for ad accounts with user names...\n');

  // Get all ad accounts (including inactive)
  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No ad accounts found');
    return;
  }

  console.log(`Found ${accounts.length} total ad account(s)\n`);

  // Check each account
  accounts.forEach((acc, index) => {
    const isUserName = acc.business_name?.includes('MARCOS') ||
                       acc.business_name?.includes('ALEXANDRE') ||
                       /\d{11}/.test(acc.business_name || ''); // Contains 11 digits (CPF pattern)

    console.log(`${index + 1}. ${acc.is_active ? '✅' : '❌'}`);
    console.log(`   ID: ${acc.id}`);
    console.log(`   External ID: ${acc.external_id}`);
    console.log(`   Business Name: ${acc.business_name || '(null)'}`);
    console.log(`   ⚠️  Looks like user name? ${isUserName ? 'YES' : 'no'}`);
    console.log(`   Provider: ${acc.provider}`);
    console.log(`   Status: ${acc.is_active ? 'ACTIVE' : 'inactive'}`);
    console.log(`   Created: ${acc.created_at}`);
    console.log('');
  });

  // Suggest fixes
  const problematicAccounts = accounts.filter(acc =>
    acc.business_name?.includes('MARCOS') ||
    acc.business_name?.includes('ALEXANDRE') ||
    /\d{11}/.test(acc.business_name || '')
  );

  if (problematicAccounts.length > 0) {
    console.log(`\n⚠️  Found ${problematicAccounts.length} account(s) with user-like names`);
    console.log('\n💡 Solution: These accounts need to be renamed via UI or updated with correct business_name from Meta API');
  }
}

findUserNamedAccounts();
