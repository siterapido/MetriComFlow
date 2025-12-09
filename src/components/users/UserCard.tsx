import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { MoreVertical, Edit, Trash2, Shield, BarChart3, ShoppingCart, Users } from "lucide-react";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";
import { useDeleteUser, type User } from "@/hooks/useUsers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  canManage: boolean;
  currentUserId?: string;
}

export function UserCard({ user, onEdit, canManage, currentUserId }: UserCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteUser = useDeleteUser();

  const isCurrentUser = currentUserId === user.id;

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case "owner":
        return <Shield className="h-4 w-4" />;
      case "traffic_manager":
        return <BarChart3 className="h-4 w-4" />;
      case "sales":
        return <ShoppingCart className="h-4 w-4" />;
      case "crm_user":
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case "owner":
        return "bg-gradient-to-br from-primary to-secondary text-white";
      case "traffic_manager":
        return "bg-gradient-to-br from-blue-500 to-cyan-500 text-white";
      case "sales":
        return "bg-gradient-to-br from-green-500 to-emerald-500 text-white";
      case "crm_user":
        return "bg-gradient-to-br from-purple-500 to-pink-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="bg-card border-border hover-lift transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {user.full_name}
                  </h3>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">
                      Você
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{user.email}</p>

                {/* User Type Badge */}
                <Badge className={`${getUserTypeBadgeColor(user.user_type)} gap-1.5`}>
                  {getUserTypeIcon(user.user_type)}
                  {USER_TYPE_LABELS[user.user_type]}
                </Badge>

                {/* Created Date */}
                <p className="text-xs text-muted-foreground mt-2">
                  Criado em {format(new Date(user.created_at || Date.now()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Actions Menu */}
            {canManage && !isCurrentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuItem
                    onClick={() => onEdit(user)}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Desativar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Desativar Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja desativar o usuário <strong>{user.full_name}</strong>?
              Esta ação irá remover o acesso do usuário ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Desativando..." : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
