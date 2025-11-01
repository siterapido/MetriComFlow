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

async function testQuery() {
  console.log('🔍 Testing ad_accounts query (raw)...\n');

  // Query exactly as in useAdAccounts hook
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} accounts\n`);

  if (data && data.length > 0) {
    data.forEach((account, index) => {
      console.log(`Account ${index + 1}:`);
      console.log(JSON.stringify(account, null, 2));
      console.log('---');
    });
  }

  // Test with specific select fields
  console.log('\n🔍 Testing with specific fields...\n');

  const { data: data2, error: error2 } = await supabase
    .from('ad_accounts')
    .select('id, external_id, business_name, provider')
    .eq('is_active', true);

  if (error2) {
    console.error('❌ Error:', error2);
    return;
  }

  console.log('Specific fields result:');
  console.log(JSON.stringify(data2, null, 2));
}

testQuery();
