import { useState, useEffect } from "react";
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
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  Plus,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailableAdAccount {
  external_id: string;
  business_name: string;
  account_status: number;
  currency: string;
  timezone: string;
  business?: any;
  is_connected: boolean;
}

interface AvailableAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (account: { external_id: string; business_name: string }) => Promise<void>;
  onRefresh: () => Promise<AvailableAdAccount[]>;
  accounts: AvailableAdAccount[];
  isLoading: boolean;
}

export function AvailableAccountsDialog({
  open,
  onOpenChange,
  onConnect,
  onRefresh,
  accounts,
  isLoading,
}: AvailableAccountsDialogProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedAccounts(new Set());
      setError(null);
    }
  }, [open]);

  const handleToggleAccount = (externalId: string, isConnected: boolean) => {
    if (isConnected) return; // Can't toggle already connected accounts

    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(externalId)) {
      newSelection.delete(externalId);
    } else {
      newSelection.add(externalId);
    }
    setSelectedAccounts(newSelection);
  };

  const handleConnectSelected = async () => {
    if (selectedAccounts.size === 0) return;

    setConnecting(true);
    setError(null);

    try {
      // Connect accounts one by one
      for (const externalId of selectedAccounts) {
        const account = accounts.find((acc) => acc.external_id === externalId);
        if (account && !account.is_connected) {
          await onConnect({
            external_id: account.external_id,
            business_name: account.business_name,
          });
        }
      }

      // Clear selection and close dialog
      setSelectedAccounts(new Set());
      onOpenChange(false);
    } catch (err) {
      console.error("Error connecting accounts:", err);
      setError(err instanceof Error ? err.message : "Erro ao conectar contas");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      console.error("Error refreshing accounts:", err);
      setError(err instanceof Error ? err.message : "Erro ao atualizar lista de contas");
    } finally {
      setRefreshing(false);
    }
  };

  const availableToConnect = accounts.filter((acc) => !acc.is_connected);
  const alreadyConnected = accounts.filter((acc) => acc.is_connected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Contas Disponíveis no Meta Ads
              </DialogTitle>
              <DialogDescription className="mt-2">
                Selecione as contas publicitárias que você deseja conectar ao sistema
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Carregando contas...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && accounts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Nenhuma conta encontrada
              </h3>
              <p className="text-muted-foreground mb-6">
                Não encontramos contas publicitárias associadas a esta conta Meta.
              </p>
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Statistics */}
          {!isLoading && accounts.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-card to-accent/20 border-border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Total
                </p>
                <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
              </div>
              <div className="bg-gradient-to-br from-card to-accent/20 border-border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Disponíveis
                </p>
                <p className="text-2xl font-bold text-primary">{availableToConnect.length}</p>
              </div>
              <div className="bg-gradient-to-br from-card to-accent/20 border-border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Conectadas
                </p>
                <p className="text-2xl font-bold text-success">{alreadyConnected.length}</p>
              </div>
            </div>
          )}

          {/* Available Accounts List */}
          {!isLoading && availableToConnect.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Contas Disponíveis ({availableToConnect.length})
                </h3>
                {selectedAccounts.size > 0 && (
                  <Badge variant="secondary">
                    {selectedAccounts.size} selecionada{selectedAccounts.size !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {availableToConnect.map((account) => (
                  <button
                    key={account.external_id}
                    onClick={() => handleToggleAccount(account.external_id, account.is_connected)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 border rounded-lg transition-all duration-200",
                      "hover:border-primary hover:bg-accent/10",
                      selectedAccounts.has(account.external_id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted"
                    )}
                  >
                    {/* Selection Indicator */}
                    <div className="flex-shrink-0">
                      {selectedAccounts.has(account.external_id) ? (
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-muted border-2 border-border rounded-lg flex items-center justify-center">
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Account Info */}
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">{account.business_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          ID: {account.external_id}
                        </span>
                        <span>{account.currency}</span>
                        {account.account_status === 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Ativa
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Already Connected Accounts */}
          {!isLoading && alreadyConnected.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Já Conectadas ({alreadyConnected.length})
              </h3>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {alreadyConnected.map((account) => (
                  <div
                    key={account.external_id}
                    className="flex items-center gap-4 p-4 border border-border rounded-lg bg-muted opacity-60"
                  >
                    {/* Connected Indicator */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">{account.business_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          ID: {account.external_id}
                        </span>
                        <Badge className="bg-success text-success-foreground text-xs">
                          Conectada
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isLoading && availableToConnect.length > 0 && (
            <div className="flex items-center justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
                Cancelar
              </Button>
              <Button
                onClick={handleConnectSelected}
                disabled={selectedAccounts.size === 0 || connecting}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Conectar {selectedAccounts.size > 0 ? `(${selectedAccounts.size})` : "Selecionadas"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
