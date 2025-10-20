#!/usr/bin/env tsx
/**
 * Script para popular dados de insights do MÊS ATUAL
 * Executa via: npx tsx scripts/seed-current-month.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL e chave devem estar definidas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🚀 Populando dados do mês atual...\n')

  // 1. Buscar campanhas existentes
  const { data: campaigns, error: campaignsError } = await supabase
    .from('ad_campaigns')
    .select('id, name')

  if (campaignsError || !campaigns || campaigns.length === 0) {
    console.error('❌ Erro: Nenhuma campanha encontrada. Execute primeiro: npx tsx scripts/seed-meta-data.ts')
    process.exit(1)
  }

  console.log(`📋 Encontradas ${campaigns.length} campanhas`)

  // 2. Calcular período do mês atual
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date()

  console.log(`📅 Período: ${firstDayOfMonth.toLocaleDateString('pt-BR')} até ${today.toLocaleDateString('pt-BR')}\n`)

  // 3. Verificar se já existem dados no período
  const { data: existing, count: existingCount } = await supabase
    .from('campaign_daily_insights')
    .select('*', { count: 'exact', head: true })
    .gte('date', firstDayOfMonth.toISOString().split('T')[0])

  if (existingCount && existingCount > 0) {
    console.log(`ℹ️  Já existem ${existingCount} registros no mês atual.`)
    console.log('   Deletando para recriar...\n')

    await supabase
      .from('campaign_daily_insights')
      .delete()
      .gte('date', firstDayOfMonth.toISOString().split('T')[0])
  }

  // 4. Criar insights diários
  console.log('📝 Criando insights diários...')
  const insights = []

  // Para cada dia do mês até hoje
  for (let day = 1; day <= today.getDate(); day++) {
    const date = new Date(now.getFullYear(), now.getMonth(), day)
    const dateStr = date.toISOString().split('T')[0]

    // Para cada campanha
    for (const campaign of campaigns) {
      const spend = 100 + Math.random() * 400 // R$ 100 a R$ 500
      const impressions = Math.floor(2000 + Math.random() * 8000) // 2k a 10k
      const clicks = Math.floor(40 + Math.random() * 160) // 40 a 200
      const leads = Math.floor(2 + Math.random() * 18) // 2 a 20

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

  console.log(`   Total de registros a inserir: ${insights.length}`)

  // 5. Inserir em lotes de 100
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

  console.log('\n✅ Dados inseridos com sucesso!')

  // 6. Calcular métricas agregadas do mês
  const { data: aggregated } = await supabase
    .from('campaign_daily_insights')
    .select('spend, leads_count, impressions, clicks')
    .gte('date', firstDayOfMonth.toISOString().split('T')[0])

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
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0

    console.log('\n📈 Métricas do Mês Atual:')
    console.log(`   - Investimento Total: R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`   - Leads Gerados: ${totals.leads}`)
    console.log(`   - CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`   - CPC Médio: R$ ${cpc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`   - Impressões: ${totals.impressions.toLocaleString('pt-BR')}`)
    console.log(`   - Cliques: ${totals.clicks.toLocaleString('pt-BR')}`)
    console.log(`   - CTR: ${ctr.toFixed(2)}%`)
  }

  console.log('\n🎉 Seed do mês atual concluído! Recarregue a dashboard.')
}

main().catch(console.error)
