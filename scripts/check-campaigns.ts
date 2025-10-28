import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCampaigns() {
  console.log('🔍 Checking Meta Ads Integration Status...\n');

  // 1. Check total campaigns
  const { data: campaigns, error: campaignsError, count: campaignCount } = await supabase
    .from('ad_campaigns')
    .select('*', { count: 'exact', head: false });

  if (campaignsError) {
    console.error('❌ Error fetching campaigns:', campaignsError);
  } else {
    console.log(`📊 Total campaigns in database: ${campaignCount || 0}`);
    if (campaigns && campaigns.length > 0) {
      console.log('\n📋 Sample campaigns:');
      campaigns.slice(0, 5).forEach((c: any, i: number) => {
        console.log(`  ${i + 1}. ${c.name} (${c.external_id}) - Status: ${c.status}`);
      });
    }
  }

  // 2. Check ad accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('ad_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('\n💼 Ad Accounts:');
  if (accountsError) {
    console.error('❌ Error fetching ad accounts:', accountsError);
  } else if (!accounts || accounts.length === 0) {
    console.log('⚠️  No ad accounts found!');
  } else {
    accounts.forEach((acc: any, i: number) => {
      console.log(`  ${i + 1}. ${acc.business_name || 'Unnamed'} (ID: ${acc.external_id})`);
      console.log(`     - Active: ${acc.is_active ? '✅' : '❌'}`);
      console.log(`     - Organization ID: ${acc.organization_id || '⚠️  MISSING'}`);
      console.log(`     - Connected by: ${acc.connected_by || 'Unknown'}`);
    });
  }

  // 3. Check campaign insights
  const { data: insights, count: insightsCount } = await supabase
    .from('campaign_daily_insights')
    .select('*', { count: 'exact', head: false })
    .limit(1);

  console.log(`\n📈 Total insights records: ${insightsCount || 0}`);

  if (insightsCount && insightsCount > 0) {
    // Get date range
    const { data: dateRange } = await supabase
      .from('campaign_daily_insights')
      .select('date')
      .order('date', { ascending: true })
      .limit(1)
      .single();

    const { data: latestDate } = await supabase
      .from('campaign_daily_insights')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (dateRange && latestDate) {
      console.log(`   Date range: ${dateRange.date} to ${latestDate.date}`);
    }

    // Get monthly breakdown
    const { data: monthlyData, error: monthlyError } = await supabase
      .rpc('get_monthly_insights_summary');

    if (!monthlyError && monthlyData) {
      console.log('\n📅 Monthly breakdown (if available):');
      console.log(monthlyData);
    }
  }

  // 4. Check Meta business connections
  const { data: connections, error: connectionsError } = await supabase
    .from('meta_business_connections')
    .select('*')
    .eq('is_active', true);

  console.log('\n🔗 Meta Business Connections:');
  if (connectionsError) {
    console.error('❌ Error fetching connections:', connectionsError);
  } else if (!connections || connections.length === 0) {
    console.log('⚠️  No active Meta business connections found!');
    console.log('   You need to connect a Meta Business account first.');
  } else {
    connections.forEach((conn: any, i: number) => {
      console.log(`  ${i + 1}. ${conn.meta_user_name || 'Unnamed'} (User ID: ${conn.meta_user_id})`);
      console.log(`     - Connected at: ${new Date(conn.connected_at).toLocaleString()}`);
      if (conn.token_expires_at) {
        const expiresAt = new Date(conn.token_expires_at);
        const isExpired = expiresAt < new Date();
        console.log(`     - Token expires: ${expiresAt.toLocaleString()} ${isExpired ? '❌ EXPIRED' : '✅'}`);
      } else {
        console.log(`     - Token expires: No expiration set`);
      }
    });
  }

  // 5. Check organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);

  console.log('\n🏢 Organizations (sample):');
  if (orgsError) {
    console.error('❌ Error fetching organizations:', orgsError);
  } else if (!orgs || orgs.length === 0) {
    console.log('⚠️  No organizations found!');
  } else {
    orgs.forEach((org: any, i: number) => {
      console.log(`  ${i + 1}. ${org.name} (ID: ${org.id})`);
    });
  }

  console.log('\n✅ Check complete!\n');
}

checkCampaigns().catch(console.error);
