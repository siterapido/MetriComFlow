import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Facebook, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Plus,
  Search,
  ExternalLink,
  Info,
  Loader2,
  Shield,
  Users,
  BarChart3,
  Target
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useToast } from "@/hooks/use-toast";

export default function MetaAdsConfig() {
  const { 
    connections, 
    adAccounts, 
    loading, 
    connecting, 
    connectMetaBusiness, 
    disconnectMetaBusiness,
    hasActiveConnection,
    totalAdAccounts 
  } = useMetaAuth();
  
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integração Meta Business</h1>
          <p className="text-muted-foreground">
            Conecte sua conta do Meta Business Manager para acessar dados de campanhas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meta Integration Overview */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Facebook className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Meta Business Manager</h3>
                  <p className="text-muted-foreground mb-4">
                    Conecte-se ao Meta Business Manager para importar dados de campanhas, 
                    anúncios e métricas de performance diretamente para o Metricom Flow.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Métricas</p>
                      <p className="text-xs text-muted-foreground">Dados em tempo real</p>
                    </div>
                    <div className="text-center">
                      <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Campanhas</p>
                      <p className="text-xs text-muted-foreground">Gestão completa</p>
                    </div>
                    <div className="text-center">
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Audiências</p>
                      <p className="text-xs text-muted-foreground">Segmentação</p>
                    </div>
                    <div className="text-center">
                      <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Segurança</p>
                      <p className="text-xs text-muted-foreground">OAuth 2.0</p>
                    </div>
                  </div>

                  {!hasActiveConnection ? (
                    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={handleConnectMeta}
                          disabled={connecting}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="lg"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Conectando...
                            </>
                          ) : (
                            <>
                              <Facebook className="w-4 h-4 mr-2" />
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
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-600 font-medium">Conectado com sucesso</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          {hasActiveConnection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Conexões Ativas
                </CardTitle>
                <CardDescription>
                  Gerencie suas conexões com o Meta Business Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{connection.meta_user_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.meta_user_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conectado em {new Date(connection.connected_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
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

          {/* Ad Accounts */}
          {totalAdAccounts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Contas Publicitárias ({totalAdAccounts})
                </CardTitle>
                <CardDescription>
                  Contas do Meta Ads disponíveis para importação de dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {adAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{account.business_name || 'Unnamed Account'}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {account.external_id} • {account.provider}
                            </p>
                      </div>
                    </div>
                    <Badge 
                      variant={account.account_status === 1 ? "secondary" : "destructive"}
                      className={account.account_status === 1 ? "bg-green-100 text-green-700" : ""}
                    >
                      {account.account_status === 1 ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* App Setup Instructions */}
          {!hasActiveConnection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-600" />
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
                    <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Criar App no Meta for Developers</p>
                      <p className="text-sm text-muted-foreground">
                        Acesse developers.facebook.com e crie um novo app do tipo "Empresa"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Configurar Produtos</p>
                      <p className="text-sm text-muted-foreground">
                        Adicione "Facebook Login" e "Marketing API" ao seu app
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Atualizar Credenciais</p>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Como Conectar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Clique em "Conectar com Meta Business"</p>
                      <p className="text-sm text-muted-foreground">
                        Você será redirecionado para o Meta Business Manager
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Autorize as permissões</p>
                      <p className="text-sm text-muted-foreground">
                        Conceda acesso às suas contas publicitárias e dados de campanhas
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Comece a usar</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status da Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Conexão</span>
                <div className="flex items-center gap-2">
                  {hasActiveConnection ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600">Conectado</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">Desconectado</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Contas Publicitárias</span>
                <span className="text-sm font-medium">{totalAdAccounts}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Última Sincronização</span>
                <span className="text-sm text-muted-foreground">
                  {hasActiveConnection ? "Agora" : "Nunca"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Precisa de Ajuda?</CardTitle>
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
        </div>
      </div>
    </div>
  );
}