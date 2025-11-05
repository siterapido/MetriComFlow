import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Circle,
  Facebook,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type DateRange = {
  start: string;
  end: string;
};

type MetaAdsConnectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange?: DateRange;
  onAccountsUpdated?: () => void;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SYNC_WINDOW_DAYS = 30;
const MAX_SYNC_WINDOW_DAYS = 90;

const formatDate = (date: Date) => date.toISOString().split("T")[0];

export function MetaAdsConnectionDialog({
  open,
  onOpenChange,
  dateRange,
  onAccountsUpdated,
}: MetaAdsConnectionDialogProps) {
  const {
    connections,
    activeAdAccounts,
    inactiveAdAccounts,
    availableAccounts,
    listAvailableAccounts,
    loadingAvailableAccounts,
    loading,
    connecting,
    hasActiveConnection,
    connectMetaBusiness,
    disconnectMetaBusiness,
    addAdAccount,
    deactivateAdAccount,
    activateAdAccount,
    refreshData,
    syncCampaigns,
    syncDailyInsights,
  } = useMetaAuth();

  const { toast } = useToast();
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null);
  const [reactivatingAccountId, setReactivatingAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDialogBusy = isProcessing || connecting || loading;
  const primaryConnection = connections[0];

  const syncRange = useMemo(() => {
    const today = new Date();
    const endDate = dateRange?.end ? new Date(dateRange.end) : today;
    let startDate = dateRange?.start ? new Date(dateRange.start) : new Date(endDate.getTime() - DEFAULT_SYNC_WINDOW_DAYS * MS_PER_DAY);

    if (Number.isNaN(startDate.getTime())) {
      startDate = new Date(endDate.getTime() - DEFAULT_SYNC_WINDOW_DAYS * MS_PER_DAY);
    }

    if (Number.isNaN(endDate.getTime()) || endDate > today) {
      endDate.setTime(today.getTime());
    }

    const diffDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY));
    if (diffDays > MAX_SYNC_WINDOW_DAYS) {
      startDate = new Date(endDate.getTime() - MAX_SYNC_WINDOW_DAYS * MS_PER_DAY);
    }

    return {
      since: formatDate(startDate),
      until: formatDate(endDate),
    };
  }, [dateRange]);

  const availableToConnect = useMemo(
    () => availableAccounts.filter((account) => !account.is_connected),
    [availableAccounts],
  );

  const alreadyConnectedInMeta = useMemo(
    () => availableAccounts.filter((account) => account.is_connected),
    [availableAccounts],
  );

  useEffect(() => {
    if (!open) {
      setSelectedAccounts(new Set());
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !hasActiveConnection) return;

    if (availableAccounts.length === 0 && !loadingAvailableAccounts) {
      listAvailableAccounts().catch((err) => {
        console.error("Error listing available accounts:", err);
        setError(err instanceof Error ? err.message : "Erro ao listar contas disponíveis.");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasActiveConnection, availableAccounts.length, loadingAvailableAccounts]);

  const handleToggleAccount = (externalId: string, isConnected: boolean) => {
    if (isConnected || isProcessing) return;

    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) {
        next.delete(externalId);
      } else {
        next.add(externalId);
      }
      return next;
    });
  };

  const handleRefreshAvailableAccounts = async () => {
    try {
      await listAvailableAccounts();
      toast({
        title: "Lista atualizada",
        description: "Contas disponíveis foram atualizadas com sucesso.",
      });
    } catch (err) {
      console.error("Error refreshing accounts:", err);
      const message = err instanceof Error ? err.message : "Erro ao atualizar lista de contas.";
      setError(message);
      toast({
        title: "Erro ao atualizar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const invokeMetaSync = async (fn: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(fn, { body: payload });

    if (error) {
      throw new Error(error.message || `Falha ao executar ${fn}`);
    }

    return data;
  };

  const connectAccountHierarchy = async (accountId: string) => {
    await syncCampaigns(accountId);
    await syncDailyInsights({
      since: syncRange.since,
      until: syncRange.until,
      accountIds: [accountId],
    });
  };

  const handleConnectSelectedAccounts = async () => {
    if (selectedAccounts.size === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      let processed = 0;

      for (const externalId of selectedAccounts) {
        const account = availableAccounts.find((item) => item.external_id === externalId);
        if (!account) continue;

        const inserted = await addAdAccount({
          external_id: account.external_id,
          business_name: account.business_name,
          provider: "meta",
        });

        await connectAccountHierarchy(inserted.id);
        processed += 1;
      }

      await refreshData();
      await listAvailableAccounts().catch(() => undefined);
      setSelectedAccounts(new Set());

      toast({
        title: "Contas conectadas",
        description:
          processed === 1
            ? "Conta Meta conectada e sincronizada com sucesso."
            : `${processed} contas Meta conectadas e sincronizadas com sucesso.`,
      });

      onAccountsUpdated?.();
    } catch (err) {
      console.error("Error connecting accounts:", err);
      const message = err instanceof Error ? err.message : "Erro ao conectar contas selecionadas.";
      setError(message);
      toast({
        title: "Erro ao conectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    setDisconnectingAccountId(accountId);
    setError(null);

    try {
      await deactivateAdAccount(accountId);
      await refreshData();
      toast({
        title: "Conta desconectada",
        description: "A conta foi removida da integração.",
      });
      onAccountsUpdated?.();
    } catch (err) {
      console.error("Error disconnecting account:", err);
      const message = err instanceof Error ? err.message : "Erro ao desconectar a conta.";
      setError(message);
      toast({
        title: "Erro ao desconectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  const handleReactivateAccount = async (accountId: string) => {
    setReactivatingAccountId(accountId);
    setError(null);

    try {
      await activateAdAccount(accountId);
      await connectAccountHierarchy(accountId);
      await refreshData();
      await listAvailableAccounts().catch(() => undefined);

      toast({
        title: "Conta reativada",
        description: "Sincronização iniciada para a conta reconectada.",
      });

      onAccountsUpdated?.();
    } catch (err) {
      console.error("Error reactivating account:", err);
      const message = err instanceof Error ? err.message : "Erro ao reconectar a conta.";
      setError(message);
      toast({
        title: "Erro ao reconectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setReactivatingAccountId(null);
    }
  };

  const handleDisconnectBusiness = async () => {
    if (!primaryConnection) {
      toast({
        title: "Conexão não encontrada",
        description: "Nenhuma conexão ativa com o Meta foi localizada.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await disconnectMetaBusiness(primaryConnection.id);
      await refreshData();
      toast({
        title: "Conexão removida",
        description: "A conexão com o Meta Business foi encerrada.",
      });
      onAccountsUpdated?.();
    } catch (err) {
      console.error("Error disconnecting Meta business:", err);
      const message = err instanceof Error ? err.message : "Erro ao desconectar do Meta Business.";
      toast({
        title: "Erro ao desconectar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartOAuth = async () => {
    try {
      const authUrl = await connectMetaBusiness();
      window.location.href = authUrl;
    } catch (err) {
      console.error("Error starting OAuth flow:", err);
      const message = err instanceof Error ? err.message : "Erro ao iniciar autenticação com o Meta.";
      setError(message);
      toast({
        title: "Erro na autenticação",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Facebook className="h-5 w-5 text-primary" />
            Meta Ads - Gerenciar Contas
          </DialogTitle>
          <DialogDescription>
            Selecione as contas publicitárias do Meta que deseja analisar e mantenha a conexão atualizada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Status da conexão</p>
                {hasActiveConnection && primaryConnection ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{primaryConnection.meta_user_name}</p>
                    {primaryConnection.meta_user_email && <p>{primaryConnection.meta_user_email}</p>}
                    <p className="text-xs text-muted-foreground">
                      Conectado em {new Date(primaryConnection.connected_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Conecte seu Meta Business Manager para listar as contas de anúncios disponíveis.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasActiveConnection ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Desconectado
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!hasActiveConnection ? (
                <Button onClick={handleStartOAuth} disabled={isDialogBusy} className="gap-2">
                  {isDialogBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
                  Conectar ao Meta
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleDisconnectBusiness}
                  disabled={isDialogBusy}
                  className="gap-2"
                >
                  {isDialogBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Desconectar Meta Business
                </Button>
              )}

              {hasActiveConnection && (
                <Button
                  variant="outline"
                  onClick={handleRefreshAvailableAccounts}
                  disabled={isDialogBusy || loadingAvailableAccounts}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", (isDialogBusy || loadingAvailableAccounts) && "animate-spin")} />
                  Atualizar Contas
                </Button>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Período utilizado para sincronizar métricas: {syncRange.since} até {syncRange.until}.
            </p>
          </section>

          {hasActiveConnection ? (
            <div className="space-y-4">
              <section className="space-y-3">
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Contas disponíveis</h3>
                    <p className="text-xs text-muted-foreground">
                      Selecione as contas que deseja conectar e sincronizar com o dashboard.
                    </p>
                  </div>
                  {selectedAccounts.size > 0 && (
                    <Badge variant="secondary">
                      {selectedAccounts.size} selecionada{selectedAccounts.size > 1 ? "s" : ""}
                    </Badge>
                  )}
                </header>

                {loadingAvailableAccounts ? (
                  <div className="flex h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-border">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando contas do Meta...</span>
                  </div>
                ) : availableToConnect.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <Building2 className="h-6 w-6" />
                    Nenhuma conta disponível para conexão. Atualize a lista para buscar novamente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableToConnect.map((account) => {
                      const isSelected = selectedAccounts.has(account.external_id);

                      return (
                        <button
                          key={account.external_id}
                          onClick={() => handleToggleAccount(account.external_id, account.is_connected)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors",
                            "hover:border-primary hover:bg-accent/10",
                            isSelected ? "border-primary bg-primary/5" : "border-border bg-muted"
                          )}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </span>

                          <div className="flex-1">
                            <p className="font-medium text-foreground">{account.business_name}</p>
                            <p className="text-xs text-muted-foreground">ID: {account.external_id}</p>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {account.currency}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAccounts(new Set())}
                    disabled={selectedAccounts.size === 0 || isProcessing}
                  >
                    Limpar seleção
                  </Button>
                  <Button
                    onClick={handleConnectSelectedAccounts}
                    disabled={selectedAccounts.size === 0 || isProcessing}
                    className="gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Conectar selecionadas
                  </Button>
                </div>
              </section>

              {inactiveAdAccounts.length > 0 && (
                <section className="space-y-3">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Contas desconectadas</h3>
                      <p className="text-xs text-muted-foreground">
                        Reative uma conta para voltar a sincronizar campanhas e métricas automaticamente.
                      </p>
                    </div>
                    <Badge variant="outline">{inactiveAdAccounts.length}</Badge>
                  </header>

                  <div className="space-y-2">
                    {inactiveAdAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{account.business_name || account.external_id}</p>
                          <p className="text-xs text-muted-foreground">ID interno: {account.id}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleReactivateAccount(account.id)}
                          disabled={reactivatingAccountId === account.id || isProcessing}
                          className="gap-2"
                        >
                          {reactivatingAccountId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                          Reconectar
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Contas conectadas</h3>
                    <p className="text-xs text-muted-foreground">
                      Desconecte contas que não deseja mais sincronizar com o dashboard.
                    </p>
                  </div>
                  <Badge variant="secondary">{activeAdAccounts.length}</Badge>
                </header>

                {activeAdAccounts.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    <ShieldAlert className="h-5 w-5" />
                    Nenhuma conta ativa no momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeAdAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{account.business_name || account.external_id}</p>
                          <p className="text-xs text-muted-foreground">ID interno: {account.id}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectAccount(account.id)}
                          disabled={disconnectingAccountId === account.id}
                          className="gap-2"
                        >
                          {disconnectingAccountId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4" />
                          )}
                          Desconectar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {alreadyConnectedInMeta.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Contas marcadas como "conectadas" no Meta podem estar atribuidas a outras organizações. Caso precise movê-las, entre em contato com o suporte.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
              <Facebook className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              Para selecionar as contas do Meta Ads, conecte-se primeiro ao Meta Business Manager.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
