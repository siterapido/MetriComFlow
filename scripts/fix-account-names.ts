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

async function fixAccountNames() {
  console.log('🔧 Fixing account names...\n');

  // Get Meta access token
  const { data: connection } = await supabase
    .from('meta_business_connections')
    .select('access_token, user_id')
    .eq('is_active', true)
    .single();

  if (!connection) {
    console.error('❌ No active Meta connection found');
    return;
  }

  // Get problematic accounts
  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .or('business_name.ilike.%MARCOS ALEXANDRE%,business_name.ilike.%11790538424%')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log('✅ No problematic accounts found');
    return;
  }

  console.log(`Found ${accounts.length} account(s) to fix\n`);

  for (const account of accounts) {
    console.log(`\n🔄 Fixing account: ${account.external_id}`);
    console.log(`   Current name: ${account.business_name}`);

    try {
      // Fetch from Meta API
      const metaUrl = `https://graph.facebook.com/v24.0/act_${account.external_id}?fields=id,name,business_name&access_token=${connection.access_token}`;
      const response = await fetch(metaUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error(`   ❌ Meta API error:`, data);
        continue;
      }

      // Prefer business_name, fallback to name
      const correctName = data.business_name || data.name;

      if (!correctName) {
        console.warn(`   ⚠️  No name found in Meta API response`);
        continue;
      }

      console.log(`   📝 Correct name from Meta API: ${correctName}`);

      // Update in database
      const { error: updateError } = await supabase
        .from('ad_accounts')
        .update({ business_name: correctName })
        .eq('id', account.id);

      if (updateError) {
        console.error(`   ❌ Error updating:`, updateError);
      } else {
        console.log(`   ✅ Updated successfully!`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log('\n✅ Done!');
}

fixAccountNames();
