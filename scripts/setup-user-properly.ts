import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kyysmixnhdqrxynxjbwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk'
);

async function setupUser() {
  console.log('=== CONFIGURAÇÃO COMPLETA DO USUÁRIO ===\n');

  // IDs relevantes
  const targetUserId = 'a41ab21c-b49b-41f1-9ac7-41b4e82ba051'; // testefinal2@gmail.com
  const targetOrgId = '34745c52-6035-440d-b7a4-69455cf676eb'; // teste empresa - Organização

  console.log('Usuário alvo: testefinal2@gmail.com');
  console.log('Organização: teste empresa - Organização\n');

  // 1. Verificar se há dados de dashboard
  const { data: goals } = await supabase
    .from('client_goals')
    .select('*')
    .eq('organization_id', targetOrgId);

  console.log(`Metas na organização: ${goals?.length || 0}`);

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', targetOrgId);

  console.log(`Leads na organização: ${leads?.length || 0}`);

  // 2. Verificar status da conexão Meta
  const { data: metaConn } = await supabase
    .from('meta_business_connections')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .single();

  if (metaConn) {
    console.log('\n✅ Conexão Meta ativa encontrada');
    console.log(`   Meta User: ${metaConn.meta_user_name}`);
    console.log(`   Token expira: ${metaConn.token_expires_at}`);

    // Verificar se o token está expirado
    const expiresAt = new Date(metaConn.token_expires_at);
    const now = new Date();

    if (expiresAt < now) {
      console.log('   ⚠️  Token EXPIRADO! Precisa reconectar.');
    } else {
      console.log(`   ✅ Token válido até ${expiresAt.toLocaleDateString()}`);
    }
  } else {
    console.log('\n❌ Nenhuma conexão Meta ativa');
  }

  console.log('\n\n=== PRÓXIMOS PASSOS ===\n');
  console.log('Para resolver o problema:');
  console.log('\n1. FAÇA LOGIN com o usuário correto:');
  console.log('   Email: testefinal2@gmail.com');
  console.log('   (Esse é o usuário que tem a conexão Meta ativa)\n');

  console.log('2. Acesse /meta-ads-config\n');

  console.log('3. Conecte as contas de anúncios:');
  console.log('   - Marcos de Souza (199415206844304)');
  console.log('   - CA - SITE RAPIDO (1558732224693082)');
  console.log('   - Smartcell (1398847601234023)\n');

  console.log('4. As contas serão vinculadas à organização correta');
  console.log('   e os dados aparecerão no dashboard.\n');

  console.log('\n=== ALTERNATIVA ===\n');
  console.log('Se você quer usar outro usuário (ex: marcos@insightfy.com.br):');
  console.log('1. Desconecte a conta Meta do usuário atual (testefinal2)');
  console.log('2. Faça login com o novo usuário');
  console.log('3. Conecte a conta Meta novamente via OAuth');
  console.log('4. As contas de anúncios serão vinculadas à organização do novo usuário\n');
}

setupUser().catch(console.error);
