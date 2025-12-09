import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useBulkUpdateLeads, type BulkLeadUpdate } from "@/hooks/useBulkLeadsActions";
import { Badge } from "@/components/ui/badge";

const statusOptions = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" },
  { value: "follow_up", label: "Follow Up" },
  { value: "aguardando_resposta", label: "Aguardando Resposta" },
];

const priorityOptions = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  selectedCount: number;
}

export function BulkEditModal({
  open,
  onOpenChange,
  selectedLeadIds,
  selectedCount,
}: BulkEditModalProps) {
  const [updates, setUpdates] = useState<Partial<BulkLeadUpdate>>({});
  const { data: assignableUsers } = useAssignableUsers();
  const { hasActiveConnection } = useMetaConnectionStatus();
  const { data: campaigns } = useAdCampaigns(undefined, { enabled: hasActiveConnection });
  const bulkUpdate = useBulkUpdateLeads();

  const handleFieldChange = <K extends keyof BulkLeadUpdate>(
    field: K,
    value: BulkLeadUpdate[K] | "clear"
  ) => {
    if (value === "clear" || value === null || value === "") {
      const newUpdates = { ...updates };
      delete newUpdates[field];
      setUpdates(newUpdates);
    } else {
      setUpdates((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(updates).length === 0) {
      return;
    }

    try {
      await bulkUpdate.mutateAsync({
        leadIds: selectedLeadIds,
        updates,
      });
      setUpdates({});
      onOpenChange(false);
    } catch (error) {
      // Error já é tratado no hook
    }
  };

  const hasChanges = Object.keys(updates).length > 0;
  const selectedAssigneeName = updates.assignee_id
    ? assignableUsers?.find((u) => u.id === updates.assignee_id)?.full_name
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {selectedCount} Lead(s)</DialogTitle>
          <DialogDescription>
            Selecione os campos que deseja atualizar. Campos não alterados permanecerão como estão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Status</Label>
              {updates.status && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFieldChange("status", "clear")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <Select
              value={updates.status || "none"}
              onValueChange={(value) =>
                handleFieldChange("status", value === "none" ? "clear" : (value as any))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter status atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manter status atual</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prioridade</Label>
              {updates.priority && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFieldChange("priority", "clear")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <Select
              value={updates.priority || "none"}
              onValueChange={(value) =>
                handleFieldChange("priority", value === "none" ? "clear" : (value as any))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter prioridade atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manter prioridade atual</SelectItem>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Responsável</Label>
              {updates.assignee_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFieldChange("assignee_id", "clear")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <Select
              value={updates.assignee_id || "none"}
              onValueChange={(value) =>
                handleFieldChange("assignee_id", value === "none" ? "clear" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter responsável atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manter responsável atual</SelectItem>
                {assignableUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAssigneeName && updates.assignee_id && (
              <p className="text-xs text-muted-foreground">
                Será atualizado para: {selectedAssigneeName}
              </p>
            )}
          </div>

          {/* Campanha (apenas se Meta Ads conectado) */}
          {hasActiveConnection && campaigns && campaigns.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Campanha</Label>
                {updates.campaign_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFieldChange("campaign_id", "clear")}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
              <Select
                value={updates.campaign_id || "none"}
                onValueChange={(value) =>
                  handleFieldChange("campaign_id", value === "none" ? "clear" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Manter campanha atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manter campanha atual</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Data de Vencimento</Label>
              {updates.due_date && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFieldChange("due_date", "clear")}
                  className="h-6 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !updates.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {updates.due_date ? (
                    format(new Date(updates.due_date), "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Manter data atual</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={updates.due_date ? new Date(updates.due_date) : undefined}
                  onSelect={(date) =>
                    handleFieldChange(
                      "due_date",
                      date ? date.toISOString().split("T")[0] : "clear"
                    )
                  }
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview das Alterações */}
          {hasChanges && (
            <div className="pt-4 border-t space-y-2">
              <Label className="text-sm font-semibold">Alterações a serem aplicadas:</Label>
              <div className="flex flex-wrap gap-2">
                {updates.status && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {statusOptions.find((s) => s.value === updates.status)?.label}
                  </Badge>
                )}
                {updates.priority && (
                  <Badge variant="secondary" className="text-xs">
                    Prioridade: {priorityOptions.find((p) => p.value === updates.priority)?.label}
                  </Badge>
                )}
                {updates.assignee_id && selectedAssigneeName && (
                  <Badge variant="secondary" className="text-xs">
                    Responsável: {selectedAssigneeName}
                  </Badge>
                )}
                {updates.campaign_id && (
                  <Badge variant="secondary" className="text-xs">
                    Campanha: {campaigns?.find((c) => c.id === updates.campaign_id)?.name}
                  </Badge>
                )}
                {updates.due_date && (
                  <Badge variant="secondary" className="text-xs">
                    Vencimento: {format(new Date(updates.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending ? "Aplicando..." : `Aplicar em ${selectedCount} lead(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

