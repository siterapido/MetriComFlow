import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface CronJobLog {
  id: string
  job_name: string
  status: 'success' | 'error' | 'running'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  response_status: number | null
  response_body: string | null
  error_message: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface CronJobSummary {
  job_name: string
  total_runs: number
  successful_runs: number
  failed_runs: number
  avg_duration_ms: number
  last_run_at: string
  last_status: 'success' | 'error' | 'running'
}

export interface CronJobInfo {
  jobid: number
  jobname: string
  schedule: string
  active: boolean
  database: string
  username: string
  command: string
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar logs de execução dos cron jobs
 * @param limit - Número máximo de logs a retornar (padrão: 50)
 */
export function useCronJobLogs(limit = 50) {
  return useQuery({
    queryKey: ['cron-job-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as CronJobLog[]
    },
    staleTime: 10000, // 10 segundos
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })
}

/**
 * Hook para buscar resumo dos cron jobs (últimas 24 horas)
 */
export function useCronJobSummary() {
  return useQuery({
    queryKey: ['cron-job-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_cron_job_summary')

      if (error) throw error
      return data as CronJobSummary[]
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  })
}

/**
 * Hook para buscar logs de um job específico
 * @param jobName - Nome do cron job
 * @param limit - Número máximo de logs (padrão: 20)
 */
export function useCronJobLogsByName(jobName: string, limit = 20) {
  return useQuery({
    queryKey: ['cron-job-logs', jobName, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', jobName)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as CronJobLog[]
    },
    staleTime: 10000,
    enabled: !!jobName,
  })
}

/**
 * Hook para invocar manualmente um cron job
 */
export function useInvokeCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (functionName: 'sync-daily-insights' | 'meta-conversion-dispatch') => {
      let payload: Record<string, any> = {}

      if (functionName === 'sync-daily-insights') {
        // Sincronizar últimos 7 dias
        const since = new Date()
        since.setDate(since.getDate() - 7)
        const until = new Date()

        payload = {
          since: since.toISOString().split('T')[0],
          until: until.toISOString().split('T')[0],
          maxDaysPerChunk: 30,
        }
      } else if (functionName === 'meta-conversion-dispatch') {
        payload = {
          process_all: true,
          max_batch_size: 100,
        }
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['cron-job-logs'] })
      queryClient.invalidateQueries({ queryKey: ['cron-job-summary'] })
    },
  })
}

/**
 * Hook para buscar estatísticas de um job específico
 * @param jobName - Nome do cron job
 * @param hours - Número de horas para calcular estatísticas (padrão: 24)
 */
export function useCronJobStats(jobName: string, hours = 24) {
  return useQuery({
    queryKey: ['cron-job-stats', jobName, hours],
    queryFn: async () => {
      const since = new Date()
      since.setHours(since.getHours() - hours)

      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', jobName)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false })

      if (error) throw error

      const logs = data as CronJobLog[]

      // Calcular estatísticas
      const total = logs.length
      const successful = logs.filter((l) => l.status === 'success').length
      const failed = logs.filter((l) => l.status === 'error').length
      const running = logs.filter((l) => l.status === 'running').length

      const durations = logs
        .filter((l) => l.duration_ms !== null)
        .map((l) => l.duration_ms!)

      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0

      const minDuration = durations.length > 0 ? Math.min(...durations) : 0
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0

      const lastRun = logs.length > 0 ? logs[0] : null
      const successRate = total > 0 ? (successful / total) * 100 : 0

      return {
        total,
        successful,
        failed,
        running,
        avgDuration,
        minDuration,
        maxDuration,
        lastRun,
        successRate,
        logs,
      }
    },
    staleTime: 30000,
    enabled: !!jobName,
  })
}

/**
 * Helper: Formatar duração em ms para string legível
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return 'N/A'

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }

  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }

  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

/**
 * Helper: Formatar timestamp relativo
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'agora mesmo'
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  } else if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  } else {
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
  }
}

/**
 * Helper: Obter cor do status
 */
export function getStatusColor(status: 'success' | 'error' | 'running'): string {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-400'
    case 'error':
      return 'text-red-600 dark:text-red-400'
    case 'running':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

/**
 * Helper: Obter ícone do status
 */
export function getStatusIcon(status: 'success' | 'error' | 'running'): string {
  switch (status) {
    case 'success':
      return '✅'
    case 'error':
      return '❌'
    case 'running':
      return '⏳'
    default:
      return '❓'
  }
}

/**
 * Helper: Obter nome legível do job
 */
export function getJobDisplayName(jobName: string): string {
  const names: Record<string, string> = {
    'sync-daily-insights': 'Sincronização de Métricas',
    'meta-conversion-dispatch': 'Dispatch de Conversões',
    'cleanup-old-cron-logs-daily': 'Limpeza de Logs',
  }

  return names[jobName] || jobName
}

/**
 * Helper: Obter descrição do job
 */
export function getJobDescription(jobName: string): string {
  const descriptions: Record<string, string> = {
    'sync-daily-insights': 'Sincroniza métricas diárias do Meta Ads (últimos 7 dias) a cada 3 horas',
    'meta-conversion-dispatch': 'Processa eventos de conversão pendentes e envia para Meta CAPI a cada 5 minutos',
    'cleanup-old-cron-logs-daily': 'Remove logs de cron jobs com mais de 30 dias (executa às 02:00)',
  }

  return descriptions[jobName] || 'Job automático'
}

/**
 * Helper: Obter schedule legível
 */
export function getScheduleDisplay(schedule: string): string {
  const schedules: Record<string, string> = {
    '0 */3 * * *': 'A cada 3 horas',
    '*/5 * * * *': 'A cada 5 minutos',
    '0 2 * * *': 'Diariamente às 02:00',
  }

  return schedules[schedule] || schedule
}
