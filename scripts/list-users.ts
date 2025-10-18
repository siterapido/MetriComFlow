/**
 * List Supabase Users
 *
 * Lista todos os usuários cadastrados no Supabase
 * para facilitar identificar o email correto.
 *
 * Usage: npx tsx scripts/list-users.ts
 */

const SUPABASE_URL = 'https://fjoaliipjfcnokermkhy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw';

async function listUsers() {
  console.log('📋 Listando usuários do Supabase...\n');

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    if (!data || data.users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no Supabase.');
      return;
    }

    console.log(`✅ Encontrados ${data.users.length} usuário(s):\n`);

    data.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Última entrada: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'}`);

      if (user.user_metadata?.full_name) {
        console.log(`   Nome: ${user.user_metadata.full_name}`);
      }

      console.log('');
    });

    console.log('💡 Para testar o token Meta, use:');
    console.log(`   npx tsx scripts/test-meta-token.ts ${data.users[0]?.email}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

listUsers();
