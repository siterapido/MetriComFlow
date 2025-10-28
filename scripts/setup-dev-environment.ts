#!/usr/bin/env tsx
/**
 * Script para configurar ambiente de desenvolvimento com dados de exemplo
 * Cria: usuário, organização, conta Meta, campanhas e dados históricos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   Certifique-se que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dados de exemplo baseados em campanhas reais
const SAMPLE_CAMPAIGNS = [
  {
    name: '[TRÁFEGO] [SITE] Captura de Leads',
    external_id: 'camp_001',
    objective: 'LEAD_GENERATION',
    status: 'ACTIVE',
    daily_spend_avg: 85.50,
    impressions_avg: 8500,
    clicks_avg: 125,
    leads_avg: 8
  },
  {
    name: '[ENGAJAMENTO] [WHATSAPP] Conversas',
    external_id: 'camp_002',
    objective: 'MESSAGES',
    status: 'ACTIVE',
    daily_spend_avg: 120.00,
    impressions_avg: 15000,
    clicks_avg: 200,
    leads_avg: 12
  },
  {
    name: '[VENDAS] [WHATSAPP] Black Friday',
    external_id: 'camp_003',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    daily_spend_avg: 200.00,
    impressions_avg: 20000,
    clicks_avg: 300,
    leads_avg: 15
  },
  {
    name: '[RECONHECIMENTO] Brand Awareness',
    external_id: 'camp_004',
    objective: 'BRAND_AWARENESS',
    status: 'PAUSED',
    daily_spend_avg: 50.00,
    impressions_avg: 25000,
    clicks_avg: 100,
    leads_avg: 3
  },
];

async function main() {
  console.log('🚀 Configurando ambiente de desenvolvimento...\n');

  try {
    // 1. Criar usuário de teste via Auth
    console.log('👤 Criando usuário de teste...');

    const testEmail = 'dev@insightfy.com.br';
    const testPassword = 'Test@123456';

    let userId: string;
    let userExists = false;

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === testEmail);

    if (existingUser) {
      console.log('   ℹ️  Usuário já existe, usando existente');
      userId = existingUser.id;
      userExists = true;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Desenvolvedor InsightFy'
        }
      });

      if (authError) {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      userId = authData.user.id;
      console.log('   ✅ Usuário criado:', testEmail);
      console.log('   🔑 Senha:', testPassword);
    }

    // 2. Criar perfil se não existir
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: testEmail,
          full_name: 'Desenvolvedor InsightFy',
          user_type: 'owner'
        });

      if (profileError) throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      console.log('   ✅ Perfil criado');
    }

    // 3. Criar organização
    console.log('\n🏢 Criando organização...');

    let orgId: string;
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingOrg) {
      console.log('   ℹ️  Organização já existe');
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'InsightFy Dev',
          slug: 'insightfy-dev',
          owner_id: userId
        })
        .select()
        .single();

      if (orgError) throw new Error(`Erro ao criar organização: ${orgError.message}`);
      orgId = newOrg.id;
      console.log('   ✅ Organização criada:', newOrg.name);

      // 4. Criar membership
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          organization_id: orgId,
          profile_id: userId,
          role: 'owner',
          is_active: true
        });

      if (membershipError) throw new Error(`Erro ao criar membership: ${membershipError.message}`);
      console.log('   ✅ Membership criado (owner)');
    }

    // 5. Criar Meta Business Connection
    console.log('\n🔗 Criando conexão Meta Business...');

    const { data: existingConnection } = await supabase
      .from('meta_business_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!existingConnection) {
      const { error: connectionError } = await supabase
        .from('meta_business_connections')
        .insert({
          user_id: userId,
          meta_user_id: 'test_meta_user_123',
          meta_user_name: 'Dev User',
          meta_user_email: testEmail,
          access_token: 'test_token_' + Date.now(),
          is_active: true
        });

      if (connectionError) throw new Error(`Erro ao criar conexão: ${connectionError.message}`);
      console.log('   ✅ Conexão Meta criada');
    } else {
      console.log('   ℹ️  Conexão Meta já existe');
    }

    // 6. Criar conta de anúncios
    console.log('\n💼 Criando conta de anúncios...');

    let adAccountId: string;
    const { data: existingAccount } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('organization_id', orgId)
      .eq('external_id', 'act_1558732224693082')
      .maybeSingle();

    if (existingAccount) {
      console.log('   ℹ️  Conta de anúncios já existe');
      adAccountId = existingAccount.id;
    } else {
      const { data: newAccount, error: accountError } = await supabase
        .from('ad_accounts')
        .insert({
          external_id: 'act_1558732224693082',
          business_name: 'InsightFy - Conta Demo',
          provider: 'meta',
          platform: 'meta_ads',
          is_active: true,
          connected_by: userId,
          organization_id: orgId
        })
        .select()
        .single();

      if (accountError) throw new Error(`Erro ao criar conta: ${accountError.message}`);
      adAccountId = newAccount.id;
      console.log('   ✅ Conta de anúncios criada:', newAccount.business_name);
    }

    // 7. Criar campanhas
    console.log('\n📢 Criando campanhas...');

    const { data: existingCampaigns } = await supabase
      .from('ad_campaigns')
      .select('id')
      .eq('ad_account_id', adAccountId);

    if (existingCampaigns && existingCampaigns.length > 0) {
      console.log(`   ℹ️  ${existingCampaigns.length} campanhas já existem`);
    } else {
      const campaignsToInsert = SAMPLE_CAMPAIGNS.map(camp => ({
        external_id: camp.external_id,
        name: camp.name,
        objective: camp.objective,
        status: camp.status,
        ad_account_id: adAccountId,
        start_time: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const { data: campaigns, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .insert(campaignsToInsert)
        .select();

      if (campaignsError) throw new Error(`Erro ao criar campanhas: ${campaignsError.message}`);
      console.log(`   ✅ ${campaigns.length} campanhas criadas`);

      // 8. Criar insights históricos (últimos 90 dias)
      console.log('\n📊 Gerando insights históricos (últimos 90 dias)...');

      const insights = [];
      const now = new Date();
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const campaign of campaigns) {
        const campConfig = SAMPLE_CAMPAIGNS.find(c => c.external_id === campaign.external_id)!;

        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
          // Variação aleatória ±20%
          const variance = 0.8 + Math.random() * 0.4;

          insights.push({
            campaign_id: campaign.id,
            date: d.toISOString().split('T')[0],
            spend: +(campConfig.daily_spend_avg * variance).toFixed(2),
            impressions: Math.floor(campConfig.impressions_avg * variance),
            clicks: Math.floor(campConfig.clicks_avg * variance),
            leads_count: Math.floor(campConfig.leads_avg * variance),
          });
        }
      }

      // Inserir em lotes de 500
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < insights.length; i += batchSize) {
        const batch = insights.slice(i, i + batchSize);
        const { error: insightsError } = await supabase
          .from('campaign_daily_insights')
          .insert(batch);

        if (insightsError) {
          console.error(`   ⚠️  Erro no lote ${Math.floor(i / batchSize) + 1}:`, insightsError.message);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`   ✅ ${inserted} registros de insights criados`);
    }

    // 9. Resumo final
    console.log('\n📈 Resumo do ambiente configurado:\n');

    const { count: campaignCount } = await supabase
      .from('ad_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('ad_account_id', adAccountId);

    const { count: insightCount } = await supabase
      .from('campaign_daily_insights')
      .select('*', { count: 'exact', head: true });

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

    console.log('  ✅ Usuário:', testEmail);
    console.log('  ✅ Senha:', testPassword);
    console.log('  ✅ Organização:', 'InsightFy Dev');
    console.log('  ✅ Contas de anúncios: 1');
    console.log(`  ✅ Campanhas: ${campaignCount}`);
    console.log(`  ✅ Insights: ${insightCount} registros`);
    if (dateRange && latestDate) {
      console.log(`  ✅ Período de dados: ${dateRange.date} a ${latestDate.date}`);
    }

    console.log('\n🎉 Ambiente configurado com sucesso!');
    console.log('\n🚀 Próximos passos:');
    console.log('   1. Execute: npm run dev');
    console.log('   2. Acesse: http://localhost:8082');
    console.log(`   3. Login: ${testEmail} / ${testPassword}`);
    console.log('   4. Vá para: /meta-ads-config para ver as campanhas\n');

  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
