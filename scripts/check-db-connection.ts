import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

console.log('🔍 Database Connection Check\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Key starts with:', supabaseKey?.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  // Check if we can query any table
  const { data: profiles, error: profilesError, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('👥 Profiles check:');
  if (profilesError) {
    console.error('❌ Error:', profilesError.message);
  } else {
    console.log(`✅ Found ${count} profiles`);
    if (profiles && profiles.length > 0) {
      profiles.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.full_name || 'Unnamed'} (${p.email || 'no email'})`);
      });
    }
  }

  // Check organizations
  const { data: orgs, error: orgsError, count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('\n🏢 Organizations check:');
  if (orgsError) {
    console.error('❌ Error:', orgsError.message);
  } else {
    console.log(`✅ Found ${orgCount} organizations`);
    if (orgs && orgs.length > 0) {
      orgs.forEach((org: any, i: number) => {
        console.log(`  ${i + 1}. ${org.name} (ID: ${org.id})`);
        console.log(`     Owner: ${org.owner_id}`);
      });
    }
  }

  // Check leads (to see if there's ANY data)
  const { data: leads, error: leadsError, count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: false })
    .limit(1);

  console.log('\n📋 Leads check:');
  if (leadsError) {
    console.error('❌ Error:', leadsError.message);
  } else {
    console.log(`✅ Found ${leadsCount} leads in database`);
  }

  // List all tables we can access
  console.log('\n📊 Accessible tables:');
  const tables = [
    'profiles',
    'organizations',
    'organization_memberships',
    'leads',
    'ad_accounts',
    'ad_campaigns',
    'campaign_daily_insights',
    'meta_business_connections'
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: ${count || 0} records`);
    }
  }
}

checkConnection().catch(console.error);
