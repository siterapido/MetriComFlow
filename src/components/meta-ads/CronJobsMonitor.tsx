import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  AlertCircle,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  useCronJobLogs,
  useCronJobSummary,
  useInvokeCronJob,
  formatDuration,
  formatRelativeTime,
  getStatusColor,
  getStatusIcon,
  getJobDisplayName,
  getJobDescription,
  type CronJobLog,
  type CronJobSummary,
} from '@/hooks/useCronJobs'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function CronJobsMonitor() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useCronJobSummary()
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useCronJobLogs(50)
  const invokeCronJob = useInvokeCronJob()

  const handleManualInvoke = async (functionName: 'sync-daily-insights' | 'meta-conversion-dispatch') => {
    try {
      await invokeCronJob.mutateAsync(functionName)
      toast({
        title: '✅ Job executado',
        description: `${getJobDisplayName(functionName)} foi executado manualmente com sucesso.`,
      })
      setTimeout(() => {
        refetchLogs()
        refetchSummary()
      }, 2000)
    } catch (error: any) {
      toast({
        title: '❌ Erro ao executar job',
        description: error.message || 'Ocorreu um erro ao executar o job manualmente.',
        variant: 'destructive',
      })
    }
  }

  const filteredLogs = selectedJob
    ? logs?.filter((log) => log.job_name === selectedJob)
    : logs

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Monitoramento de Jobs Automáticos
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Status e histórico de execução dos cron jobs
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLogs()
              refetchSummary()
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="logs">Logs Recentes</TabsTrigger>
            <TabsTrigger value="manual">Executar Manualmente</TabsTrigger>
          </TabsList>

          {/* Tab 1: Resumo */}
          <TabsContent value="summary" className="space-y-4">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !summary || summary.length === 0 ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Nenhum cron job executado nas últimas 24 horas.
                  Verifique se os cron jobs estão configurados corretamente.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {summary.map((job) => (
                  <JobSummaryCard key={job.job_name} job={job} onSelect={setSelectedJob} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Logs Recentes */}
          <TabsContent value="logs" className="space-y-4">
            {/* Filtro por job */}
            {summary && summary.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Filtrar por job:</span>
                <Button
                  variant={selectedJob === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedJob(null)}
                >
                  Todos
                </Button>
                {summary.map((job) => (
                  <Button
                    key={job.job_name}
                    variant={selectedJob === job.job_name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedJob(job.job_name)}
                  >
                    {getJobDisplayName(job.job_name)}
                  </Button>
                ))}
              </div>
            )}

            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !filteredLogs || filteredLogs.length === 0 ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Nenhum log encontrado.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Iniciado</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Resposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Executar Manualmente */}
          <TabsContent value="manual" className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Execute jobs manualmente para testar ou forçar sincronização imediata.
                Os jobs continuarão executando automaticamente no horário agendado.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <ManualJobCard
                title="Sincronização de Métricas"
                description="Busca métricas do Meta Ads dos últimos 7 dias"
                schedule="Automático: a cada 3 horas"
                functionName="sync-daily-insights"
                onInvoke={handleManualInvoke}
                isLoading={invokeCronJob.isPending}
              />
              <ManualJobCard
                title="Dispatch de Conversões"
                description="Envia eventos de conversão pendentes para Meta CAPI"
                schedule="Automático: a cada 5 minutos"
                functionName="meta-conversion-dispatch"
                onInvoke={handleManualInvoke}
                isLoading={invokeCronJob.isPending}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

interface JobSummaryCardProps {
  job: CronJobSummary
  onSelect: (jobName: string) => void
}

function JobSummaryCard({ job, onSelect }: JobSummaryCardProps) {
  const successRate = job.total_runs > 0
    ? ((job.successful_runs / job.total_runs) * 100).toFixed(1)
    : '0'

  const isHealthy = parseFloat(successRate) >= 90

  return (
    <Card
      className="border-border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onSelect(job.job_name)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{getJobDisplayName(job.job_name)}</span>
          <Badge variant={isHealthy ? 'default' : 'destructive'} className="text-xs">
            {successRate}%
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {getJobDescription(job.job_name)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Última execução */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Última execução:</span>
          <div className="flex items-center gap-2">
            <span className={getStatusColor(job.last_status)}>
              {getStatusIcon(job.last_status)}
            </span>
            <span className="text-foreground">
              {formatRelativeTime(job.last_run_at)}
            </span>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-bold text-foreground">{job.total_runs}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {job.successful_runs}
            </div>
            <div className="text-xs text-muted-foreground">Sucesso</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {job.failed_runs}
            </div>
            <div className="text-xs text-muted-foreground">Erro</div>
          </div>
        </div>

        {/* Duração média */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Duração média:</span>
          <span className="text-foreground font-medium">
            {formatDuration(job.avg_duration_ms)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface LogRowProps {
  log: CronJobLog
}

function LogRow({ log }: LogRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Badge
          variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {log.status === 'success' ? (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          ) : log.status === 'error' ? (
            <XCircle className="w-3 h-3 mr-1" />
          ) : (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          )}
          {log.status}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        {getJobDisplayName(log.job_name)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatRelativeTime(log.started_at)}
      </TableCell>
      <TableCell className="text-sm">
        {formatDuration(log.duration_ms)}
      </TableCell>
      <TableCell className="text-sm">
        {log.response_status ? (
          <Badge variant={log.response_status >= 200 && log.response_status < 300 ? 'default' : 'destructive'}>
            {log.response_status}
          </Badge>
        ) : log.error_message ? (
          <span className="text-red-600 dark:text-red-400 text-xs" title={log.error_message}>
            {log.error_message.slice(0, 30)}...
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  )
}

interface ManualJobCardProps {
  title: string
  description: string
  schedule: string
  functionName: 'sync-daily-insights' | 'meta-conversion-dispatch'
  onInvoke: (functionName: 'sync-daily-insights' | 'meta-conversion-dispatch') => Promise<void>
  isLoading: boolean
}

function ManualJobCard({ title, description, schedule, functionName, onInvoke, isLoading }: ManualJobCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs space-y-1">
          <div>{description}</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3" />
            {schedule}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => onInvoke(functionName)}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Executar Agora
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
