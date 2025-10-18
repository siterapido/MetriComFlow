import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Facebook,
  CheckCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  Info,
  Loader2,
  Shield,
  Users,
  BarChart3,
  Target,
  Bug,
  Zap
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";
import AdAccountsManager from "@/components/meta-ads/AdAccountsManager";
import AddAdAccountModal from "@/components/meta-ads/AddAdAccountModal";

export default function MetaAdsConfig() {
  const {
    connections,
    activeAdAccounts,
    inactiveAdAccounts,
    loading,
    connecting,
    connectMetaBusiness,
    disconnectMetaBusiness,
    addAdAccount,
    deactivateAdAccount,
    activateAdAccount,
    renameAdAccount,
    refreshData,
    hasActiveConnection,
    totalAdAccounts,
    oauthError
  } = useMetaAuth();

  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Debug info
  const debugInfo = {
    metaAppId: import.meta.env.VITE_META_APP_ID,
    appUrl: import.meta.env.VITE_APP_URL,
    redirectUri: import.meta.env.VITE_META_REDIRECT_URI || `${window.location.origin}/meta-ads-config`,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    environment: import.meta.env.MODE,
  };

  // Show OAuth errors via toast when present
  useEffect(() => {
    if (oauthError) {
      toast({
        title: 'Erro de OAuth',
        description: oauthError,
        variant: 'destructive',
      });
    }
  }, [oauthError]);

  const handleConnectMeta = async () => {
    try {
      setShowAuthModal(true);
      await connectMetaBusiness();
    } catch (error) {
      console.error('Error connecting to Meta:', error);
      toast({
        title: "Erro na Conexão",
        description: "Não foi possível conectar com o Meta Business. Verifique suas credenciais.",
        variant: "destructive",
      });
      setShowAuthModal(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectMetaBusiness(connectionId);
      toast({
        title: "Desconectado",
        description: "Conexão com Meta Business removida com sucesso.",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a conexão.",
        variant: "destructive",
      });
    }
  };

  const handleAddAccount = async (accountData: {
    external_id: string;
    business_name: string;
    provider?: string;
  }) => {
    try {
      await addAdAccount(accountData);
      toast({
        title: "Conta Adicionada",
        description: `${accountData.business_name} foi adicionada com sucesso.`,
      });
    } catch (error) {
      console.error('Error adding account:', error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar a conta.";
      toast({
        title: "Erro ao Adicionar Conta",
        description: errorMessage,
        variant: "destructive",
      });
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDeactivateAccount = async (accountId: string) => {
    try {
      await deactivateAdAccount(accountId);
      toast({
        title: "Conta Desativada",
        description: "A conta publicitária foi desativada com sucesso. Você pode reativá-la a qualquer momento.",
      });
    } catch (error) {
      console.error('Error deactivating account:', error);
      toast({
        title: "Erro ao Desativar Conta",
        description: "Não foi possível desativar a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  const handleReactivateAccount = async (accountId: string) => {
    try {
      await activateAdAccount(accountId);
      toast({
        title: "Conta Reativada",
        description: "A conta publicitária foi reativada com sucesso.",
      });
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast({
        title: "Erro ao Reativar Conta",
        description: "Não foi possível reativar a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  const handleRenameAccount = async (accountId: string, newName: string) => {
    try {
      await renameAdAccount(accountId, newName);
      toast({
        title: "Conta Renomeada",
        description: "O nome da conta foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error renaming account:', error);
      toast({
        title: "Erro ao Renomear Conta",
        description: "Não foi possível renomear a conta publicitária.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Seguindo padrão do Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <Facebook className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Integração Meta Business</h1>
            <p className="text-muted-foreground mt-1">
              Conecte sua conta do Meta Business Manager para acessar dados de campanhas
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {oauthError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {oauthError}
              </AlertDescription>
            </Alert>
          )}
          {/* Meta Integration Overview */}
          <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <Facebook className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 text-foreground">Meta Business Manager</h3>
                  <p className="text-muted-foreground mb-4">
                    Conecte-se ao Meta Business Manager para importar dados de campanhas,
                    anúncios e métricas de performance diretamente para o Metricom Flow.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Métricas</p>
                      <p className="text-xs text-muted-foreground">Dados em tempo real</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Campanhas</p>
                      <p className="text-xs text-muted-foreground">Gestão completa</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Audiências</p>
                      <p className="text-xs text-muted-foreground">Segmentação</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Segurança</p>
                      <p className="text-xs text-muted-foreground">OAuth 2.0</p>
                    </div>
                  </div>

                  {!hasActiveConnection ? (
                    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={handleConnectMeta}
                          disabled={connecting}
                          className="gap-2 bg-primary hover:bg-primary/90"
                          size="lg"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Conectando...
                            </>
                          ) : (
                            <>
                              <Facebook className="w-4 h-4" />
                              Conectar com Meta Business
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                              <Facebook className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <DialogTitle>Marcos de Souza foi conectado(a) ao Criativo Dashboard</DialogTitle>
                              <DialogDescription>
                                Para gerenciar uma conexão, acesse as integrações comerciais.
                              </DialogDescription>
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Permissões solicitadas:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Gerenciar anúncios e campanhas</li>
                              <li>• Acessar métricas de performance</li>
                              <li>• Visualizar contas publicitárias</li>
                              <li>• Gerenciar Business Manager</li>
                            </ul>
                          </div>
                          <div className="flex justify-between gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowAuthModal(false)}
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleConnectMeta}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              disabled={connecting}
                            >
                              {connecting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                "Continuar"
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            Política de Privacidade do Criativo Dashboard
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-success font-medium">Conectado com sucesso</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          {hasActiveConnection && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Conexões Ativas
                </CardTitle>
                <CardDescription>
                  Gerencie suas conexões com o Meta Business Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 border-border rounded-lg bg-muted hover-lift">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{connection.meta_user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.meta_user_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conectado em {new Date(connection.connected_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-success text-success-foreground">
                        Ativo
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connection.id)}
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ad Accounts Manager */}
          {hasActiveConnection && (
            <AdAccountsManager
              accounts={activeAdAccounts}
              onRefresh={refreshData}
              onAdd={() => setShowAddAccountModal(true)}
              onRemove={handleDeactivateAccount}
              onRename={handleRenameAccount}
              isLoading={loading}
            />
          )}

          {/* App Setup Instructions */}
          {!hasActiveConnection && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Settings className="w-5 h-5 text-warning" />
                  Configuração Necessária
                </CardTitle>
                <CardDescription>
                  Antes de conectar, você precisa ter um app configurado no Meta for Developers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>App Meta Necessário:</strong> Para usar esta integração, você precisa criar um app no Meta for Developers com as permissões adequadas.
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-warning text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Criar App no Meta for Developers</p>
                      <p className="text-sm text-muted-foreground">
                        Acesse developers.facebook.com e crie um novo app do tipo "Empresa"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-warning text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Configurar Produtos</p>
                      <p className="text-sm text-muted-foreground">
                        Adicione "Facebook Login" e "Marketing API" ao seu app
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-warning text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Atualizar Credenciais</p>
                      <p className="text-sm text-muted-foreground">
                        Configure o App ID e App Secret no sistema
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('/docs/META_APP_SETUP.md', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Guia Completo de Configuração
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Connection Instructions */}
          {!hasActiveConnection && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Info className="w-5 h-5 text-primary" />
                  Como Conectar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Clique em "Conectar com Meta Business"</p>
                      <p className="text-sm text-muted-foreground">
                        Você será redirecionado para o Meta Business Manager
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Autorize as permissões</p>
                      <p className="text-sm text-muted-foreground">
                        Conceda acesso às suas contas publicitárias e dados de campanhas
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Comece a usar</p>
                      <p className="text-sm text-muted-foreground">
                        Seus dados do Meta Ads estarão disponíveis no dashboard
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Status da Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conexão</span>
                <div className="flex items-center gap-2">
                  {hasActiveConnection ? (
                    <>
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-success">Conectado</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <span className="text-sm font-medium text-muted-foreground">Desconectado</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Contas Publicitárias</span>
                <span className="text-sm font-bold text-foreground">{totalAdAccounts}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última Sincronização</span>
                <span className="text-sm text-muted-foreground">
                  {hasActiveConnection ? "Agora" : "Nunca"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Precisa de Ajuda?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Consulte nossa documentação para configurar corretamente a integração com o Meta Business.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Documentação
              </Button>
            </CardContent>
          </Card>

          {/* Debug Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <Bug className="w-4 h-4 text-warning" />
                  Debug
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
            </CardHeader>
            {showDebug && (
              <CardContent className="space-y-3">
                {oauthError && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Último erro:</strong> {oauthError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="text-xs font-mono bg-muted p-3 rounded space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meta App ID:</span>
                    <span className="font-semibold text-foreground">{debugInfo.metaAppId || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment:</span>
                    <span className="font-semibold text-foreground">{debugInfo.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redirect URI:</span>
                    <span className="font-semibold text-foreground text-xs break-all">{debugInfo.redirectUri}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supabase URL:</span>
                    <span className="font-semibold text-foreground text-xs break-all">{debugInfo.supabaseUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connections:</span>
                    <span className="font-semibold text-foreground">{connections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ad Accounts:</span>
                    <span className="font-semibold text-foreground">{totalAdAccounts}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Informações de configuração para debug. Verifique se o Meta App ID está correto.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => console.log('Debug Info:', { debugInfo, connections, adAccounts, oauthError })}
                  >
                    Log Full Debug Info
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Add Account Modal */}
      <AddAdAccountModal
        open={showAddAccountModal}
        onOpenChange={setShowAddAccountModal}
        onAdd={handleAddAccount}
        inactiveAccounts={inactiveAdAccounts}
        onReactivate={handleReactivateAccount}
      />
    </div>
  );
}