/**
 * Script para aplicar migração de campos de empresa e endereço à tabela leads
 * Executa a migração através do Supabase
 */

// Carregar a migração SQL
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, 'supabase/migrations/20260113_add_company_address_fields_to_leads.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Migração carregada:');
console.log('═'.repeat(80));
console.log(migrationSQL);
console.log('═'.repeat(80));
console.log('\n✅ INSTRUÇÕES:');
console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/pzmlrdlkcmgejsxakxgb/sql');
console.log('2. Abra o editor SQL');
console.log('3. Cole o comando SQL acima');
console.log('4. Execute o comando');
console.log('\nOu copie diretamente daqui:');
console.log('═'.repeat(80));
console.log(migrationSQL);
console.log('═'.repeat(80));
