import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, X, Loader2, Facebook, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useLabels, useAddLabelToLead, useRemoveLabelFromLead } from "@/hooks/useLabels";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useToast } from "@/hooks/use-toast";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { Tables } from "@/lib/database.types";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
};

interface LeadEditDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" },
];

export function LeadEditDialog({ lead, open, onOpenChange }: LeadEditDialogProps) {
  const { toast } = useToast();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: labels } = useLabels();
  const addLabelToLead = useAddLabelToLead();
  const removeLabelFromLead = useRemoveLabelFromLead();
  const { data: campaigns } = useAdCampaigns();
  const { data: teamMembers } = useTeamMembers();

  const [formData, setFormData] = useState({
    title: lead.title,
    description: lead.description || "",
    selectedLabels: lead.lead_labels?.map((l) => l.labels.id) || [],
    dueDate: lead.due_date ? new Date(lead.due_date) : undefined,
    contractValue: "",
    contractType: (lead.contract_type as "monthly" | "annual" | "one_time") || "monthly",
    contractMonths: String(lead.contract_months || 1),
    assigneeId: lead.assignee_id || "",
    status: lead.status,
    source: lead.source as "manual" | "meta_ads",
    campaign_id: lead.campaign_id || undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize contract value
  useEffect(() => {
    if (lead.contract_value) {
      const formatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(lead.contract_value);
      setFormData((prev) => ({ ...prev, contractValue: formatted }));
    }
  }, [lead.contract_value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório!",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse contract value
      const contractValueNumber = formData.contractValue
        ? parseInt(formData.contractValue.replace(/\D/g, "")) / 100
        : 0;

      const selectedAssigneeName =
        teamMembers?.find((m) => m.id === formData.assigneeId)?.name ?? null;

      // Update lead
      await updateLead.mutateAsync({
        id: lead.id,
        updates: {
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          contract_value: contractValueNumber,
          contract_type: formData.contractType,
          contract_months:
            formData.contractType === "monthly"
              ? parseInt(formData.contractMonths)
              : 1,
          due_date: formData.dueDate?.toISOString().split("T")[0] || null,
          assignee_id: formData.assigneeId || null,
          assignee_name: selectedAssigneeName,
          source: formData.source,
          campaign_id: formData.source === "meta_ads" ? formData.campaign_id : null,
        },
      });

      // Update labels
      const currentLabelIds = lead.lead_labels?.map((l) => l.labels.id) || [];
      const newLabelIds = formData.selectedLabels;

      // Add new labels
      const labelsToAdd = newLabelIds.filter((id) => !currentLabelIds.includes(id));
      await Promise.all(
        labelsToAdd.map((labelId) =>
          addLabelToLead.mutateAsync({ leadId: lead.id, labelId })
        )
      );

      // Remove old labels
      const labelsToRemove = currentLabelIds.filter((id) => !newLabelIds.includes(id));
      await Promise.all(
        labelsToRemove.map((labelId) =>
          removeLabelFromLead.mutateAsync({ leadId: lead.id, labelId })
        )
      );

      toast({
        title: "Lead atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao atualizar lead",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast({
        title: "Lead excluído",
        description: "O lead foi removido com sucesso.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao excluir lead",
        description: "Não foi possível remover o lead.",
        variant: "destructive",
      });
    }
  };

  const toggleLabel = (labelId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedLabels: prev.selectedLabels.includes(labelId)
        ? prev.selectedLabels.filter((id) => id !== labelId)
        : [...prev.selectedLabels, labelId],
    }));
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const amount = parseInt(numbers) || 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount / 100);
  };

  const getLabelColor = (name: string) => {
    const colors: { [key: string]: string } = {
      Urgente: "bg-red-500 hover:bg-red-600",
      Comercial: "bg-blue-500 hover:bg-blue-600",
      Reunião: "bg-purple-500 hover:bg-purple-600",
      Desenvolvimento: "bg-green-500 hover:bg-green-600",
      "Alta Prioridade": "bg-orange-500 hover:bg-orange-600",
      "Baixa Prioridade": "bg-gray-500 hover:bg-gray-600",
      Proposta: "bg-indigo-500 hover:bg-indigo-600",
      Negociação: "bg-pink-500 hover:bg-pink-600",
      Contrato: "bg-emerald-500 hover:bg-emerald-600",
    };
    return colors[name] || "bg-primary hover:bg-primary/90";
  };

  return (
    <>
      <Dialog open={open && !showDeleteConfirm} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Lead</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Atualize as informações do lead
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="advanced">Detalhes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">
                    Título *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="bg-input border-border"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-input border-border min-h-[80px]"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-foreground">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
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

                {/* Responsável */}
                <div className="space-y-2">
                  <Label className="text-foreground">Responsável</Label>
                  <Select
                    value={formData.assigneeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assigneeId: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers && teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum membro disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Etiquetas */}
                <div className="space-y-2">
                  <Label className="text-foreground">Etiquetas</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels?.map((label) => (
                      <Badge
                        key={label.id}
                        variant={
                          formData.selectedLabels.includes(label.id)
                            ? "default"
                            : "outline"
                        }
                        className={cn(
                          "cursor-pointer transition-colors",
                          formData.selectedLabels.includes(label.id)
                            ? getLabelColor(label.name) + " text-white"
                            : "hover:bg-accent"
                        )}
                        onClick={() => !isSubmitting && toggleLabel(label.id)}
                      >
                        {label.name}
                        {formData.selectedLabels.includes(label.id) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de Contrato */}
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de Contrato</Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value: "monthly" | "annual" | "one_time") =>
                      setFormData({ ...formData, contractType: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="one_time">Pagamento Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor do Contrato */}
                <div className="space-y-2">
                  <Label htmlFor="contractValue" className="text-foreground">
                    Valor do Contrato{" "}
                    {formData.contractType === "monthly" ? "(mensal)" : ""}
                  </Label>
                  <Input
                    id="contractValue"
                    value={formData.contractValue}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      setFormData({ ...formData, contractValue: formatted });
                    }}
                    className="bg-input border-border"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Quantidade de Meses */}
                {formData.contractType === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="contractMonths" className="text-foreground">
                      Quantidade de Meses
                    </Label>
                    <Input
                      id="contractMonths"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.contractMonths}
                      onChange={(e) =>
                        setFormData({ ...formData, contractMonths: e.target.value })
                      }
                      className="bg-input border-border"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Data de Entrega */}
                <div className="space-y-2">
                  <Label className="text-foreground">Data de Entrega</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-input border-border",
                          !formData.dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate ? (
                          format(formData.dueDate, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) =>
                          setFormData({ ...formData, dueDate: date })
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Origem e Campanha */}
                <div className="space-y-2">
                  <Label className="text-foreground">Origem do Lead</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value: "manual" | "meta_ads") =>
                      setFormData({
                        ...formData,
                        source: value,
                        campaign_id: value === "manual" ? undefined : formData.campaign_id,
                      })
                    }
                    disabled={isSubmitting || lead.source === "meta_ads"}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="meta_ads">
                        <div className="flex items-center gap-2">
                          <Facebook className="w-4 h-4" />
                          Meta Ads
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source === "meta_ads" && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Campanha Meta Ads</Label>
                    <Select
                      value={formData.campaign_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, campaign_id: value })
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Selecione a campanha" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns && campaigns.length > 0 ? (
                          campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            Nenhuma campanha disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o lead "{lead.title}"? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
