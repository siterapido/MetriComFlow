import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Info } from "lucide-react";
import { useLeads, useBulkUpdateLeads } from "@/hooks/useLeads";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface LeadDistributionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function LeadDistributionModal({
    open,
    onOpenChange,
    onSuccess,
}: LeadDistributionModalProps) {
    const [quantityPerUser, setQuantityPerUser] = useState<number>(30);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const { data: assignableUsers } = useAssignableUsers();

    // We fetch unassigned leads to know how many are available
    const { data: unassignedLeads, isLoading: isLoadingLeads } = useLeads({
        unassignedOnly: true,
    });

    const bulkUpdate = useBulkUpdateLeads();

    const totalRequired = quantityPerUser * selectedUserIds.size;
    const availableCount = unassignedLeads?.length || 0;
    const canDistribute = totalRequired > 0 && totalRequired <= availableCount;

    const handleToggleUser = (userId: string) => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleDistribute = async () => {
        if (!canDistribute || !unassignedLeads) return;

        setIsSubmitting(true);
        try {
            const usersToDistribute = Array.from(selectedUserIds).map(id =>
                assignableUsers?.find(u => u.id === id)
            ).filter(Boolean);

            // Process each user sequentially to avoid conflicts
            let currentIdx = 0;
            for (const user of usersToDistribute) {
                if (!user) continue;
                const userLeads = unassignedLeads.slice(currentIdx, currentIdx + quantityPerUser);
                currentIdx += quantityPerUser;

                if (userLeads.length > 0) {
                    try {
                        await bulkUpdate.mutateAsync({
                            leadIds: userLeads.map(l => l.id),
                            updates: {
                                assignee_id: user.id,
                                assignee_name: user.full_name,
                            }
                        });
                    } catch (error) {
                        console.error(`Error assigning leads to ${user.full_name}:`, error);
                        throw new Error(`Falha ao distribuir leads para ${user.full_name}`);
                    }
                }
            }

            onSuccess?.();
            onOpenChange(false);
            // Reset state
            setSelectedUserIds(new Set());
        } catch (error) {
            console.error("Error distributing leads:", error);
            toast({
                title: "Erro na distribuição",
                description: error instanceof Error ? error.message : "Não foi possível distribuir os leads.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Distribuição Automática de Leads
                    </DialogTitle>
                    <DialogDescription>
                        Distribua leads que não possuem responsável entre os membros da equipe.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantidade de leads por usuário</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                value={quantityPerUser}
                                onChange={(e) => setQuantityPerUser(parseInt(e.target.value) || 0)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                Total a distribuir: <span className="font-bold text-foreground">{totalRequired}</span>
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Selecionar Usuários ({selectedUserIds.size})</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] uppercase font-bold text-primary"
                                onClick={() => {
                                    if (selectedUserIds.size === assignableUsers?.length) {
                                        setSelectedUserIds(new Set());
                                    } else {
                                        setSelectedUserIds(new Set(assignableUsers?.map(u => u.id)));
                                    }
                                }}
                            >
                                {selectedUserIds.size === assignableUsers?.length ? "Desmarcar Todos" : "Selecionar Todos"}
                            </Button>
                        </div>
                        <ScrollArea className="h-[200px] border rounded-md p-2">
                            <div className="space-y-2">
                                {assignableUsers?.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                                        onClick={() => handleToggleUser(user.id)}
                                    >
                                        <Checkbox
                                            id={`user-${user.id}`}
                                            checked={selectedUserIds.has(user.id)}
                                            onCheckedChange={() => handleToggleUser(user.id)}
                                        />
                                        <div className="flex flex-col flex-1">
                                            <span className="text-sm font-medium">{user.full_name}</span>
                                            <span className="text-[10px] text-muted-foreground lowercase">
                                                {user.email} • {USER_TYPE_LABELS[user.user_type as keyof typeof USER_TYPE_LABELS] || user.user_type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <Alert variant={canDistribute ? "default" : "destructive"} className="bg-muted/30 border-none">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            {isLoadingLeads ? (
                                "Calculando leads disponíveis..."
                            ) : (
                                <>
                                    Existem <span className="font-bold">{availableCount}</span> leads sem responsável disponíveis.
                                    {!canDistribute && totalRequired > 0 && (
                                        <p className="mt-1 font-semibold">
                                            Quantidade insuficiente de leads para a distribuição solicitada.
                                        </p>
                                    )}
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDistribute}
                        disabled={!canDistribute || isSubmitting || selectedUserIds.size === 0}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Distribuindo...
                            </>
                        ) : (
                            "Confirmar Distribuição"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
