#!/usr/bin/env tsx
/**
 * Script para popular dados de teste do Meta Ads
 * Executa via: npx tsx scripts/seed-meta-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) devem estar definidas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🚀 Iniciando seed de dados do Meta Ads...\n')

  // 1. Verificar se já existem dados
  const { data: existingAccounts } = await supabase
    .from('ad_accounts')
    .select('id')
    .limit(1)

  if (existingAccounts && existingAccounts.length > 0) {
    console.log('✅ Dados já existem. Pulando seed.')
    console.log('   Para recriar os dados, delete manualmente via Supabase Dashboard.\n')

    // Mostrar estatísticas
    const { count: accountCount } = await supabase
      .from('ad_accounts')
      .select('*', { count: 'exact', head: true })

    const { count: campaignCount } = await supabase
      .from('ad_campaigns')
      .select('*', { count: 'exact', head: true })

    const { count: insightCount } = await supabase
      .from('campaign_daily_insights')
      .select('*', { count: 'exact', head: true })

    console.log('📊 Estatísticas atuais:')
    console.log(`   - Contas de Anúncios: ${accountCount}`)
    console.log(`   - Campanhas: ${campaignCount}`)
    console.log(`   - Insights Diários: ${insightCount}\n`)

    return
  }

  // 2. Buscar primeiro usuário para associar a conta
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (!profiles || profiles.length === 0) {
    console.error('❌ Erro: Nenhum perfil de usuário encontrado. Crie um usuário primeiro.')
    process.exit(1)
  }

  const userId = profiles[0].id

  // 3. Criar conta de anúncios de teste
  console.log('📝 Criando conta de anúncios de teste...')
  const { data: account, error: accountError } = await supabase
    .from('ad_accounts')
    .insert({
      external_id: 'act_123456789_test',
      business_name: 'Conta de Teste - MetriCom Flow',
      provider: 'meta',
      is_active: true,
      connected_by: userId,
    })
    .select()
    .single()

  if (accountError) {
    console.error('❌ Erro ao criar conta:', accountError)
    process.exit(1)
  }

  console.log(`✅ Conta criada: ${account.business_name} (ID: ${account.id})`)

  // 4. Criar campanhas de teste
  console.log('\n📝 Criando campanhas de teste...')
  const campaigns = []

  for (let i = 1; i <= 3; i++) {
    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaigns')
      .insert({
        external_id: `camp_test_${i}_${Date.now()}`,
        name: `Campanha ${i} - Geração de Leads`,
        objective: 'LEAD_GENERATION',
        status: i % 3 === 0 ? 'PAUSED' : 'ACTIVE',
        ad_account_id: account.id,
        start_time: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (campaignError) {
      console.error(`❌ Erro ao criar campanha ${i}:`, campaignError)
      continue
    }

    campaigns.push(campaign)
    console.log(`✅ Campanha criada: ${campaign.name}`)
  }

  // 5. Criar insights diários (últimos 90 dias)
  console.log('\n📝 Criando insights diários (últimos 90 dias)...')
  const insights = []
  const today = new Date()

  for (let dayOffset = 90; dayOffset > 0; dayOffset--) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)
    const dateStr = date.toISOString().split('T')[0]

    // Para cada campanha, criar insights daquele dia
    for (const campaign of campaigns) {
      const spend = 50 + Math.random() * 450 // R$ 50 a R$ 500
      const impressions = Math.floor(1000 + Math.random() * 9000) // 1k a 10k
      const clicks = Math.floor(20 + Math.random() * 180) // 20 a 200
      const leads = Math.floor(Math.random() * 20) // 0 a 20

      insights.push({
        campaign_id: campaign.id,
        date: dateStr,
        spend: Number(spend.toFixed(2)),
        impressions,
        clicks,
        leads_count: leads,
      })
    }
  }

  // Inserir em lotes de 100
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < insights.length; i += batchSize) {
    const batch = insights.slice(i, i + batchSize)
    const { error: insightError } = await supabase
      .from('campaign_daily_insights')
      .insert(batch)

    if (insightError) {
      console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, insightError)
      continue
    }

    inserted += batch.length
    process.stdout.write(`\r   Inseridos: ${inserted}/${insights.length} registros`)
  }

  console.log('\n✅ Insights diários criados com sucesso!')

  // 6. Mostrar estatísticas finais
  console.log('\n📊 Dados criados com sucesso:')
  console.log(`   - 1 Conta de Anúncios`)
  console.log(`   - ${campaigns.length} Campanhas`)
  console.log(`   - ${inserted} Insights Diários (90 dias x ${campaigns.length} campanhas)`)

  // 7. Calcular métricas agregadas
  const { data: aggregated } = await supabase
    .from('campaign_daily_insights')
    .select('spend, leads_count, impressions, clicks')

  if (aggregated) {
    const totals = aggregated.reduce(
      (acc, row) => ({
        spend: acc.spend + (row.spend || 0),
        leads: acc.leads + (row.leads_count || 0),
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
      }),
      { spend: 0, leads: 0, impressions: 0, clicks: 0 }
    )

    const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

    console.log('\n📈 Métricas Agregadas (90 dias):')
    console.log(`   - Investimento Total: R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`   - Leads Gerados: ${totals.leads}`)
    console.log(`   - CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`   - Impressões: ${totals.impressions.toLocaleString('pt-BR')}`)
    console.log(`   - Cliques: ${totals.clicks.toLocaleString('pt-BR')}`)
    console.log(`   - CTR: ${ctr.toFixed(2)}%`)
  }

  console.log('\n🎉 Seed concluído! Acesse a dashboard para visualizar os dados.')
}

main().catch(console.error)
