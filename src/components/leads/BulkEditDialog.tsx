import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useBulkUpdateLeads } from "@/hooks/useLeads";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";

interface BulkEditDialogProps {
    selectedIds: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const statusOptions = [
    { value: "novo_lead", label: "Novo Lead" },
    { value: "qualificacao", label: "Qualificação" },
    { value: "reuniao", label: "Reunião" },
    { value: "proposta", label: "Proposta" },
    { value: "negociacao", label: "Negociação" },
    { value: "fechado_ganho", label: "Fechado - Ganho" },
    { value: "fechado_perdido", label: "Fechado - Perdido" },
];

export function BulkEditDialog({ selectedIds, open, onOpenChange, onSuccess }: BulkEditDialogProps) {
    const bulkUpdate = useBulkUpdateLeads();
    const { data: assignableUsers } = useAssignableUsers();

    const [fieldToUpdate, setFieldToUpdate] = useState<"status" | "assignee" | "">("");
    const [newValue, setNewValue] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldToUpdate || !newValue) return;

        setIsSubmitting(true);
        try {
            const updates: any = {};

            if (fieldToUpdate === "status") {
                updates.status = newValue;
            } else if (fieldToUpdate === "assignee") {
                updates.assignee_id = newValue === "none" ? null : newValue;
                if (newValue !== "none") {
                    const user = assignableUsers?.find(u => u.id === newValue);
                    if (user) {
                        updates.assignee_name = user.full_name;
                    }
                } else {
                    updates.assignee_name = null;
                }
            }

            await bulkUpdate.mutateAsync({ leadIds: selectedIds, updates });

            onOpenChange(false);
            onSuccess?.();
            setFieldToUpdate("");
            setNewValue("");
        } catch (error) {
            console.error("Error bulk updating leads:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edição em Massa ({selectedIds.length} leads)</DialogTitle>
                    <DialogDescription>
                        Selecione o campo que deseja atualizar para todos os leads selecionados.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Campo para atualizar</Label>
                        <Select
                            value={fieldToUpdate}
                            onValueChange={(val: any) => {
                                setFieldToUpdate(val);
                                setNewValue("");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um campo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Status (Etapa)</SelectItem>
                                <SelectItem value="assignee">Responsável</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {fieldToUpdate === "status" && (
                        <div className="space-y-2">
                            <Label>Novo Status</Label>
                            <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {fieldToUpdate === "assignee" && (
                        <div className="space-y-2">
                            <Label>Novo Responsável</Label>
                            <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" className="text-muted-foreground">
                                        Remover responsável
                                    </SelectItem>
                                    {assignableUsers?.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <div className="flex flex-col text-left">
                                                <span>{user.full_name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {USER_TYPE_LABELS[user.user_type]}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!fieldToUpdate || !newValue || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                "Atualizar Leads"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
