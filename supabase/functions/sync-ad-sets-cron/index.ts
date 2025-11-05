import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  try {
    const startTime = Date.now()
    console.log('🔄 Iniciando sincronização automática de Ad Sets...')
    
    // Registrar início da execução
    const { data: logEntry } = await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'sync_ad_sets_cron',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    // Buscar organizações com contas Meta conectadas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        meta_ad_accounts (
          id,
          account_id,
          access_token
        ),
        organization_sync_config!inner (
          ad_set_history_days,
          auto_sync_enabled
        )
      `)
      .not('meta_ad_accounts.account_id', 'is', null)
      .eq('organization_sync_config.auto_sync_enabled', true)

    if (orgError) {
      console.error('❌ Erro ao buscar organizações:', orgError)
      return new Response(JSON.stringify({ error: orgError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!organizations || organizations.length === 0) {
      console.log('ℹ️ Nenhuma organização com sincronização automática habilitada encontrada')
      return new Response(JSON.stringify({ message: 'Nenhuma organização para sincronizar' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`📊 Encontradas ${organizations.length} organizações para sincronização`)
    
    const results = []
    
    for (const org of organizations) {
      try {
        if (!org.meta_ad_accounts || org.meta_ad_accounts.length === 0) {
          console.log(`⚠️ Organização ${org.name} não tem contas Meta conectadas`)
          continue
        }

        const account = org.meta_ad_accounts[0]
        const historyDays = org.organization_sync_config?.[0]?.ad_set_history_days || 7
        
        // Calcular intervalo de datas baseado no histórico do plano
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - historyDays)
        
        const dateRange = {
          since: startDate.toISOString().split('T')[0],
          until: endDate.toISOString().split('T')[0]
        }

        console.log(`🔄 Sincronizando Ad Sets da organização ${org.name} (${org.id})`)
        console.log(`📅 Intervalo: ${dateRange.since} até ${dateRange.until}`)
        
        // Chamar a função de sincronização de Ad Sets
        const syncResponse = await supabase.functions.invoke('sync-ad-sets', {
          body: {
            organization_id: org.id,
            account_id: account.account_id,
            date_range: dateRange
          }
        })

        if (syncResponse.error) {
          console.error(`❌ Erro ao sincronizar Ad Sets para ${org.name}:`, syncResponse.error)
          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: false,
            error: syncResponse.error.message
          })
        } else {
          console.log(`✅ Ad Sets sincronizados com sucesso para ${org.name}`)
          
          // Atualizar timestamp da última sincronização
          await supabase
            .from('organization_sync_config')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('organization_id', org.id)
          
          results.push({
            organization_id: org.id,
            organization_name: org.name,
            success: true,
            data: syncResponse.data
          })
        }
        
        // Pequeno delay entre organizações para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Erro ao processar organização ${org.name}:`, error)
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          success: false,
          error: error.message
        })
      }
    }

    const summary = {
      total_organizations: organizations.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }

    console.log('✅ Sincronização automática de Ad Sets concluída')
    console.log(`📊 Resumo: ${summary.successful} sucessos, ${summary.failed} falhas`)
    
    // Atualizar log de execução
    if (logEntry?.id) {
      await supabase
        .from('cron_job_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          output: JSON.stringify(summary)
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro geral na sincronização automática:', error)
    
    // Atualizar log de execução com erro
    if (logEntry?.id) {
      await supabase
        .from('cron_job_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', logEntry.id)
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})