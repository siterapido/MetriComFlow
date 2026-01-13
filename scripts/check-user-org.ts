import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kyysmixnhdqrxynxjbwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk'
);

async function checkUserOrg() {
  console.log('=== VERIFICANDO USUÁRIO E ORGANIZAÇÃO ===\n');

  // Buscar usuário com email específico (marcos)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .ilike('email', '%marcos%')
    .limit(5);

  if (profileError) {
    console.error('Erro ao buscar perfis:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('Nenhum perfil encontrado com "marcos" no email');
    return;
  }

  console.log('PERFIS ENCONTRADOS:');
  profiles.forEach((p: any, i: number) => {
    console.log(`${i + 1}. ${p.full_name} (${p.email})`);
    console.log(`   ID: ${p.id}\n`);
  });

  // Para cada perfil, buscar organizações
  for (const profile of profiles) {
    console.log(`\n=== ORGANIZAÇÕES DE ${profile.full_name} ===`);

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
      .eq('profile_id', profile.id);

    if (memError) {
      console.error('Erro ao buscar memberships:', memError);
      continue;
    }

    if (!memberships || memberships.length === 0) {
      console.log('  Nenhuma organização encontrada');
      continue;
    }

    memberships.forEach((m: any) => {
      console.log(`\n  Organização: ${m.organizations?.name}`);
      console.log(`  ID: ${m.organizations?.id}`);
      console.log(`  Role: ${m.role}`);
      console.log(`  Ativa: ${m.is_active}`);
    });
  }

  // Verificar conexões Meta ativas
  console.log('\n\n=== CONEXÕES META ATIVAS ===');
  const { data: metaConns } = await supabase
    .from('meta_business_connections')
    .select('*')
    .eq('is_active', true);

  if (metaConns && metaConns.length > 0) {
    metaConns.forEach((conn: any) => {
      console.log(`\nUser ID: ${conn.user_id}`);
      console.log(`Meta User: ${conn.meta_user_name}`);
      console.log(`Token expira: ${conn.token_expires_at}`);
    });
  } else {
    console.log('Nenhuma conexão Meta ativa encontrada');
  }
}

checkUserOrg().catch(console.error);
