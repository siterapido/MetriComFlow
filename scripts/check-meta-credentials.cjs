#!/usr/bin/env node

/**
 * Script para verificar credenciais Meta em diferentes ambientes
 */

const dotenv = require('dotenv');
dotenv.config();

console.log('\n🔍 ANÁLISE DE CREDENCIAIS META BUSINESS\n');
console.log('='.repeat(70));

// .env local
console.log('\n📁 ARQUIVO .env (Desenvolvimento):');
console.log(`   App ID: ${process.env.VITE_META_APP_ID || 'NÃO DEFINIDO'}`);
console.log(`   App Secret: ${process.env.VITE_META_APP_SECRET ? '✅ Definido (oculto)' : '❌ NÃO DEFINIDO'}`);
console.log(`   Redirect URI: ${process.env.VITE_META_REDIRECT_URI || 'NÃO DEFINIDO'}`);
console.log(`   App URL: ${process.env.VITE_APP_URL || 'NÃO DEFINIDO'}`);

console.log('\n📄 DOCUMENTAÇÃO (CONFIGURACAO_PRODUCAO_META_BUSINESS.md):');
console.log('   App ID: 336112808735379');
console.log('   App Secret: ✅ Definido (oculto)');
console.log('   Redirect URI: https://metri-com-flow.vercel.app/meta-ads-config');
console.log('   App URL: https://metri-com-flow.vercel.app/');

console.log('\n🔍 VERIFICAÇÃO DE DOCS:');
console.log('   docs/META_VERIFICATION_GUIDE.md menciona: 336125808735379');

console.log('\n⚠️  INCONSISTÊNCIAS DETECTADAS:');
const envAppId = process.env.VITE_META_APP_ID;
const docAppId = '336112808735379';
const guideAppId = '336125808735379';

if (envAppId === docAppId) {
  console.log('   ✅ .env corresponde à CONFIGURACAO_PRODUCAO');
} else if (envAppId === guideAppId) {
  console.log('   ⚠️  .env corresponde ao VERIFICATION_GUIDE (não ao CONFIGURACAO_PRODUCAO)');
} else {
  console.log(`   ❌ .env tem valor diferente: ${envAppId}`);
}

console.log('\n📋 PRÓXIMAS AÇÕES RECOMENDADAS:');
console.log('   1. Acessar Meta for Developers: https://developers.facebook.com/apps/');
console.log('   2. Verificar qual App ID é o CORRETO e está ATIVO');
console.log('   3. Atualizar TODAS as configurações com o App ID correto:');
console.log('      - Arquivo .env (desenvolvimento)');
console.log('      - Supabase Secrets (supabase secrets set)');
console.log('      - Vercel Environment Variables');
console.log('   4. Testar a integração');

console.log('\n💡 COMANDO PARA ATUALIZAR SUPABASE SECRETS:');
console.log('   npx supabase secrets set META_APP_ID="[APP_ID_CORRETO]"');
console.log('   npx supabase secrets set META_APP_SECRET="[APP_SECRET_CORRETO]"');

console.log('\n' + '='.repeat(70));
console.log('\n');
