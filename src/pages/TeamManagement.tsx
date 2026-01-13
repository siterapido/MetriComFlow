import { useState } from "react";
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
import { Users, Search, Filter, UserPlus, Settings2, ShieldAlert } from "lucide-react";
import { useTeamManagement, type MemberFilter, type UserTypeFilter } from "@/hooks/useTeamManagement";
import { UnifiedMemberCard } from "@/components/team/UnifiedMemberCard";
import OrganizationNameEditor from "@/components/organization/OrganizationNameEditor";
import { CreateMemberModal } from "@/components/team/CreateMemberModal";
import { useToast } from "@/hooks/use-toast";

function MembersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <Card key={idx} className="bg-card/50 border-border animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
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
  const [showOrgSettings, setShowOrgSettings] = useState(false);

  const {
    organization,
    members,
    isOwner,
    currentUserId,
    updateMemberRole,
    updateMemberUserType,
    removeMember,
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

  const [createMemberModalOpen, setCreateMemberModalOpen] = useState(false);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border/50 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Workspace</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Gestão de Equipe
            <span className="text-sm font-normal py-1 px-2.5 bg-muted rounded-full text-muted-foreground">
              {stats.totalMembers} {stats.totalMembers === 1 ? 'membro' : 'membros'}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {organization
              ? `Gerencie os acessos e permissões para ${organization.name}`
              : "Visualize e gerencie quem faz parte do seu time."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowOrgSettings(!showOrgSettings)}
              className={`gap-2 transition-all ${showOrgSettings ? 'bg-primary/10 border-primary text-primary' : ''}`}
            >
              <Settings2 className="h-4 w-4" />
              Configurar Empresa
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => setCreateMemberModalOpen(true)}
            disabled={!isOwner}
            className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="h-5 w-5" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Organization Settings Panel (Collapsible) */}
      {showOrgSettings && isOwner && (
        <Card className="glass border-primary/20 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Preferências da Organização
                </h3>
                <p className="text-sm text-muted-foreground">
                  Estas configurações afetam como sua empresa é exibida no sistema.
                </p>
              </div>
              <OrganizationNameEditor
                canEdit={isOwner}
                className="w-full md:w-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Warning */}
      {!isOwner && (
        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500 py-3">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm font-medium">
            Visualização restrita. Apenas proprietários podem gerenciar perfis e acessos.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 bg-card/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-3">
          <Select
            value={filters.roleFilter}
            onValueChange={(value) => setRoleFilter(value as MemberFilter)}
          >
            <SelectTrigger className="w-[180px] h-12 bg-card/30 border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Função" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Membro</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.userTypeFilter}
            onValueChange={(value) => setUserTypeFilter(value as UserTypeFilter)}
          >
            <SelectTrigger className="w-[200px] h-12 bg-card/30 border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Acesso" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os acessos</SelectItem>
              <SelectItem value="owner">Acesso Total</SelectItem>
              <SelectItem value="traffic_manager">Gestor de Tráfego</SelectItem>
              <SelectItem value="sales">CRM / Vendas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members List Section */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <MembersSkeleton />
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center glass rounded-2xl border-dashed border-2">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {filters.search || filters.roleFilter !== "all" || filters.userTypeFilter !== "all"
                ? "Nenhum resultado encontrado"
                : "Seu time está vazio"}
            </h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-8">
              {filters.search || filters.roleFilter !== "all" || filters.userTypeFilter !== "all"
                ? "Tente ajustar seus filtros ou termos de busca para encontrar o que procura."
                : "Convide sua equipe para começar a colaborar agora mesmo."}
            </p>
            {isOwner && !filters.search && (
              <Button
                onClick={() => setCreateMemberModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                Adicionar Membro
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      </div>

      <CreateMemberModal
        open={createMemberModalOpen}
        onOpenChange={setCreateMemberModalOpen}
        onSuccess={() => {
          toast({ title: "Sucesso", description: "Membro criado com sucesso!" });
          // Ideally use a refetch from useTeamManagement instead of reload
          window.location.reload();
        }}
      />
    </div>
  );
}
