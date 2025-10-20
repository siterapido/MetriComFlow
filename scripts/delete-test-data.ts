#!/usr/bin/env tsx
/**
 * Script para deletar dados de teste e preparar para dados reais
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🗑️  Deletando dados de teste...\n')

  // Deletar insights de teste
  const { error: insightsError } = await supabase
    .from('campaign_daily_insights')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Deletar todos

  if (insightsError) {
    console.error('❌ Erro ao deletar insights:', insightsError)
  } else {
    console.log('✅ Insights de teste deletados')
  }

  // Deletar campanhas de teste (apenas as que têm "test" no external_id)
  const { error: campaignsError } = await supabase
    .from('ad_campaigns')
    .delete()
    .like('external_id', '%test%')

  if (campaignsError) {
    console.error('❌ Erro ao deletar campanhas de teste:', campaignsError)
  } else {
    console.log('✅ Campanhas de teste deletadas')
  }

  // Deletar contas de teste
  const { error: accountsError } = await supabase
    .from('ad_accounts')
    .delete()
    .like('external_id', '%test%')

  if (accountsError) {
    console.error('❌ Erro ao deletar contas de teste:', accountsError)
  } else {
    console.log('✅ Contas de teste deletadas')
  }

  console.log('\n✅ Limpeza concluída! Pronto para sincronizar dados reais.')
  console.log('   Próximo passo: Configurar integração com Meta Ads em /meta-ads-config')
}

main().catch(console.error)
