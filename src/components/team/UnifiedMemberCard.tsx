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
  Mail,
  Calendar,
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
          className: "bg-primary/20 text-primary border-primary/20",
          icon: Crown,
        };
      case "admin":
        return {
          label: "Admin",
          className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          icon: Shield,
        };
      case "manager":
        return {
          label: "Gerente",
          className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Users,
        };
      case "member":
        return {
          label: "Membro",
          className: "bg-muted text-muted-foreground border-border",
          icon: UserCog,
        };
    }
  };

  const getUserTypeBadgeConfig = (userType: string) => {
    switch (userType) {
      case "owner":
        return {
          label: "Acesso Total",
          className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          icon: Shield,
        };
      case "traffic_manager":
        return {
          label: "Tráfego",
          className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          icon: BarChart3,
        };
      case "sales":
        return {
          label: "Vendas",
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: ShoppingCart,
        };
      default:
        return {
          label: "Padrão",
          className: "bg-muted text-muted-foreground border-border",
          icon: UserCog,
        };
    }
  };

  const roleConfig = getRoleBadgeConfig(member.role);
  const userTypeConfig = getUserTypeBadgeConfig(member.profile.user_type);
  const RoleIcon = roleConfig.icon;
  const UserTypeIcon = userTypeConfig.icon;

  const disableManagement = !canManage || member.role === "owner";

  const handleDelete = () => {
    onRemove();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="bg-card/40 border-border/50 hover:bg-card/60 hover:border-primary/30 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 p-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={(isCurrentUser && member.role === "owner") || !canManage || isUpdating}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass border-border">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Privilégios</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={isUpdating || member.role === "member"}
                onClick={() => onRoleChange("member")}
              >
                <UserCog className="h-4 w-4 mr-2" /> Membro
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isUpdating || member.role === "manager"}
                onClick={() => onRoleChange("manager")}
              >
                <Users className="h-4 w-4 mr-2" /> Gerente
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isUpdating || member.role === "admin"}
                onClick={() => onRoleChange("admin")}
              >
                <Shield className="h-4 w-4 mr-2" /> Admin
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Área de Atuação</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={isUpdating || member.profile.user_type === "sales"}
                onClick={() => onUserTypeChange("sales")}
              >
                <ShoppingCart className="h-4 w-4 mr-2" /> Vendas / CRM
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isUpdating || member.profile.user_type === "traffic_manager"}
                onClick={() => onUserTypeChange("traffic_manager")}
              >
                <BarChart3 className="h-4 w-4 mr-2" /> Gestor de Tráfego
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isUpdating || member.profile.user_type === "owner"}
                onClick={() => onUserTypeChange("owner")}
              >
                <Crown className="h-4 w-4 mr-2" /> Acesso Total
              </DropdownMenuItem>

              {!isCurrentUser && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    disabled={isUpdating}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remover do Time
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                <AvatarImage src={member.profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-2xl">
                  {getInitials(member.profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-background shadow-lg ${roleConfig.className.split(' ')[0]} ${roleConfig.className.split(' ')[1]}`}>
                <RoleIcon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="space-y-1 w-full px-2">
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {member.profile.full_name}
                </h3>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-none uppercase font-bold tracking-tighter">
                    Você
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 truncate opacity-70">
                <Mail className="h-3.5 w-3.5" />
                {member.profile.email}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Badge variant="outline" className={`${roleConfig.className} px-2.5 py-0.5 text-[11px] font-medium rounded-full transition-colors`}>
                {roleConfig.label}
              </Badge>
              <Badge variant="outline" className={`${userTypeConfig.className} px-2.5 py-0.5 text-[11px] font-medium rounded-full transition-colors`}>
                {userTypeConfig.label}
              </Badge>
            </div>

            <div className="pt-4 mt-2 border-t border-border/30 w-full">
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                <Calendar className="h-3 w-3" />
                Desde {format(new Date(member.joinedAt), "PP", { locale: ptBR })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong>{member.profile.full_name}</strong>. Esta ação não pode ser desfeita e o usuário perderá acesso imediato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
