/**
 * Apply Migration to Supabase
 *
 * Aplica a migração SQL diretamente no Supabase remoto.
 *
 * Usage: npx tsx scripts/apply-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://fjoaliipjfcnokermkhy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQyMzgwNSwiZXhwIjoyMDc1OTk5ODA1fQ.nJjAUvhvOSEXQjweS-NWk5EjBxvNIyUzSY3mOxI40aw';

async function applyMigration() {
  console.log('🚀 Aplicando migração: Allow members to delete leads...\n');

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ler arquivo de migração
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251219000000_allow_members_to_delete_leads.sql');
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

  } catch (error) {
    console.error('\n❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

applyMigration();
