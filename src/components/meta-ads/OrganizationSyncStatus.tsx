import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Database, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface OrganizationSyncConfig {
  id: string
  name: string
  plan_type: string
  organization_sync_config: {
    auto_sync_enabled: boolean
    campaign_history_days: number
    ad_set_history_days: number
    ad_history_days: number
    meta_account_connected: boolean
    last_sync_at: string | null
  }[]
  meta_ad_accounts: {
    account_id: string
  }[]
}

export function OrganizationSyncStatus() {
  const { data: organizations, isLoading, refetch } = useQuery({
    queryKey: ['organization-sync-status'],
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
      return data as OrganizationSyncConfig[]
    },
    staleTime: 30000,
  })

  const handleRefresh = () => {
    refetch()
  }

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Há poucos minutos'
    if (diffHours < 24) return `Há ${diffHours}h`
    return date.toLocaleDateString('pt-BR')
  }

  const getSyncStatus = (lastSync: string | null) => {
    if (!lastSync) return { status: 'Nunca', color: 'destructive' }
    
    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 2) return { status: 'Atualizado', color: 'default' }
    if (diffHours < 6) return { status: 'Atrasado', color: 'warning' }
    return { status: 'Desatualizado', color: 'destructive' }
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Status das Organizações
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Monitoramento de sincronização por organização
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Status das Organizações
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Monitoramento de sincronização por organização
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

      <CardContent>
        {!organizations || organizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma organização com sincronização automática encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => {
              const config = org.organization_sync_config[0]
              const syncStatus = getSyncStatus(config.last_sync_at)
              
              return (
                <div key={org.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{org.name}</h4>
                      <p className="text-sm text-muted-foreground">Plano {org.plan_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.meta_account_connected ? "default" : "destructive"}>
                        {config.meta_account_connected ? "Meta Conectada" : "Meta Desconectada"}
                      </Badge>
                      <Badge variant={syncStatus.color as any}>
                        {syncStatus.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Campanhas</div>
                      <div className="font-medium">{config.campaign_history_days} dias</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Conjuntos</div>
                      <div className="font-medium">{config.ad_set_history_days} dias</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Anúncios</div>
                      <div className="font-medium">{config.ad_history_days} dias</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Última Sinc.</div>
                      <div className="font-medium">{formatLastSync(config.last_sync_at)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {config.meta_account_connected 
                        ? `Conta Meta conectada: ${org.meta_ad_accounts[0]?.account_id}`
                        : 'Conta Meta não conectada'
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}