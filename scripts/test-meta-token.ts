/**
 * Test Meta Access Token
 *
 * This script tests a Meta (Facebook) access token by:
 * 1. Validating the token
 * 2. Checking permissions
 * 3. Fetching user information
 * 4. Retrieving ad accounts
 * 5. Storing the token in Supabase database
 *
 * Usage:
 * - Replace ACCESS_TOKEN with your token
 * - Replace USER_EMAIL with your Supabase user email
 * - Run: npx tsx scripts/test-meta-token.ts
 */

const ACCESS_TOKEN = 'EAAvw7ZA2xD5MBPqL3QcMZC5C7JgxY5E1PLEbzDjSpoONuuTknzJiejKyTIkpQqf8LAoZB1QIbVV4r10gheLZCok97qNYZAiYE0OEhIimKxs9yWgPIOGm5AXvdE5cgRRAVr0CC6nTZAN8yAZAmRPFAfQx1aBnr4OzIPCEd5aGcaKVtE4ZCnes4K4T0ZCvFyMdZCepUCwZAtQIgJw';

// Pegar email da linha de comando ou usar padrão
const USER_EMAIL = process.argv[2] || 'seu-email@exemplo.com';

// Supabase configuration
const SUPABASE_URL = 'https://kyysmixnhdqrxynxjbwk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk';

interface MetaTokenDebugResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
}

interface MetaUserResponse {
  id: string;
  name: string;
  email?: string;
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name?: string;
  account_id: string;
}

async function testToken() {
  console.log('🔍 Testando token do Meta Ads...\n');

  // Validar entrada
  if (USER_EMAIL === 'seu-email@exemplo.com') {
    console.error('❌ Erro: Por favor, forneça o email do usuário como argumento.');
    console.log('\n📖 Uso: npx tsx scripts/test-meta-token.ts seu-email@exemplo.com\n');
    process.exit(1);
  }

  console.log('👤 Email do usuário:', USER_EMAIL);
  console.log('');

  try {
    // 1. Validar e debugar o token
    console.log('1️⃣ Validando token...');
    const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`;
    const debugResponse = await fetch(debugUrl);

    if (!debugResponse.ok) {
      throw new Error(`Erro ao validar token: ${debugResponse.statusText}`);
    }

    const debugData: MetaTokenDebugResponse = await debugResponse.json();

    console.log('✅ Token válido!');
    console.log('   App ID:', debugData.data.app_id);
    console.log('   App Name:', debugData.data.application);
    console.log('   User ID:', debugData.data.user_id);
    console.log('   Token Type:', debugData.data.type);
    console.log('   Expira em:', new Date(debugData.data.expires_at * 1000).toLocaleString('pt-BR'));
    console.log('   Permissões:', debugData.data.scopes.join(', '));
    console.log('');

    // 2. Buscar informações do usuário
    console.log('2️⃣ Buscando informações do usuário...');
    const userUrl = `https://graph.facebook.com/v18.0/me?access_token=${ACCESS_TOKEN}&fields=id,name,email`;
    const userResponse = await fetch(userUrl);

    if (!userResponse.ok) {
      throw new Error(`Erro ao buscar usuário: ${userResponse.statusText}`);
    }

    const userData: MetaUserResponse = await userResponse.json();
    console.log('✅ Usuário encontrado!');
    console.log('   Nome:', userData.name);
    console.log('   Email:', userData.email || 'N/A');
    console.log('   ID:', userData.id);
    console.log('');

    // 3. Buscar contas de anúncios
    console.log('3️⃣ Buscando contas de anúncios...');
    const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${ACCESS_TOKEN}&fields=id,name,account_status,currency,timezone_name,account_id`;
    const adAccountsResponse = await fetch(adAccountsUrl);

    if (!adAccountsResponse.ok) {
      throw new Error(`Erro ao buscar contas: ${adAccountsResponse.statusText}`);
    }

    const adAccountsData = await adAccountsResponse.json();

    if (adAccountsData.data && adAccountsData.data.length > 0) {
      console.log(`✅ Encontradas ${adAccountsData.data.length} conta(s) de anúncios:`);
      adAccountsData.data.forEach((account: MetaAdAccount, index: number) => {
        const status = account.account_status === 1 ? 'Ativa' : 'Inativa';
        console.log(`\n   Conta ${index + 1}:`);
        console.log('   ID:', account.id);
        console.log('   Nome:', account.name);
        console.log('   Status:', status);
        console.log('   Moeda:', account.currency);
        console.log('   Timezone:', account.timezone_name || 'N/A');
      });
      console.log('');
    } else {
      console.log('⚠️  Nenhuma conta de anúncios encontrada.');
      console.log('   Verifique se o usuário tem acesso a contas de anúncios no Meta Business Manager.');
      console.log('');
    }

    // 4. Armazenar no Supabase
    console.log('4️⃣ Armazenando token no Supabase...');

    // Importar Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar usuário pelo email
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Erro ao buscar usuário: ${authError.message}`);
    }

    const user = authUser.users.find(u => u.email === USER_EMAIL);

    if (!user) {
      throw new Error(`Usuário com email ${USER_EMAIL} não encontrado no Supabase`);
    }

    console.log('✅ Usuário Supabase encontrado:', user.email);

    // Inserir ou atualizar conexão
    const { error: connectionError } = await supabase
      .from('meta_business_connections')
      .upsert({
        user_id: user.id,
        meta_user_id: userData.id,
        meta_user_name: userData.name,
        meta_user_email: userData.email,
        access_token: ACCESS_TOKEN,
        token_expires_at: new Date(debugData.data.expires_at * 1000).toISOString(),
        connected_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'user_id,meta_user_id'
      });

    if (connectionError) {
      throw new Error(`Erro ao salvar conexão: ${connectionError.message}`);
    }

    console.log('✅ Conexão Meta Business salva com sucesso!');

    // Salvar contas de anúncios
    if (adAccountsData.data && adAccountsData.data.length > 0) {
      const accountsToInsert = adAccountsData.data.map((account: MetaAdAccount) => ({
        user_id: user.id,
        ad_account_id: account.id,
        name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        timezone_name: account.timezone_name,
        platform: 'meta_ads',
        is_active: account.account_status === 1,
        connected_at: new Date().toISOString(),
      }));

      const { error: accountsError } = await supabase
        .from('ad_accounts')
        .upsert(accountsToInsert, { onConflict: 'ad_account_id' });

      if (accountsError) {
        throw new Error(`Erro ao salvar contas: ${accountsError.message}`);
      }

      console.log(`✅ ${adAccountsData.data.length} conta(s) de anúncios salva(s) com sucesso!`);
    }

    console.log('\n🎉 Tudo configurado com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Acesse a aplicação e vá para /meta-ads-config');
    console.log('   2. Você verá a conexão ativa com o Meta Business Manager');
    console.log('   3. Poderá visualizar e gerenciar suas contas de anúncios');

  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Executar teste
testToken();
