import { useState } from "react";
import { Users as UsersIcon, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCard } from "@/components/users/UserCard";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { useUsers, type User } from "@/hooks/useUsers";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/hooks/useAuth";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const { data: users, isLoading } = useUsers();
  const { data: permissions } = useUserPermissions();
  const { user: currentUser } = useAuth();

  const canManageUsers = permissions?.canManageUsers ?? false;

  // Filter users based on search query
  const filteredUsers = users?.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = () => {
    setSelectedUser(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  // Group users by type
  const usersByType = filteredUsers?.reduce((acc, user) => {
    if (!acc[user.user_type]) {
      acc[user.user_type] = [];
    }
    acc[user.user_type].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end">
        {canManageUsers && (
          <Button
            onClick={handleCreateUser}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Permission Warning */}
      {!canManageUsers && (
        <Alert className="bg-accent/20 border-border">
          <AlertDescription className="text-muted-foreground">
            Você não tem permissão para gerenciar usuários. Apenas proprietários podem criar, editar ou remover usuários.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="space-y-8">
          {/* Owners */}
          {usersByType?.owner && usersByType.owner.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">Proprietários</h2>
                <span className="text-sm text-muted-foreground">
                  ({usersByType.owner.length})
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {usersByType.owner.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={handleEditUser}
                    canManage={canManageUsers}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Traffic Managers */}
          {usersByType?.traffic_manager && usersByType.traffic_manager.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">Gestores de Tráfego</h2>
                <span className="text-sm text-muted-foreground">
                  ({usersByType.traffic_manager.length})
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {usersByType.traffic_manager.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={handleEditUser}
                    canManage={canManageUsers}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sales */}
          {usersByType?.sales && usersByType.sales.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">Vendedores</h2>
                <span className="text-sm text-muted-foreground">
                  ({usersByType.sales.length})
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {usersByType.sales.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={handleEditUser}
                    canManage={canManageUsers}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Nenhum usuário corresponde à sua pesquisa"
                : "Ainda não há usuários cadastrados"}
            </p>
            {canManageUsers && !searchQuery && (
              <Button
                onClick={handleCreateUser}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Usuário
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        mode={dialogMode}
      />
    </div>
  );
}
