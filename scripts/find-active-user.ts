import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kyysmixnhdqrxynxjbwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk'
);

async function findActiveUser() {
  const activeUserId = 'a41ab21c-b49b-41f1-9ac7-41b4e82ba051';

  console.log('=== BUSCANDO USUÁRIO COM CONEXÃO META ATIVA ===\n');

  // 1. Buscar perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', activeUserId)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError);
    return;
  }

  console.log('PERFIL ENCONTRADO:');
  console.log(`Nome: ${profile.full_name}`);
  console.log(`Email: ${profile.email}`);
  console.log(`ID: ${profile.id}`);
  console.log(`User Type: ${profile.user_type}\n`);

  // 2. Buscar organizações desse usuário
  const { data: memberships, error: memError } = await supabase
    .from('organization_memberships')
    .select(`
      id,
      role,
      is_active,
      organization_id,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('profile_id', activeUserId);

  if (memError) {
    console.error('Erro ao buscar memberships:', memError);
    return;
  }

  console.log(`\nORGANIZAÇÕES (${memberships?.length || 0}):`);
  if (memberships && memberships.length > 0) {
    memberships.forEach((m: any, i: number) => {
      console.log(`\n${i + 1}. ${m.organizations?.name}`);
      console.log(`   ID: ${m.organizations?.id}`);
      console.log(`   Role: ${m.role}`);
      console.log(`   Ativa: ${m.is_active}`);
    });
  } else {
    console.log('  ⚠️  NENHUMA ORGANIZAÇÃO ENCONTRADA!');
    console.log('  Esse é o problema! O usuário não tem organização ativa.');
  }

  // 3. Verificar contas de anúncios atuais
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('*');

  console.log(`\n\nCONTAS DE ANÚNCIOS ATUAIS: ${accounts?.length || 0}`);

  // 4. Sugestão de correção
  console.log('\n\n=== DIAGNÓSTICO ===');
  if (!memberships || memberships.length === 0) {
    console.log('❌ PROBLEMA: Usuário sem organização ativa');
    console.log('\n✅ SOLUÇÃO:');
    console.log('1. Criar uma organização para esse usuário');
    console.log('2. Adicionar membership ativo');
    console.log('3. Reconectar as contas Meta com a organização correta');
  }
}

findActiveUser().catch(console.error);
