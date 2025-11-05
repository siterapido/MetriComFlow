/**
 * Indicador de Status de Sincronização do Meta Ads
 *
 * Mostra:
 * - Última vez que os dados foram sincronizados
 * - Status visual (atualizado, recente, desatualizado, nunca)
 * - Botão para sincronizar manualmente
 */

import { CheckCircle2, AlertCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useActiveOrganization } from '@/hooks/useActiveOrganization';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SyncStatusIndicatorProps {
  accountId?: string;
  onSync?: () => void; // Callback para sincronização manual
  isSyncing?: boolean; // Estado externo de sincronização
  showSyncButton?: boolean; // Mostrar botão de sincronização
  variant?: 'badge' | 'full'; // Badge simples ou indicador completo
}

export const SyncStatusIndicator = ({
  accountId,
  onSync,
  isSyncing = false,
  showSyncButton = true,
  variant = 'full',
}: SyncStatusIndicatorProps) => {
  const { data: org } = useActiveOrganization();

  // Verificar última sincronização
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ['sync-status', accountId, org?.id],
    queryFn: async () => {
      // Buscar a data mais recente de sincronização de métricas
      let query = supabase
        .from('ad_daily_insights')
        .select('created_at, date')
        .order('created_at', { ascending: false })
        .limit(1);

      // Se accountId fornecido, filtrar por conta
      if (accountId) {
        query = query.eq('ad_accounts.id', accountId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return { status: 'never', lastSync: null, lastDataDate: null };
      }

      const lastSync = new Date(data.created_at);
      const lastDataDate = new Date(data.date);
      const now = new Date();

      // Calcular diferença em horas
      const hoursSinceSync = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60));
      const daysSinceData = Math.floor((now.getTime() - lastDataDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determinar status
      let status: 'up-to-date' | 'recent' | 'outdated' | 'never';

      if (hoursSinceSync <= 6) {
        status = 'up-to-date'; // Sincronizado nas últimas 6 horas
      } else if (hoursSinceSync <= 48) {
        status = 'recent'; // Sincronizado nas últimas 48 horas
      } else {
        status = 'outdated'; // Mais de 48 horas
      }

      return {
        status,
        lastSync,
        lastDataDate,
        hoursSinceSync,
        daysSinceData,
      };
    },
    enabled: !!org?.id,
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  // Configurações de status
  const statusConfig = {
    'up-to-date': {
      icon: CheckCircle2,
      text: 'Atualizado',
      color: 'bg-success/20 text-success border-success/30',
      iconColor: 'text-success',
    },
    'recent': {
      icon: Clock,
      text: 'Recente',
      color: 'bg-warning/20 text-warning border-warning/30',
      iconColor: 'text-warning',
    },
    'outdated': {
      icon: AlertCircle,
      text: 'Desatualizado',
      color: 'bg-destructive/20 text-destructive border-destructive/30',
      iconColor: 'text-destructive',
    },
    'never': {
      icon: RefreshCw,
      text: 'Nunca sincronizado',
      color: 'bg-muted text-muted-foreground border-border',
      iconColor: 'text-muted-foreground',
    },
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2 bg-muted text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  const config = statusConfig[syncStatus?.status || 'never'];
  const Icon = isSyncing ? Loader2 : config.icon;

  // Formatação de tempo relativo
  const timeAgo = syncStatus?.lastSync
    ? formatDistanceToNow(syncStatus.lastSync, { addSuffix: true, locale: ptBR })
    : null;

  // Variante badge (apenas status)
  if (variant === 'badge') {
    return (
      <Badge variant="outline" className={`gap-2 ${config.color}`}>
        <Icon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    );
  }

  // Variante completa (com detalhes e botão)
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      {/* Ícone de status */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color.split(' ')[0]}/30`}>
        <Icon className={`w-5 h-5 ${config.iconColor} ${isSyncing ? 'animate-spin' : ''}`} />
      </div>

      {/* Informações */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {isSyncing ? 'Sincronizando...' : config.text}
        </p>
        {timeAgo && !isSyncing && (
          <p className="text-xs text-muted-foreground">
            Última sincronização {timeAgo}
          </p>
        )}
        {syncStatus?.daysSinceData !== undefined && syncStatus.daysSinceData > 2 && (
          <p className="text-xs text-warning">
            ⚠️ Dados até {syncStatus.daysSinceData} dias atrás
          </p>
        )}
      </div>

      {/* Botão de sincronização */}
      {showSyncButton && onSync && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      )}
    </div>
  );
};

/**
 * Badge compacto de status de sincronização (para header)
 */
export const SyncStatusBadge = ({ accountId }: { accountId?: string }) => {
  return (
    <SyncStatusIndicator
      accountId={accountId}
      showSyncButton={false}
      variant="badge"
    />
  );
};
