/**
 * Componente minimalista para conectar Meta Ads diretamente na página de métricas
 * Substitui a necessidade de ir para /meta-ads-config
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Facebook,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  Unlink2,
  RefreshCw,
} from 'lucide-react';
import { useMetaAuth } from '@/hooks/useMetaAuth';
import { useMetaConnectionStatus } from '@/hooks/useMetaConnectionStatus';
import { useAdAccounts } from '@/hooks/useMetaMetrics';

interface MetaAdsConnectionCardProps {
  onConnectionSuccess?: () => void;
}

export function MetaAdsConnectionCard({ onConnectionSuccess }: MetaAdsConnectionCardProps) {
  const { connectMetaBusiness, disconnectMetaBusiness } = useMetaAuth();
  const { hasActiveConnection, isLoading: statusLoading } = useMetaConnectionStatus();
  const { data: adAccounts, isLoading: accountsLoading } = useAdAccounts({ enabled: hasActiveConnection });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const authUrl = await connectMetaBusiness();
      if (authUrl) {
        window.open(authUrl, 'meta-auth', 'width=800,height=600');
        onConnectionSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMetaBusiness();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    }
  };

  const isLoading = statusLoading || accountsLoading;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Verificando conexão...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1877F2] to-[#0A66C2] rounded-lg flex items-center justify-center">
            <Facebook className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-foreground">Meta Ads</CardTitle>
            <CardDescription>
              {hasActiveConnection ? 'Conectado ao Meta Business' : 'Conecte sua conta Meta'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {hasActiveConnection ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-foreground">Conectado</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Desconectado</span>
              </>
            )}
          </div>
          <Badge variant={hasActiveConnection ? 'default' : 'outline'}>
            {hasActiveConnection ? '✓ Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Ad Accounts (se conectado) */}
        {hasActiveConnection && adAccounts && adAccounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Contas Conectadas</p>
            <div className="space-y-1">
              {adAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-2 p-2 rounded bg-background/50 text-sm"
                >
                  <Link2 className="w-3 h-3 text-success" />
                  <span className="text-foreground">{account.business_name || account.external_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Text */}
        {!hasActiveConnection && (
          <p className="text-xs text-muted-foreground">
            Clique abaixo para autorizar acesso ao seu Meta Business Manager e começar a sincronizar campanhas.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!hasActiveConnection ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-[#1877F2] hover:bg-[#0A66C2] text-white gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Facebook className="w-4 h-4" />
                  Conectar Meta Business
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Unlink2 className="w-4 h-4" />
                Desconectar
              </Button>
              <Button
                onClick={handleConnect}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reconectar
              </Button>
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Após conectar, sincronize seus dados clicando no botão "Sincronizar"
        </div>
      </CardContent>
    </Card>
  );
}
