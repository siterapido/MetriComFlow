import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCampaigns() {
  console.log('Checking campaigns in database...\n');

  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, external_id, business_name, is_active')
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) {
    console.log('No active ad accounts found');
    return;
  }

  console.log('Found ' + accounts.length + ' active accounts\n');

  let totalCampaigns = 0;

  for (const account of accounts) {
    console.log('Account: ' + account.business_name);

    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('ad_account_id', account.id);

    if (!campaigns || campaigns.length === 0) {
      console.log('  No campaigns found\n');
      continue;
    }

    console.log('  Found ' + campaigns.length + ' campaigns:');
    campaigns.forEach((c, i) => {
      console.log('    ' + (i + 1) + '. ' + c.name + ' (' + c.status + ')');
    });
    console.log('');

    totalCampaigns += campaigns.length;
  }

  console.log('\nSummary: ' + totalCampaigns + ' total campaigns');

  if (totalCampaigns === 0) {
    console.log('\nNO CAMPAIGNS FOUND! Click Atualizar Dados button to sync.');
  }
}

checkCampaigns();
