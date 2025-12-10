import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Search, Filter, Mail, UserPlus, Sparkles } from "lucide-react";
import { useTeamManagement, type MemberFilter, type UserTypeFilter } from "@/hooks/useTeamManagement";
import { UnifiedMemberCard } from "@/components/team/UnifiedMemberCard";
import { InvitationCard } from "@/components/team/InvitationCard";
import OrganizationNameEditor from "@/components/organization/OrganizationNameEditor";
import { useToast } from "@/hooks/use-toast";
import { UserFormDialog } from "@/components/users/UserFormDialog";

function MembersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TeamManagement() {
  const { toast } = useToast();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  const {
    organization,
    members,
    invitations,
    isOwner,
    currentUserId,
    updateMemberRole,
    updateMemberUserType,
    removeMember,
    sendInvitation,
    revokeInvitation,
    isLoading,
    isProcessing,
    filters,
    setSearch,
    setRoleFilter,
    setUserTypeFilter,
    stats,
  } = useTeamManagement();

  // Query client kept for future actions; renome handled by OrganizationNameEditor

  const handleRoleChange = (membershipId: string, role: "owner" | "admin" | "manager" | "member") => {
    void updateMemberRole({ membershipId, role });
  };

  const handleUserTypeChange = (
    profileId: string,
    userType: "owner" | "traffic_manager" | "sales"
  ) => {
    void updateMemberUserType({ profileId, userType });
  };

  const handleRemoveMember = (membershipId: string) => {
    void removeMember(membershipId);
  };

  const handleRevokeInvitation = (invitationId: string) => {
    void revokeInvitation(invitationId);
  };

  // Área de convite por link (sem popup)
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerateInvite() {
    try {
      setGenerating(true);
      setInviteLink(null);
      // Para convites genéricos (sem email), basta não incluir o email
      // A Edge Function detecta isso e cria um link genérico
      const res = await sendInvitation({
        email: "", // Email vazio = convite genérico
        role: "member",
        user_type: "sales",
      });
      const link = (res as any)?.invite_link as string | undefined;
      if (link) setInviteLink(link);
      toast({ title: "Convite criado", description: "Link gerado para copiar." });
    } catch (e) {
      toast({ title: "Erro ao gerar convite", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

      {/* Header Section with Modern Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted/50 border border-border/50 p-8">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 bg-secondary/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between z-10">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 ring-4 ring-background">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              {organization ? (
                <>
                  <OrganizationNameEditor canEdit={isOwner} />
                  <p className="text-muted-foreground text-lg">
                    Gerencie sua equipe, permissões e metas
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-5 w-48" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setIsCreateUserOpen(true)}
              disabled={!isOwner}
              className="bg-card hover:bg-accent text-foreground border border-input shadow-sm h-11 px-6 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <UserPlus className="h-4 w-4 mr-2 text-primary" />
              Criar Usuário
            </Button>

            <Button
              onClick={handleGenerateInvite}
              disabled={!isOwner || generating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-11 px-6 rounded-xl transition-all duration-300 hover:scale-105"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Gerando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Gerar Convite
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {isOwner && inviteLink && (
        <Card className="bg-gradient-to-r from-card to-muted/50 border-primary/20 animate-in slide-in-from-top-2">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Convite gerado com sucesso! Compartilhe este link:
            </p>
            <div className="flex w-full sm:w-auto gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="font-mono text-sm bg-background/50 border-primary/20 focus-visible:ring-primary/30"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    toast({ title: "Link copiado ✨" });
                  } catch (error) {
                    toast({
                      title: "Erro ao copiar",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!isOwner && (
        <Alert className="bg-destructive/5 border-destructive/20 text-destructive">
          <AlertDescription>
            Você não tem permissão para gerenciar membros. Apenas proprietários podem convidar ou editar membros.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Membros</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">{stats.totalMembers}</h3>
                  <span className="text-xs text-muted-foreground">ativos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                <Mail className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Convites Pendentes</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">{stats.pendingInvitations}</h3>
                  <span className="text-xs text-muted-foreground">aguardando</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-none bg-transparent">
        <Tabs defaultValue="members" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList className="bg-card border border-border p-1 rounded-xl h-12 w-full md:w-auto">
              <TabsTrigger value="members" className="rounded-lg gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-10 px-4">
                <Users className="h-4 w-4" />
                Membros
                <span className="ml-1 bg-background/50 text-foreground/70 px-1.5 py-0.5 rounded text-xs font-medium">
                  {stats.totalMembers}
                </span>
              </TabsTrigger>
              <TabsTrigger value="invitations" className="rounded-lg gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary h-10 px-4">
                <Mail className="h-4 w-4" />
                Convites
                {stats.pendingInvitations > 0 && (
                  <span className="ml-1 bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded text-xs font-medium">
                    {stats.pendingInvitations}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar membro..."
                  value={filters.search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card border-border rounded-xl h-10"
                />
              </div>

              <Select
                value={filters.roleFilter}
                onValueChange={(value) => setRoleFilter(value as MemberFilter)}
              >
                <SelectTrigger className="w-[150px] bg-card border-border rounded-xl h-10">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Funções</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.userTypeFilter}
                onValueChange={(value) => setUserTypeFilter(value as UserTypeFilter)}
              >
                <SelectTrigger className="w-[150px] bg-card border-border rounded-xl h-10">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="traffic_manager">Tráfego</SelectItem>
                  <SelectItem value="sales">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="members" className="space-y-4 mt-0">
            {isLoading ? (
              <MembersSkeleton />
            ) : members.length === 0 ? (
              <Card className="bg-card/50 border-dashed border-2 p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Nenhum membro encontrado</h3>
                    <p className="text-muted-foreground">
                      {filters.search || filters.roleFilter !== "all"
                        ? "Tente ajustar os filtros da sua busca"
                        : "Sua equipe ainda não tem membros, comece convidando alguém!"}
                    </p>
                  </div>
                  {isOwner && !filters.search && (
                    <Button onClick={() => setIsCreateUserOpen(true)} variant="outline">
                      Criar primeiro usuário
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {members.map((member) => (
                  <UnifiedMemberCard
                    key={member.membershipId}
                    member={member}
                    isCurrentUser={member.profile.id === currentUserId}
                    canManage={isOwner}
                    onRoleChange={(role) => handleRoleChange(member.membershipId, role)}
                    onUserTypeChange={(userType) => handleUserTypeChange(member.profile.id, userType)}
                    onRemove={() => handleRemoveMember(member.membershipId)}
                    isUpdating={isProcessing}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4 mt-0">
            {isLoading ? (
              <MembersSkeleton />
            ) : invitations.length === 0 ? (
              <Card className="bg-card/50 border-dashed border-2 p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Nenhum convite pendente</h3>
                    <p className="text-muted-foreground">
                      Todos os convites enviados foram aceitos
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onRevoke={() => handleRevokeInvitation(invitation.id)}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <UserFormDialog
        open={isCreateUserOpen}
        onOpenChange={setIsCreateUserOpen}
        mode="create"
      />
    </div>
  );
}

