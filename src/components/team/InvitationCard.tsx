import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreVertical, Mail, RefreshCw, X, Clock, Crown, Shield, Users, UserCog } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TeamInvitation } from "@/hooks/useInvitations";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";

interface InvitationCardProps {
  invitation: TeamInvitation;
  onResend: () => void;
  onRevoke: () => void;
  isProcessing: boolean;
}

export function InvitationCard({ invitation, onResend, onRevoke, isProcessing }: InvitationCardProps) {
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeConfig = (role: TeamInvitation["role"]) => {
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

  const roleBadge = getRoleBadgeConfig(invitation.role);
  const RoleIcon = roleBadge.icon;

  const isExpired = new Date(invitation.expires_at) < new Date();
  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
    locale: ptBR,
    addSuffix: true,
  });

  return (
    <Card className="bg-card border-border hover-lift transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Avatar and Main Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar className="h-14 w-14 ring-2 ring-warning/30 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-warning/20 to-warning/40 text-warning font-semibold text-lg">
                <Mail className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Email */}
              <h3 className="text-lg font-semibold text-foreground truncate mb-1">{invitation.email}</h3>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${isExpired ? "border-destructive text-destructive" : "border-warning text-warning"}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {isExpired ? "Expirado" : "Pendente"}
                </Badge>
              </div>

              {/* Role and User Type Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={`${roleBadge.className} gap-1.5`}>
                  <RoleIcon className="h-3 w-3" />
                  {roleBadge.label}
                </Badge>
                <Badge className={`${getUserTypeBadgeColor(invitation.user_type)} gap-1.5`}>
                  {USER_TYPE_LABELS[invitation.user_type]}
                </Badge>
              </div>

              {/* Timestamps */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Enviado em{" "}
                  {format(new Date(invitation.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isExpired ? (
                    <span className="text-destructive font-medium">Expirou {expiresIn}</span>
                  ) : (
                    <span>Expira {expiresIn}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isProcessing}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuItem onClick={onResend} className="cursor-pointer" disabled={isProcessing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reenviar convite
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRevoke}
                className="cursor-pointer text-destructive focus:text-destructive"
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Revogar convite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
