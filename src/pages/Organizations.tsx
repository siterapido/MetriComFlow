import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Building2,
    Plus,
    Search,
    MoreVertical,
    Pencil,
    Trash2,
    Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useOrganizations, Organization } from "@/hooks/useOrganizations";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Navigate } from "react-router-dom";

export default function Organizations() {
    const { data: permissions, isLoading: isLoadingPermissions } = useUserPermissions();
    const {
        organizations,
        isLoading: isLoadingOrgs,
        createOrganization,
        updateOrganization,
        deleteOrganization
    } = useOrganizations();

    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
    const [name, setName] = useState("");

    const filteredOrgs = organizations?.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await createOrganization.mutateAsync({ name });
            setIsCreateOpen(false);
            setName("");
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOrg || !name.trim()) return;
        try {
            await updateOrganization.mutateAsync({ id: editingOrg.id, name });
            setEditingOrg(null);
            setName("");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!deletingOrg) return;
        try {
            await deleteOrganization.mutateAsync(deletingOrg.id);
            setDeletingOrg(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Double check protection, although route should also handle it
    if (!permissions?.isSuperAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted/50 border border-border/50 p-8">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 bg-secondary/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between z-10">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">Organizações</h1>
                            <p className="text-muted-foreground text-lg">
                                Gerencie todas as organizações cadastradas no sistema.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-11 px-6 rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Organização
                    </Button>
                </div>
            </div>

            {/* Content */}
            <Card className="border-none shadow-none bg-transparent">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar organização..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-card border-border rounded-xl h-10"
                        />
                    </div>
                </div>

                {isLoadingOrgs ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredOrgs.length === 0 ? (
                    <Card className="bg-card/50 border-dashed border-2 p-12">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Nenhuma organização encontrada</h3>
                                <p className="text-muted-foreground">
                                    {search ? "Tente buscar com outro termo." : "Crie uma nova organização para começar."}
                                </p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredOrgs.map(org => (
                            <Card key={org.id} className="bg-card/50 border-border/50 hover:bg-card/80 transition-all hover:scale-[1.01] hover:shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-bold truncate pr-4">
                                        {org.name}
                                    </CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setEditingOrg(org);
                                                setName(org.name);
                                            }}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setDeletingOrg(org)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <p>Criado em: {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                                        <p className="font-mono text-[10px] truncate opacity-50">ID: {org.id}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Organização</DialogTitle>
                        <DialogDescription>
                            Crie uma nova organização para gerenciar em separado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Organização</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Minha Empresa Ltda"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createOrganization.isPending}>
                                {createOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Organização</DialogTitle>
                        <DialogDescription>
                            Atualize o nome da organização.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome da Organização</Label>
                                <Input
                                    id="edit-name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingOrg(null)}>Cancelar</Button>
                            <Button type="submit" disabled={updateOrganization.isPending}>
                                {updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={!!deletingOrg} onOpenChange={(open) => !open && setDeletingOrg(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a organização
                            <span className="font-bold text-foreground mx-1">{deletingOrg?.name}</span>
                            e todos os dados associados (leads, usuários, etc).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deleteOrganization.isPending}
                        >
                            Excluir Organização
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
