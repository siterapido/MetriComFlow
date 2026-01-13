import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kyysmixnhdqrxynxjbwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk'
);

async function fixAndMigrate() {
  console.log('=== CORREÇÃO E MIGRAÇÃO AUTOMÁTICA ===\n');

  const targetUserId = '1c764a66-f23a-46ea-9aca-29f010253f3e'; // marcos@insightfy.com.br
  const currentUserId = 'a41ab21c-b49b-41f1-9ac7-41b4e82ba051'; // testefinal2@gmail.com

  // 1. Verificar organizações do usuário alvo
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select(`
      id,
      organization_id,
      is_active,
      role,
      organizations (
        id,
        name
      )
    `)
    .eq('profile_id', targetUserId);

  console.log(`Memberships encontrados: ${memberships?.length || 0}\n`);

  if (memberships && memberships.length > 0) {
    // Ativar todos os memberships inativos
    const inactiveMembers = memberships.filter(m => !m.is_active);

    if (inactiveMembers.length > 0) {
      console.log(`Ativando ${inactiveMembers.length} memberships inativos...\n`);

      for (const member of inactiveMembers) {
        await supabase
          .from('organization_memberships')
          .update({ is_active: true })
          .eq('id', member.id);
      }

      console.log('✅ Memberships ativados!\n');
    }

    // Mostrar organizações
    console.log('Organizações do usuário:');
    memberships.forEach((m: any, i: number) => {
      console.log(`${i + 1}. ${m.organizations?.name} (${m.is_active ? 'Ativa' : 'Inativa'})`);
      console.log(`   ID: ${m.organization_id}`);
      console.log(`   Role: ${m.role}\n`);
    });

    // Usar a primeira organização ativa
    const activeOrg = memberships.find(m => m.is_active) || memberships[0];
    const targetOrgId = activeOrg.organization_id;

    console.log(`\n✅ Usando organização: ${activeOrg.organizations?.name}\n`);

    // 2. Migrar conexão Meta
    console.log('Migrando conexão Meta para o usuário marcos@insightfy.com.br...\n');

    const { error: updateError } = await supabase
      .from('meta_business_connections')
      .update({ user_id: targetUserId })
      .eq('user_id', currentUserId)
      .eq('is_active', true);

    if (updateError) {
      console.error('Erro ao migrar conexão:', updateError);
      return;
    }

    console.log('✅ Conexão Meta migrada com sucesso!\n');

    // 3. Verificar se há contas antigas que precisam ser removidas
    const { data: oldAccounts } = await supabase
      .from('ad_accounts')
      .select('*');

    if (oldAccounts && oldAccounts.length > 0) {
      console.log(`\nRemovendo ${oldAccounts.length} contas antigas...\n`);

      await supabase
        .from('ad_accounts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('✅ Contas antigas removidas!\n');
    }

    console.log('\n=== MIGRAÇÃO COMPLETA ===\n');
    console.log('✅ Tudo pronto! Agora você pode:');
    console.log('\n1. Fazer login com: marcos@insightfy.com.br');
    console.log('2. Acessar /meta-ads-config');
    console.log('3. Clicar em "Conectar Contas"');
    console.log('4. Selecionar as 3 contas disponíveis:');
    console.log('   - Marcos de Souza (199415206844304)');
    console.log('   - CA - SITE RAPIDO (1558732224693082)');
    console.log('   - Smartcell (1398847601234023)');
    console.log('\n5. As contas serão vinculadas à organização correta');
    console.log('6. Sincronizar os dados via função "sync-daily-insights"');
    console.log('7. Os dados aparecerão no dashboard!\n');

  } else {
    console.log('❌ Erro: Nenhum membership encontrado para o usuário!');
  }
}

fixAndMigrate().catch(console.error);
