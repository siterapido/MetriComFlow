#!/usr/bin/env node
/**
 * Script para criar usuário admin via Supabase Admin API
 *
 * INSTRUÇÕES DE USO:
 *   1. Copie o arquivo .env.example para .env e preencha:
 *      SUPABASE_URL=https://kyysmixnhdqrxynxjbwk.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
 *
 *   2. Instale as dependências:
 *      npm install @supabase/supabase-js
 *
 *   3. Execute:
 *      node scripts/create-admin-user.js
 *
 * Como obter a SERVICE_ROLE_KEY:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kyysmixnhdqrxynxjbwk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'giordanokairo13@gmail.com';
const ADMIN_PASSWORD = 'vy@1Qg3z2tIB*a7y';
const ADMIN_FULL_NAME = 'Giordano Kairo';

async function createAdminUser() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.');
    console.error('   Defina a variável de ambiente antes de executar:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=<chave> node scripts/create-admin-user.js');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('🔧 Criando usuário admin...');
  console.log(`   Email: ${ADMIN_EMAIL}`);

  // 1. Verifica se usuário já existe
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

  if (existing) {
    console.log(`⚠️  Usuário já existe com ID: ${existing.id}`);
    console.log('   Atualizando role para admin...');

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', existing.id);

    if (updateErr) {
      console.error('❌ Erro ao atualizar role:', updateErr.message);
      process.exit(1);
    }

    console.log('✅ Role atualizado para admin com sucesso!');
    return;
  }

  // 2. Cria o usuário via Admin API
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_FULL_NAME },
  });

  if (createErr) {
    console.error('❌ Erro ao criar usuário:', createErr.message);
    process.exit(1);
  }

  const userId = created.user?.id;
  console.log(`✅ Usuário criado com ID: ${userId}`);

  // 3. Atualiza profile para role = 'admin'
  // (o trigger handle_new_user já criou o profile com user_type = 'owner')
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role: 'admin', full_name: ADMIN_FULL_NAME })
    .eq('id', userId);

  if (profileErr) {
    console.error('❌ Erro ao atualizar profile:', profileErr.message);
    process.exit(1);
  }

  console.log('');
  console.log('============================================');
  console.log('✅ Usuário admin criado com sucesso!');
  console.log('--------------------------------------------');
  console.log(`   Email:  ${ADMIN_EMAIL}`);
  console.log(`   Senha:  ${ADMIN_PASSWORD}`);
  console.log(`   ID:     ${userId}`);
  console.log('============================================');
  console.log('⚠️  IMPORTANTE: Anote a senha em local seguro!');
}

createAdminUser().catch(err => {
  console.error('❌ Erro inesperado:', err.message);
  process.exit(1);
});
