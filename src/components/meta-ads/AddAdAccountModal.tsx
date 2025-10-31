import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Plus, RefreshCw, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useCanAddAdAccount } from "@/hooks/useSubscription";

interface InactiveAccount {
  id: string;
  external_id: string;
  business_name: string | null;
  provider: string;
  created_at: string;
}

interface AddAdAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { external_id: string; business_name: string; provider?: string }) => Promise<void>;
  inactiveAccounts?: InactiveAccount[];
  onReactivate?: (accountId: string) => Promise<void>;
}

export default function AddAdAccountModal({
  open,
  onOpenChange,
  onAdd,
  inactiveAccounts = [],
  onReactivate
}: AddAdAccountModalProps) {
  const [externalId, setExternalId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [provider, setProvider] = useState("meta");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  const canAddAdAccount = useCanAddAdAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canAddAdAccount) {
      setError("Seu plano não permite adicionar novas contas no momento. Regularize o pagamento ou faça upgrade.");
      return;
    }

    // Validação
    if (!externalId.trim()) {
      setError("O ID da conta é obrigatório");
      return;
    }

    if (!businessName.trim()) {
      setError("O nome da conta é obrigatório");
      return;
    }

    try {
      setIsLoading(true);

      // Remove o prefixo 'act_' se o usuário incluir
      const cleanExternalId = externalId.replace(/^act_/i, '');

      await onAdd({
        external_id: cleanExternalId,
        business_name: businessName.trim(),
        provider
      });

      // Reset form and close modal on success
      setExternalId("");
      setBusinessName("");
      setProvider("meta");
      setError(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Error adding ad account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar conta publicitária');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async (accountId: string) => {
    if (!onReactivate) return;

    try {
      setIsLoading(true);
      setError(null);
      await onReactivate(accountId);
      onOpenChange(false);
    } catch (err) {
      console.error('Error reactivating account:', err);
      setError(err instanceof Error ? err.message : 'Erro ao reativar conta publicitária');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setExternalId("");
    setBusinessName("");
    setProvider("meta");
    setError(null);
    setActiveTab("new");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Gerenciar Contas Publicitárias
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova conta ou reative contas desativadas anteriormente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </TabsTrigger>
            <TabsTrigger value="reactivate" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reativar ({inactiveAccounts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!canAddAdAccount && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Limite atingido ou pagamento pendente. Faça upgrade ou regularize o plano para adicionar novas contas.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="provider" className="text-foreground">
                    Provedor
                  </Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger id="provider" className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta Ads (Facebook/Instagram)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Atualmente apenas Meta Ads é suportado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="external_id" className="text-foreground">
                    ID da Conta Publicitária *
                  </Label>
                  <Input
                    id="external_id"
                    placeholder="123456789012345 ou act_123456789012345"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    disabled={isLoading || !canAddAdAccount}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre no Gerenciador de Anúncios do Meta. O prefixo "act_" será removido automaticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-foreground">
                    Nome da Conta *
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="Ex: Minha Empresa - Anúncios"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={isLoading || !canAddAdAccount}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Um nome descritivo para identificar facilmente esta conta
                  </p>
                </div>

                <Alert className="border-primary/20 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-foreground">
                    <strong>Importante:</strong> Certifique-se de ter permissões de acesso à conta publicitária
                    no Meta Business Manager antes de adicioná-la.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter className="gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !canAddAdAccount}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar Conta
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="reactivate" className="mt-4">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {inactiveAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Nenhuma conta desativada</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Todas as suas contas publicitárias estão ativas. Contas desativadas aparecerão aqui
                    para que você possa reativá-las quando necessário.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma conta desativada para reativá-la:
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {inactiveAccounts.map((account) => (
                      <Card
                        key={account.id}
                        className="p-4 hover-lift cursor-pointer border-border bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate text-foreground">
                              {account.business_name || "Conta sem nome"}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                                ID: {account.external_id}
                              </span>
                              <span>•</span>
                              <span>{account.provider}</span>
                              <span>•</span>
                              <span>Desativada em {new Date(account.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReactivate(account.id)}
                            disabled={isLoading}
                            className="gap-2 bg-success hover:bg-success/90 flex-shrink-0"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Reativar
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              <DialogFooter className="gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
