import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreVertical,
  Shield,
  UserCog,
  Trash2,
  Crown,
  Users,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TeamMember } from "@/hooks/useTeam";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";

interface UnifiedMemberCardProps {
  member: TeamMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onRoleChange: (role: TeamMember["role"]) => void;
  onUserTypeChange: (userType: TeamMember["profile"]["user_type"]) => void;
  onRemove: () => void;
  isUpdating: boolean;
}

export function UnifiedMemberCard({
  member,
  isCurrentUser,
  canManage,
  onRoleChange,
  onUserTypeChange,
  onRemove,
  isUpdating,
}: UnifiedMemberCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeConfig = (role: TeamMember["role"]) => {
    switch (role) {
      case "owner":
        return {
          label: "Owner",
          className: "bg-gradient-to-br from-primary to-secondary text-white",
          icon: Crown,
        };
      case "admin":
        return {
          label: "Admin",
          className: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
          icon: Shield,
        };
      case "manager":
        return {
          label: "Manager",
          className: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white",
          icon: Users,
        };
      case "member":
        return {
          label: "Membro",
          className: "bg-muted text-muted-foreground",
          icon: UserCog,
        };
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case "owner":
        return Shield;
      case "traffic_manager":
        return BarChart3;
      case "sales":
        return ShoppingCart;
      default:
        return UserCog;
    }
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case "owner":
        return "bg-gradient-to-br from-amber-500 to-orange-500 text-white";
      case "traffic_manager":
        return "bg-gradient-to-br from-indigo-500 to-blue-500 text-white";
      case "sales":
        return "bg-gradient-to-br from-green-500 to-emerald-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const roleBadge = getRoleBadgeConfig(member.role);
  const RoleIcon = roleBadge.icon;
  const UserTypeIcon = getUserTypeIcon(member.profile.user_type);

  const disableManagement = isCurrentUser || !canManage || member.role === "owner";

  const handleDelete = () => {
    onRemove();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="bg-card border-border hover-lift transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Avatar and Main Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20 flex-shrink-0">
                <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-lg">
                  {getInitials(member.profile.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Name and Current User Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {member.profile.full_name}
                  </h3>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Você
                    </Badge>
                  )}
                </div>

                {/* Email */}
                <p className="text-sm text-muted-foreground mb-3 truncate">{member.profile.email}</p>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Role Badge */}
                  <Badge className={`${roleBadge.className} gap-1.5`}>
                    <RoleIcon className="h-3 w-3" />
                    {roleBadge.label}
                  </Badge>

                  {/* User Type Badge */}
                  <Badge className={`${getUserTypeBadgeColor(member.profile.user_type)} gap-1.5`}>
                    <UserTypeIcon className="h-3 w-3" />
                    {USER_TYPE_LABELS[member.profile.user_type]}
                  </Badge>
                </div>

                {/* Joined Date */}
                <p className="text-xs text-muted-foreground">
                  Entrou em{" "}
                  {format(new Date(member.joinedAt), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disableManagement || isUpdating}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                {/* Role Management */}
                <DropdownMenuLabel>Função na Organização</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={isUpdating || member.role === "member"}
                  onClick={() => onRoleChange("member")}
                  className="cursor-pointer"
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Membro
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isUpdating || member.role === "manager"}
                  onClick={() => onRoleChange("manager")}
                  className="cursor-pointer"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isUpdating || member.role === "admin"}
                  onClick={() => onRoleChange("admin")}
                  className="cursor-pointer"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* User Type Management */}
                <DropdownMenuLabel>Tipo de Acesso</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={isUpdating || member.profile.user_type === "sales"}
                  onClick={() => onUserTypeChange("sales")}
                  className="cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  CRM / Vendas
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isUpdating || member.profile.user_type === "traffic_manager"}
                  onClick={() => onUserTypeChange("traffic_manager")}
                  className="cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Gestor de Tráfego
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isUpdating || member.profile.user_type === "owner"}
                  onClick={() => onUserTypeChange("owner")}
                  className="cursor-pointer"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Owner
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Remove Member */}
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={isUpdating}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover membro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover Membro</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja remover <strong>{member.profile.full_name}</strong> da organização?
              O membro perderá acesso a todos os dados e funcionalidades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isUpdating}
            >
              {isUpdating ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
