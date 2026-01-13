#!/usr/bin/env node
/**
 * Script para aplicar migração de campos de empresa e endereço à tabela leads
 * Usa o Supabase SDK com service_role para executar DDL
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.local')
    process.exit(1)
}

// Criar cliente Supabase com service_role
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// SQL da migração
const migrationSQL = `
-- Add company information fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS share_capital DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS main_activity TEXT,
ADD COLUMN IF NOT EXISTS product_interest TEXT;

-- Add address fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON public.leads(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_zip_code ON public.leads(zip_code) WHERE zip_code IS NOT NULL;
`

console.log('🚀 Iniciando aplicação da migração...\n')

try {
    // Executar a migração
    const { data, error } = await supabase.rpc('exec', {
        sql: migrationSQL
    })

    if (error) {
        // Se o RPC não existir, tenta executar diretamente via REST API
        console.log('⚠️  Função exec() não encontrada, tentando método alternativo...\n')

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ sql: migrationSQL })
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        console.log('✅ Migração aplicada com sucesso!')
    } else {
        console.log('✅ Migração aplicada com sucesso!')
        if (data) {
            console.log('📊 Resultado:', data)
        }
    }

    console.log('\n📋 Campos adicionados à tabela leads:')
    console.log('  ✓ trade_name         - Nome Fantasia')
    console.log('  ✓ legal_name         - Razão Social')
    console.log('  ✓ cnpj               - CNPJ')
    console.log('  ✓ secondary_phone    - Telefone Secundário')
    console.log('  ✓ size               - Porte da Empresa')
    console.log('  ✓ share_capital      - Capital Social')
    console.log('  ✓ opening_date       - Data de Abertura')
    console.log('  ✓ main_activity      - Atividade Principal')
    console.log('  ✓ product_interest   - Produto/Serviço de Interesse')
    console.log('  ✓ zip_code           - CEP')
    console.log('  ✓ street             - Logradouro')
    console.log('  ✓ address_number     - Número')
    console.log('  ✓ complement         - Complemento')
    console.log('  ✓ neighborhood       - Bairro')
    console.log('  ✓ city               - Cidade')
    console.log('  ✓ state              - Estado (UF)')
    console.log('\n🎉 Agora você pode importar os leads com todos os campos!')

} catch (err) {
    console.error('\n❌ Erro ao aplicar migração:')
    console.error(err)
    console.log('\n📝 SOLUÇÃO ALTERNATIVA:')
    console.log('Execute o SQL manualmente no Supabase Dashboard:')
    console.log(`https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql\n`)
    console.log('SQL a executar:')
    console.log('═'.repeat(80))
    console.log(migrationSQL)
    console.log('═'.repeat(80))
    process.exit(1)
}
