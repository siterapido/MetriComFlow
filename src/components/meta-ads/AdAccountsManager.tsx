import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Filter,
  X,
  Edit2,
  Check,
  XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdAccount {
  id: string;
  external_id: string;
  business_name: string | null;
  provider: string;
  is_active: boolean;
  created_at: string;
  currency?: string;
  timezone?: string;
}

interface AdAccountsManagerProps {
  accounts: AdAccount[];
  onRefresh?: () => void;
  onAdd?: () => void;
  onRemove?: (accountId: string) => void;
  onRename?: (accountId: string, newName: string) => void;
  isLoading?: boolean;
}

export default function AdAccountsManager({
  accounts,
  onRefresh,
  onAdd,
  onRemove,
  onRename,
  isLoading = false
}: AdAccountsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [accountToDelete, setAccountToDelete] = useState<AdAccount | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Filtros e busca
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Filtro de busca
      const matchesSearch =
        searchQuery === "" ||
        account.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.external_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.provider.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de status
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && account.is_active) ||
        (statusFilter === "inactive" && !account.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [accounts, searchQuery, statusFilter]);

  const activeCount = accounts.filter(a => a.is_active).length;
  const inactiveCount = accounts.filter(a => !a.is_active).length;

  const handleRemove = (account: AdAccount) => {
    setAccountToDelete(account);
  };

  const confirmRemove = () => {
    if (accountToDelete && onRemove) {
      onRemove(accountToDelete.id);
    }
    setAccountToDelete(null);
  };

  const startEditing = (account: AdAccount) => {
    setEditingAccountId(account.id);
    setEditingName(account.business_name || "");
  };

  const cancelEditing = () => {
    setEditingAccountId(null);
    setEditingName("");
  };

  const saveEditing = async () => {
    if (editingAccountId && onRename && editingName.trim()) {
      await onRename(editingAccountId, editingName.trim());
      setEditingAccountId(null);
      setEditingName("");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              Contas Publicitárias ({accounts.length})
            </CardTitle>
            <CardDescription>
              {accounts.length === 0
                ? "Nenhuma conta conectada. Adicione sua primeira conta publicitária."
                : `Gerencie ${accounts.length} ${accounts.length === 1 ? 'conta conectada' : 'contas conectadas'} ao Meta Ads`
              }
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
            {onAdd && (
              <Button
                size="sm"
                onClick={onAdd}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Adicionar Conta
              </Button>
            )}
          </div>
        </div>

        {/* Estatísticas Resumidas */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
            </Card>
            <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Ativas</p>
              <p className="text-2xl font-bold text-success">{activeCount}</p>
            </Card>
            <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Inativas</p>
              <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            </Card>
          </div>
        )}

        {/* Barra de Busca e Filtros */}
        {accounts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou provedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 bg-input border-border"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px] h-10 bg-input border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10 gap-2"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Nenhuma conta publicitária</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Conecte sua primeira conta do Meta Ads para começar a importar dados de campanhas e anúncios.
            </p>
            {onAdd && (
              <Button onClick={onAdd} className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Adicionar Conta Publicitária
              </Button>
            )}
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma conta encontrada com os filtros aplicados.{" "}
              <button
                onClick={clearFilters}
                className="font-medium underline hover:no-underline"
              >
                Limpar filtros
              </button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Indicador de Filtros Ativos */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">
                <p className="text-sm text-foreground">
                  Mostrando <span className="font-semibold">{filteredAccounts.length}</span> de{" "}
                  <span className="font-semibold">{accounts.length}</span> conta(s)
                </p>
              </div>
            )}

            {/* Lista de Contas */}
            <div className="space-y-2">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="group flex items-center justify-between p-4 border-border rounded-lg bg-muted hover-lift transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      {account.is_active ? (
                        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Account Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {editingAccountId === account.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 flex-1 max-w-xs bg-input border-border"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEditing}
                              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-base truncate text-foreground">
                              {account.business_name || "Conta sem nome"}
                            </p>
                            {onRename && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(account)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                        <Badge
                          className={`flex-shrink-0 ${
                            account.is_active
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {account.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          ID: {account.external_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                          {account.provider}
                        </span>
                        {account.currency && (
                          <span className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                            {account.currency}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                          Adicionada em {new Date(account.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {onRemove && editingAccountId !== account.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(account)}
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Desativar conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar conta publicitária?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a desativar a conta{" "}
                <span className="font-semibold">
                  {accountToDelete?.business_name || accountToDelete?.external_id}
                </span>
                .
              </p>
              <p className="text-muted-foreground">
                A conta será removida da lista, mas você poderá reativá-la a qualquer momento
                clicando em "Adicionar Conta". Todos os dados históricos de campanhas
                associados a esta conta permanecerão no sistema.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-warning hover:bg-warning/90"
            >
              Desativar Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
