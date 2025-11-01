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

// Manual mapping: external_id -> desired name
const ACCOUNT_NAMES: Record<string, string> = {
  '199415206844304': 'CA - Site Rápido',
  '1558732224693082': 'Site Rápido',
  '1398847601234023': 'Smartcell Natal', // This one is already OK
};

async function renameAccountsManually() {
  console.log('🔧 Renaming accounts with manual mappings...\n');

  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .in('external_id', Object.keys(ACCOUNT_NAMES))
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('⚠️  No accounts found to rename');
    return;
  }

  console.log(`Found ${accounts.length} account(s) to rename\n`);

  for (const account of accounts) {
    const newName = ACCOUNT_NAMES[account.external_id];

    if (!newName) continue;

    console.log(`\n🔄 Account: ${account.external_id}`);
    console.log(`   Current name: ${account.business_name}`);
    console.log(`   New name: ${newName}`);

    const { error: updateError } = await supabase
      .from('ad_accounts')
      .update({ business_name: newName })
      .eq('id', account.id);

    if (updateError) {
      console.error(`   ❌ Error:`, updateError);
    } else {
      console.log(`   ✅ Renamed successfully!`);
    }
  }

  console.log('\n✅ Done! Refresh the page to see the changes.');
}

renameAccountsManually();
