import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabase = createClient(
  'https://fjoaliipjfcnokermkhy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw'
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateConnection() {
  console.log('=== MIGRAÇÃO DE CONEXÃO META ===\n');

  // Usuário com conexão atual
  const currentUserId = 'a41ab21c-b49b-41f1-9ac7-41b4e82ba051';

  console.log('OPÇÕES DE USUÁRIOS:\n');
  console.log('1. marcos@insightfy.com.br (ID: 1c764a66-f23a-46ea-9aca-29f010253f3e)');
  console.log('2. marcos1@teste.com (ID: b1e11b97-ef12-4e2c-96ee-1538cab6d44c)');
  console.log('3. Manter testefinal2@gmail.com (atual)\n');

  const choice = await question('Escolha uma opção (1, 2 ou 3): ');

  let targetUserId = currentUserId;
  let targetEmail = 'testefinal2@gmail.com';

  if (choice === '1') {
    targetUserId = '1c764a66-f23a-46ea-9aca-29f010253f3e';
    targetEmail = 'marcos@insightfy.com.br';
  } else if (choice === '2') {
    targetUserId = 'b1e11b97-ef12-4e2c-96ee-1538cab6d44c';
    targetEmail = 'marcos1@teste.com';
  } else if (choice !== '3') {
    console.log('Opção inválida. Saindo...');
    rl.close();
    return;
  }

  console.log(`\nUsuário selecionado: ${targetEmail}\n`);

  // Verificar se o usuário tem organização
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select(`
      id,
      organization_id,
      organizations (
        id,
        name
      )
    `)
    .eq('profile_id', targetUserId)
    .eq('is_active', true);

  if (!memberships || memberships.length === 0) {
    console.log('❌ Erro: Usuário não tem organização ativa!');
    console.log('Criando organização...\n');

    // Buscar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', targetUserId)
      .single();

    const orgName = `${profile?.full_name || 'Minha'} Organização`;

    // Criar organização
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgName.toLowerCase().replace(/\s+/g, '-'),
        owner_id: targetUserId
      })
      .select()
      .single();

    if (orgError) {
      console.error('Erro ao criar organização:', orgError);
      rl.close();
      return;
    }

    console.log(`✅ Organização criada: ${newOrg.name}`);

    // Criar membership
    const { error: memError } = await supabase
      .from('organization_memberships')
      .insert({
        profile_id: targetUserId,
        organization_id: newOrg.id,
        role: 'owner',
        is_active: true
      });

    if (memError) {
      console.error('Erro ao criar membership:', memError);
      rl.close();
      return;
    }

    console.log(`✅ Membership criada\n`);
  } else {
    console.log(`✅ Usuário já possui organização: ${memberships[0].organizations?.name}\n`);
  }

  if (targetUserId === currentUserId) {
    console.log('✅ Conexão Meta já está vinculada a este usuário!');
    console.log('\nAgora você pode conectar as contas em /meta-ads-config');
    rl.close();
    return;
  }

  // Migrar conexão Meta
  console.log('Migrando conexão Meta...\n');

  const { error: updateError } = await supabase
    .from('meta_business_connections')
    .update({ user_id: targetUserId })
    .eq('user_id', currentUserId)
    .eq('is_active', true);

  if (updateError) {
    console.error('Erro ao migrar conexão:', updateError);
    rl.close();
    return;
  }

  console.log('✅ Conexão Meta migrada com sucesso!\n');
  console.log('PRÓXIMOS PASSOS:');
  console.log(`1. Faça login com: ${targetEmail}`);
  console.log('2. Acesse /meta-ads-config');
  console.log('3. Conecte suas contas de anúncios');
  console.log('4. Os dados aparecerão no dashboard\n');

  rl.close();
}

migrateConnection().catch(err => {
  console.error('Erro:', err);
  rl.close();
});
