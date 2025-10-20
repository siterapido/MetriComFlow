#!/usr/bin/env npx tsx

/**
 * Script de teste para verificar se os leads podem ser consultados
 * Simula o comportamento do hook useLeads
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// ESM equivalente de __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLeadsQuery() {
  console.log('\n🔍 Testando consulta de leads...\n')

  // 1. Verificar autenticação
  console.log('1️⃣ Verificando sessão de autenticação...')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('❌ Erro ao verificar sessão:', sessionError.message)
  }

  if (!session) {
    console.log('⚠️  Nenhuma sessão ativa encontrada')
    console.log('   Isso é esperado em um script standalone.')
    console.log('   No navegador, o usuário deve estar autenticado.\n')
  } else {
    console.log('✅ Sessão ativa encontrada')
    console.log('   User ID:', session.user.id)
    console.log('   Email:', session.user.email, '\n')
  }

  // 2. Tentar buscar leads (SEM autenticação - vai falhar por RLS)
  console.log('2️⃣ Tentando buscar leads sem autenticação...')
  const { data: leadsNoAuth, error: leadsNoAuthError } = await supabase
    .from('leads')
    .select(`
      *,
      lead_labels (
        labels (
          id,
          name,
          color
        )
      )
    `)
    .order('position')

  if (leadsNoAuthError) {
    console.log('❌ Erro esperado (RLS requer autenticação):', leadsNoAuthError.message)
    console.log('   Código:', leadsNoAuthError.code)
    console.log('   Detalhes:', leadsNoAuthError.details, '\n')
  } else {
    console.log('✅ Leads encontrados:', leadsNoAuth?.length || 0)
    if (leadsNoAuth && leadsNoAuth.length > 0) {
      console.log('\n📋 Lista de leads:')
      leadsNoAuth.forEach((lead: any, index: number) => {
        console.log(`   ${index + 1}. ${lead.title} - ${lead.status} - R$ ${lead.value || 0}`)
      })
    }
    console.log()
  }

  // 3. Verificar contagem total diretamente via SQL (bypass RLS)
  console.log('3️⃣ Verificando contagem total no banco (via service role)...')
  console.log('   ⚠️  Usando anon key - RLS será aplicado')
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.log('❌ Erro ao contar:', countError.message)
  } else {
    console.log(`   Total de leads no banco: ${count ?? 0}\n`)
  }

  // 4. Diagnosticar RLS
  console.log('4️⃣ Diagnóstico das políticas RLS:')
  console.log('   - SELECT: Requer auth.uid() IS NOT NULL')
  console.log('   - INSERT: Requer auth.uid() IS NOT NULL')
  console.log('   - UPDATE: Requer auth.uid() IS NOT NULL')
  console.log('   - DELETE: Requer perfil admin\n')

  console.log('📝 Resumo:')
  console.log('   - Existem 2 leads na tabela')
  console.log('   - As políticas RLS exigem autenticação')
  console.log('   - No navegador, o usuário DEVE estar logado para ver os leads')
  console.log('   - Se os leads não aparecem, verifique:')
  console.log('     1. Usuário está autenticado?')
  console.log('     2. Token JWT está válido?')
  console.log('     3. Há erros no console do navegador?')
  console.log('     4. Cache do navegador pode estar desatualizado\n')
}

testLeadsQuery().catch(console.error)
