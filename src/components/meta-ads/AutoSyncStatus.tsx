import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertCircle, Activity, Clock, Database } from 'lucide-react'
import {
  useCronJobLogs,
  useCronJobSummary,
  getStatusColor,
  getStatusIcon,
  getJobDisplayName,
  getJobDescription,
  type CronJobLog,
  type CronJobSummary,
} from '@/hooks/useCronJobs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Jobs de sincronização automática
const AUTO_SYNC_JOBS = [
  'sync_ad_sets_cron',
  'sync_ads_cron', 
  'sync_adset_insights_cron',
  'sync_ad_insights_cron',
]

export function AutoSyncStatus() {
  // Buscar organizações com sincronização automática
  const { data: syncConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['organization-sync-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          plan_type,
          meta_ad_accounts!inner(account_id),
          organization_sync_config!inner(
            auto_sync_enabled,
            campaign_history_days,
            ad_set_history_days,
            ad_history_days,
            meta_account_connected,
            last_sync_at
          )
        `)
        .eq('organization_sync_config.auto_sync_enabled', true)
        .not('meta_ad_accounts.account_id', 'is', null)

      if (error) throw error
      return data
    },
    staleTime: 30000,
  })

  // Buscar logs e resumo de sincronização automática
  const { data: allLogs, isLoading: logsLoading, refetch: refetchLogs } = useCronJobLogs(50)
  const { data: allSummary, isLoading: summaryLoading, refetch: refetchSummary } = useCronJobSummary()
  
  const autoSyncLogs = allLogs?.filter(log => AUTO_SYNC_JOBS.includes(log.job_name))
  const autoSyncSummary = allSummary?.filter(job => AUTO_SYNC_JOBS.includes(job.job_name))

  const handleRefresh = () => {
    refetchLogs()
    refetchSummary()
  }

  // Calcular estatísticas gerais
  const totalRuns = autoSyncSummary?.reduce((acc, job) => acc + job.total_runs, 0) || 0
  const totalSuccessful = autoSyncSummary?.reduce((acc, job) => acc + job.successful_runs, 0) || 0
  const overallSuccessRate = totalRuns > 0 ? (totalSuccessful / totalRuns) * 100 : 0

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Sincronização Automática
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Monitoramento de sincronização de Ad Sets, Ads e Insights
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                Taxa de Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryLoading ? '...' : `${overallSuccessRate.toFixed(0)}%`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Total de Execuções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summaryLoading ? '...' : totalRuns}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                Organizações Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {configsLoading ? '...' : (syncConfigs?.length || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status dos Jobs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Status por Tipo de Sincronização</h3>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !autoSyncSummary || autoSyncSummary.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Nenhuma sincronização automática executada recentemente.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {autoSyncSummary.map((job) => (
                <AutoSyncJobCard key={job.job_name} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* Logs Recentes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Últimas Execuções</h3>

          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !autoSyncLogs || autoSyncLogs.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Nenhum log de sincronização encontrado.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {autoSyncLogs.slice(0, 10).map((log) => (
                <AutoSyncLogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Componente auxiliar para card de job
interface AutoSyncJobCardProps {
  job: CronJobSummary
}

function AutoSyncJobCard({ job }: AutoSyncJobCardProps) {
  const successRate = job.total_runs > 0
    ? ((job.successful_runs / job.total_runs) * 100).toFixed(0)
    : '0'

  const isHealthy = parseFloat(successRate) >= 90

  return (
    <Card className="border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{getJobDisplayName(job.job_name)}</span>
          <Badge 
            variant={isHealthy ? 'default' : 'destructive'} 
            className="text-xs"
          >
            {successRate}%
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {getJobDescription(job.job_name)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Última:</span>
          <div className="flex items-center gap-1">
            <span className={getStatusColor(job.last_status)}>
              {getStatusIcon(job.last_status)}
            </span>
            <span className="text-xs">
              {new Date(job.last_run_at).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div className="bg-muted/30 rounded p-1">
            <div className="font-bold">{job.total_runs}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="bg-green-500/10 rounded p-1">
            <div className="font-bold text-green-600">{job.successful_runs}</div>
            <div className="text-muted-foreground">OK</div>
          </div>
          <div className="bg-red-500/10 rounded p-1">
            <div className="font-bold text-red-600">{job.failed_runs}</div>
            <div className="text-muted-foreground">Erro</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente auxiliar para linha de log
interface AutoSyncLogRowProps {
  log: CronJobLog
}

function AutoSyncLogRow({ log }: AutoSyncLogRowProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <span className={getStatusColor(log.status)}>
          {getStatusIcon(log.job_name)}
        </span>
        <div>
          <div className="font-medium text-sm">{getJobDisplayName(log.job_name)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(log.started_at)} • {log.duration_ms}ms
          </div>
        </div>
      </div>
      
      <Badge 
        variant={log.status === 'success' ? 'default' : 'destructive'}
        className="text-xs"
      >
        {log.status === 'success' ? 'Sucesso' : 'Erro'}
      </Badge>
    </div>
  )
}