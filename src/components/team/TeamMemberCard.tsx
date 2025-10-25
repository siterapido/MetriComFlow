import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ellipsis, Shield, Trash2, UserCog } from "lucide-react";
import type { TeamMember } from "@/hooks/useTeam";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";

interface TeamMemberCardProps {
  member: TeamMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onRoleChange: (role: TeamMember["role"]) => void;
  onUserTypeChange: (userType: TeamMember["profile"]["user_type"]) => void;
  onRemove: () => void;
  isUpdatingRole: boolean;
  isUpdatingUserType: boolean;
  isRemoving: boolean;
}

export function TeamMemberCard({
  member,
  isCurrentUser,
  canManage,
  onRoleChange,
  onUserTypeChange,
  onRemove,
  isUpdatingRole,
  isUpdatingUserType,
  isRemoving,
}: TeamMemberCardProps) {
  const initials = member.profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const roleLabel = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    member: "Membro",
  }[member.role];

  const userTypeLabel = USER_TYPE_LABELS[member.profile.user_type];

  const disableManagement = isCurrentUser || !canManage || member.role === "owner";

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold">{member.profile.full_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{member.profile.email}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={disableManagement}>
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Permissões</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={isUpdatingRole || disableManagement}
              onSelect={() => onRoleChange("member")}
            >
              • Membro
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdatingRole || disableManagement}
              onSelect={() => onRoleChange("manager")}
            >
              • Manager
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdatingRole || disableManagement}
              onSelect={() => onRoleChange("admin")}
            >
              • Admin
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tipo de usuário</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={isUpdatingUserType || disableManagement}
              onSelect={() => onUserTypeChange("sales")}
            >
              CRM / Vendas
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdatingUserType || disableManagement}
              onSelect={() => onUserTypeChange("traffic_manager")}
            >
              Gestor de Tráfego
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdatingUserType || disableManagement}
              onSelect={() => onUserTypeChange("owner")}
            >
              Owner
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isRemoving || disableManagement}
              className="text-destructive focus:text-destructive"
              onSelect={onRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover membro
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.profile.avatar_url ?? undefined} alt={member.profile.full_name} />
            <AvatarFallback>{initials || "MF"}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={member.role === "owner" ? "default" : "outline"}>
                <Shield className="mr-1 h-3 w-3" />
                {roleLabel}
              </Badge>
              <Badge variant="secondary">
                <UserCog className="mr-1 h-3 w-3" />
                {userTypeLabel}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Entrou em {new Date(member.joinedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-right text-xs text-muted-foreground">
          <span>
            Função atual:
            <strong className="ml-1 text-foreground">{roleLabel ?? member.role}</strong>
          </span>
          <span>
            Tipo de acesso:
            <strong className="ml-1 text-foreground">{userTypeLabel}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
