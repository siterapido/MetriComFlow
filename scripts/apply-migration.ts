/**
 * Apply Migration to Supabase
 *
 * Aplica a migração SQL diretamente no Supabase remoto.
 *
 * Usage: npx tsx scripts/apply-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://kyysmixnhdqrxynxjbwk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eXNtaXhuaGRxcnh5bnhqYndrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc4NTg0MywiZXhwIjoyMDc5MzYxODQzfQ.ZKJM6aLlE9ROjPBmKTxYq32J81Wl_MqPQPNyKuDLaSk';

async function applyMigration() {
  console.log('🚀 Aplicando migração Meta Ads...\n');

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ler arquivo de migração
    const migrationPath = join(process.cwd(), 'supabase/migrations/004_meta_ads_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Lendo migração:', migrationPath);
    console.log('');

    // Dividir em comandos individuais e executar
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Executando ${commands.length} comando(s) SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';';

      // Pular comentários
      if (command.trim().startsWith('--')) continue;

      console.log(`[${i + 1}/${commands.length}] Executando...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: command });

      if (error) {
        // Ignorar erros de "já existe"
        if (
          error.message.includes('already exists') ||
          error.message.includes('já existe') ||
          error.message.includes('duplicate')
        ) {
          console.log(`   ⚠️  Item já existe, continuando...`);
        } else {
          console.error(`   ❌ Erro:`, error.message);
          // Não vamos parar por erros, vamos continuar
        }
      } else {
        console.log(`   ✅ Sucesso`);
      }
    }

    console.log('\n✨ Migração concluída!\n');

    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...\n');

    const { data: metaConnections, error: metaError } = await supabase
      .from('meta_business_connections')
      .select('count');

    if (metaError) {
      console.log('❌ Tabela meta_business_connections:', metaError.message);
    } else {
      console.log('✅ Tabela meta_business_connections criada');
    }

    const { data: adAccounts, error: adError } = await supabase
      .from('ad_accounts')
      .select('count');

    if (adError) {
      console.log('❌ Tabela ad_accounts:', adError.message);
    } else {
      console.log('✅ Tabela ad_accounts criada');
    }

    console.log('\n🎉 Pronto! Agora você pode executar:');
    console.log('   npx tsx scripts/test-meta-token.ts marckexpert1@gmail.com');

  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

applyMigration();
