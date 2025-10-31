import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Search, Filter, UserPlus, Mail, TrendingUp } from "lucide-react";
import { useTeamManagement, type MemberFilter, type UserTypeFilter } from "@/hooks/useTeamManagement";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { UnifiedMemberCard } from "@/components/team/UnifiedMemberCard";
import { InvitationCard } from "@/components/team/InvitationCard";

function MembersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="bg-card border-border">
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const {
    organization,
    members,
    invitations,
    isOwner,
    currentUserId,
    updateMemberRole,
    updateMemberUserType,
    removeMember,
    resendInvitation,
    revokeInvitation,
    isLoading,
    isProcessing,
    filters,
    setSearch,
    setRoleFilter,
    setUserTypeFilter,
    stats,
  } = useTeamManagement();

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

  const handleResendInvitation = (invitation: any) => {
    void resendInvitation(invitation);
  };

  const handleRevokeInvitation = (invitationId: string) => {
    void revokeInvitation(invitationId);
  };

  return (
    <div className="p-6 space-y-6">
      <InviteMemberDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Equipe</h1>
            <p className="text-muted-foreground mt-1">
              {organization
                ? `Gerencie membros, convites e permissões de ${organization.name}`
                : "Carregando organização..."}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setInviteDialogOpen(true)}
          disabled={!isOwner}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="h-4 w-4" />
          Convidar membro
        </Button>
      </div>

      {/* Permission Warning */}
      {!isOwner && (
        <Alert className="bg-accent/20 border-border">
          <AlertDescription className="text-muted-foreground">
            Você não tem permissão para gerenciar membros. Apenas proprietários (owners) podem convidar,
            editar ou remover membros da equipe.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-accent/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Convites Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingInvitations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Select
                value={filters.roleFilter}
                onValueChange={(value) => setRoleFilter(value as MemberFilter)}
              >
                <SelectTrigger className="bg-background border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por função" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todas as funções</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Type Filter */}
            <div className="relative">
              <Select
                value={filters.userTypeFilter}
                onValueChange={(value) => setUserTypeFilter(value as UserTypeFilter)}
              >
                <SelectTrigger className="bg-background border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="owner">Owner (Acesso total)</SelectItem>
                  <SelectItem value="traffic_manager">Gestor de Tráfego</SelectItem>
                  <SelectItem value="sales">CRM / Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Membros ({stats.totalMembers})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Convites Pendentes ({stats.pendingInvitations})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {isLoading ? (
            <MembersSkeleton />
          ) : members.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {filters.search || filters.roleFilter !== "all" || filters.userTypeFilter !== "all"
                    ? "Nenhum membro encontrado"
                    : "Nenhum membro cadastrado"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filters.search || filters.roleFilter !== "all" || filters.userTypeFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Convide sua equipe para colaborar nas metas, leads e métricas da organização."}
                </p>
                {isOwner &&
                  !filters.search &&
                  filters.roleFilter === "all" &&
                  filters.userTypeFilter === "all" && (
                    <Button
                      onClick={() => setInviteDialogOpen(true)}
                      className="bg-primary hover:bg-primary/90 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Convidar primeiro membro
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {isLoading ? (
            <MembersSkeleton />
          ) : invitations.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum convite pendente
                </h3>
                <p className="text-muted-foreground mb-4">
                  Todos os convites foram aceitos ou expirados.
                </p>
                {isOwner && (
                  <Button
                    onClick={() => setInviteDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Enviar novo convite
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResend={() => handleResendInvitation(invitation)}
                  onRevoke={() => handleRevokeInvitation(invitation.id)}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
