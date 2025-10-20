#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function check() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const startStr = start.toISOString().split('T')[0]

  console.log('📅 Verificando dados do mês atual:', start.toLocaleDateString('pt-BR'))
  console.log('   Período:', startStr, 'até hoje\n')

  const { data, error } = await supabase
    .from('campaign_daily_insights')
    .select('*')
    .gte('date', startStr)

  if (error) {
    console.error('❌ Erro ao buscar dados:', error)
    return
  }
  console.log('📊 Dados encontrados no mês atual:')
  console.log('   Total de registros:', data?.length || 0)

  if (data && data.length > 0) {
    const totals = data.reduce((acc, row) => ({
      spend: acc.spend + (row.spend || 0),
      leads: acc.leads + (row.leads_count || 0),
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
    }), { spend: 0, leads: 0, impressions: 0, clicks: 0 })

    const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

    console.log('   Investimento Total: R$', totals.spend.toFixed(2))
    console.log('   Leads Gerados:', totals.leads)
    console.log('   CPL Médio: R$', cpl.toFixed(2))
    console.log('   Impressões:', totals.impressions)
    console.log('   Cliques:', totals.clicks)
    console.log('   CTR:', ctr.toFixed(2) + '%')
  } else {
    console.log('   ⚠️  Nenhum dado encontrado para o mês atual!')
    console.log('   Execute: npx tsx scripts/seed-meta-data.ts')
  }

  // Verificar todos os dados
  const { data: allData } = await supabase
    .from('campaign_daily_insights')
    .select('date')
    .order('date', { ascending: false })
    .limit(10)

  console.log('\n📅 Últimas 10 datas com dados:')
  allData?.forEach(row => console.log('   -', row.date))
}

check().catch(console.error)
