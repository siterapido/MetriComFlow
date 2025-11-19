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
import { CalendarIcon, X, Loader2, Facebook, Trash2, MessageCircle, Phone, Mail, MessageSquare, ArrowRightLeft, User as UserIcon, DollarSign, Clock, AlertCircle, Plus } from "lucide-react";
import { format, formatDistanceToNowStrict, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateLead, useDeleteLead, useLeadActivity } from "@/hooks/useLeads";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useInteractions } from "@/hooks/useInteractions";
import { Checkbox } from "@/components/ui/checkbox";
import { useLabels, useAddLabelToLead, useRemoveLabelFromLead, useCreateLabel } from "@/hooks/useLabels";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useToast } from "@/hooks/use-toast";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useUserPermissions, USER_TYPE_LABELS } from "@/hooks/useUserPermissions";
import type { Tables } from "@/lib/database.types";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
  phone?: string | null;
  email?: string | null;
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
  const createLabel = useCreateLabel();
  const { data: campaigns } = useAdCampaigns();
  const { data: assignableUsers } = useAssignableUsers();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: permissions } = useUserPermissions();

  // Resolve phone for WhatsApp CTA in footer
  const resolvedPhone: string | null = (() => {
    const p = (lead as any).phone as string | undefined;
    const extractPhone = (text?: string | null) => {
      if (!text) return null;
      const match = (text.match(/\d[\d\s().-]{8,}\d/g) || [])
        .map((m) => m.replace(/\D/g, ""))
        .find((n) => n.length >= 10 && n.length <= 13);
      return match || null;
    };
    const fromDesc = extractPhone(lead.description);
    return p || fromDesc || null;
  })();
  const whatsappHref = resolvedPhone
    ? `https://wa.me/${String(resolvedPhone).replace(/\D/g, "").replace(/^((?!55).*)$/, "55$1")}`
    : null;

  const [formData, setFormData] = useState({
    title: lead.title,
    description: lead.description || "",
    selectedLabels: lead.lead_labels?.map((l) => l.labels.id) || [],
    dueDate: lead.due_date ? new Date(lead.due_date) : undefined,
    followUpDate: lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined,
    followUpNote: "",
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
  const [newLabelName, setNewLabelName] = useState("");

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
        assignableUsers?.find((user) => user.id === formData.assigneeId)?.full_name ?? null;

      // Update lead
      const updated = await updateLead.mutateAsync({
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
          next_follow_up_date: formData.followUpDate?.toISOString().split("T")[0] || null,
          assignee_id: formData.assigneeId || null,
          assignee_name: selectedAssigneeName,
          source: formData.source,
          // Nunca envie string vazia para UUIDs; use null quando não selecionado
          campaign_id: formData.source === "meta_ads" ? (formData.campaign_id ?? null) : null,
        },
      });

      // Se houver próximo contato e observação, criar comentário vinculado
      if (formData.followUpDate && formData.followUpNote.trim()) {
        const displayName = (user?.user_metadata as any)?.full_name || user?.email || "Usuário";
        const when = format(formData.followUpDate, "dd/MM/yyyy", { locale: ptBR });
        const content = `Próximo contato (${when}): ${formData.followUpNote.trim()}`;
        const { error: cmtError } = await supabase
          .from("comments")
          .insert({
            lead_id: lead.id,
            content,
            user_name: displayName,
            user_id: user?.id ?? null,
          });
        if (!cmtError) {
          queryClient.invalidateQueries({ queryKey: ["lead-comments", lead.id] });
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      }

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
      const anyErr = error as any;
      const description =
        anyErr?.message || anyErr?.error?.message || anyErr?.data?.message || (anyErr?.code ? `Código: ${anyErr.code}` : "Ocorreu um erro desconhecido");
      toast({
        title: "Erro ao atualizar lead",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRestrictionMessage = "Somente proprietários e administradores podem excluir leads.";
  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast({
        title: "Lead excluído",
        description: "O lead foi removido com sucesso.",
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao excluir lead",
        description: "Não foi possível remover o lead.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDeleteDialog = () => {
    if (permissions?.canDeleteLeads === false) {
      toast({
        title: "Permissão insuficiente",
        description: deleteRestrictionMessage,
        variant: "destructive",
      });
      return;
    }

    setShowDeleteConfirm(true);
  };

  const toggleLabel = (labelId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedLabels: prev.selectedLabels.includes(labelId)
        ? prev.selectedLabels.filter((id) => id !== labelId)
        : [...prev.selectedLabels, labelId],
    }));
  };

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name) {
      toast({ title: "Nome obrigatório", description: "Digite o nome da etiqueta.", variant: "destructive" });
      return;
    }
    const exists = (labels || []).find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setFormData((prev) => ({ ...prev, selectedLabels: prev.selectedLabels.includes(exists.id) ? prev.selectedLabels : [...prev.selectedLabels, exists.id] }));
      toast({ title: "Etiqueta existente", description: "A etiqueta já existia e foi selecionada." });
      setNewLabelName("");
      return;
    }
    try {
      const created = await createLabel.mutateAsync({ name } as any);
      if (created?.id) {
        setFormData((prev) => ({ ...prev, selectedLabels: [...prev.selectedLabels, created.id] }));
      }
      toast({ title: "Etiqueta criada", description: "A etiqueta foi criada e selecionada." });
      setNewLabelName("");
    } catch (error: any) {
      const description = error?.message || "Não foi possível criar a etiqueta";
      toast({ title: "Erro", description, variant: "destructive" });
    }
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
        <DialogContent className="sm:max-w-[780px] max-h-[85vh] bg-card border-border flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
          <DialogHeader>
            <div>
              <DialogTitle className="text-foreground">Detalhes do Lead</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Visualize e atualize as informações do lead
              </DialogDescription>
            </div>
          </DialogHeader>

          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="comentarios_followup">Comentários / Follow-up</TabsTrigger>
              <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome (Título) */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">
                    Nome do Lead *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-input border-border"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Contatos (somente exibição) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 rounded border border-border/60 p-3">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">E-mail</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {(() => {
                        const extractEmail = (text?: string | null) => {
                          if (!text) return null;
                          const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
                          return m ? m[0] : null;
                        };
                        const email = (lead as any).email || extractEmail(lead.description);
                        return email ? (
                          <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                            {email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="space-y-1 rounded border border-border/60 p-3">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">Telefone</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {(() => {
                        const extractPhone = (text?: string | null) => {
                          if (!text) return null;
                          const match = (text.match(/\d[\d\s().-]{8,}\d/g) || [])
                            .map((m) => m.replace(/\D/g, ""))
                            .find((n) => n.length >= 10 && n.length <= 13);
                          return match || null;
                        };
                        const phone = (lead as any).phone || extractPhone(lead.description);
                        return phone ? <span>{phone}</span> : <span className="text-muted-foreground">—</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Origem / Campanha / Criativo */}
                <div className="rounded border border-border/60 p-3 space-y-2">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Origem e Campanha</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Origem</div>
                      <div className="font-medium">{lead.source || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Campanha</div>
                      <div className="font-medium" title={lead.ad_campaigns?.name || undefined}>
                        {lead.ad_campaigns?.name || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Criativo</div>
                      <div className="font-medium" title={lead.ad_id || undefined}>{lead.ad_id || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Datas movidas para Comentários / Follow-up */}

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-input border-border min-h-[80px]"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-foreground">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                    onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers && assignableUsers.length > 0 ? (
                        assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{USER_TYPE_LABELS[user.user_type]}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum usuário disponível
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
                        variant={formData.selectedLabels.includes(label.id) ? "default" : "outline"}
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
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      placeholder="Nova etiqueta"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      disabled={isSubmitting || createLabel.isPending}
                      className="bg-input border-border"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateLabel}
                      disabled={isSubmitting || createLabel.isPending || !newLabelName.trim()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {createLabel.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Criar etiqueta
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tipo de Contrato */}
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de Contrato</Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value: "monthly" | "annual" | "one_time") => setFormData({ ...formData, contractType: value })}
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
                    Valor do Contrato {formData.contractType === "monthly" ? "(mensal)" : ""}
                  </Label>
                  <Input
                    id="contractValue"
                    value={formData.contractValue}
                    onChange={(e) => setFormData({ ...formData, contractValue: formatCurrency(e.target.value) })}
                    className="bg-input border-border"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Quantidade de Meses */}
                {formData.contractType === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="contractMonths" className="text-foreground">Quantidade de Meses</Label>
                    <Input
                      id="contractMonths"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.contractMonths}
                      onChange={(e) => setFormData({ ...formData, contractMonths: e.target.value })}
                      className="bg-input border-border"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Origem e Campanha (editar) */}
                <div className="space-y-2">
                  <Label className="text-foreground">Origem do Lead</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value: "manual" | "meta_ads") => setFormData({
                      ...formData,
                      source: value,
                      campaign_id: value === "manual" ? undefined : formData.campaign_id,
                    })}
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
                      onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
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

            {/* Comentários / Follow-up */}
            <TabsContent value="comentarios_followup" className="space-y-6 mt-4">
              {/* Resumo do follow-up */}
              {(() => {
                const d = formData.followUpDate || (lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined);
                if (!d) {
                  return (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" /> Nenhum follow-up agendado.
                    </div>
                  );
                }
                const isOverdue = isPast(new Date(d.toDateString())) && !isToday(d);
                const isTodayFlag = isToday(d);
                const tone = isOverdue ? 'text-destructive border-destructive/40 bg-destructive/10' : isTodayFlag ? 'text-amber-600 border-amber-300 bg-amber-50/10' : 'text-blue-600 border-blue-300 bg-blue-50/10';
                return (
                  <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${tone}`}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Próximo follow-up:</span>
                      <span>{format(d, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      <span className="text-xs text-muted-foreground">({formatDistanceToNowStrict(d, { locale: ptBR, addSuffix: true })})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={async () => {
                          try {
                            await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: null } });
                            setFormData({ ...formData, followUpDate: undefined });
                          } catch {
                            // no-op
                          }
                        }}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                );
              })()}
              {/* Próximo contato + observação + data de entrega */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Próximo contato</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-input border-border",
                          !formData.followUpDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.followUpDate ? (
                          format(formData.followUpDate, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border">
                      <Calendar
                        mode="single"
                        selected={formData.followUpDate}
                        onSelect={async (date) => {
                          setFormData({ ...formData, followUpDate: date || undefined });
                          if (date) {
                            try {
                              await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                            } catch {
                              // no-op
                            }
                          }
                        }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Observação do próximo contato</Label>
                    <Textarea
                      value={formData.followUpNote}
                      onChange={(e) => setFormData({ ...formData, followUpNote: e.target.value })}
                      placeholder="Ex.: confirmar proposta, pedir documentos, etc."
                      className="bg-input border-border min-h-[70px]"
                    />
                  </div>
                </div>
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
                        onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Ações rápidas de follow-up */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Agendar rápido:</span>
                {[
                  { label: 'Hoje', days: 0 },
                  { label: 'Amanhã', days: 1 },
                  { label: '+2d', days: 2 },
                  { label: 'Próx. Semana', days: 7 },
                  { label: '+30d', days: 30 },
                ].map((opt) => (
                  <Button
                    key={opt.label}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={async () => {
                      const d = new Date();
                      d.setDate(d.getDate() + opt.days);
                      const iso = d.toISOString().split('T')[0];
                      setFormData({ ...formData, followUpDate: d });
                      try {
                        await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: iso } });
                        toast({ title: 'Follow-up agendado', description: `${opt.label} (${format(d, 'dd/MM/yyyy', { locale: ptBR })})` });
                      } catch (e) {
                        // ignore, toast in mutation handles
                      }
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
                <div className="ml-auto" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7"
                  onClick={async () => {
                    try {
                      await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: null } });
                      setFormData({ ...formData, followUpDate: undefined, followUpNote: '' });
                      const displayName = (user?.user_metadata as any)?.full_name || user?.email || 'Usuário';
                      await supabase.from('comments').insert({ lead_id: lead.id, content: 'Follow-up concluído', user_name: displayName, user_id: user?.id ?? null });
                      toast({ title: 'Follow-up marcado como feito' });
                    } catch (e) {
                      // handled by hooks
                    }
                  }}
                >
                  Marcar como feito
                </Button>
              </div>

              {/* Comentários */}
              <CommentsSection leadId={lead.id} currentUserId={user?.id || undefined} nextFollowUpDate={formData.followUpDate || (lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined)} />
            </TabsContent>

            {/* Linha do Tempo */}
            <TabsContent value="timeline" className="space-y-6 mt-4">
              <FollowupTimeline lead={lead} followUpDate={formData.followUpDate} dueDate={formData.dueDate} />
            </TabsContent>

            
          </Tabs>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 bg-card/95 backdrop-blur border-t border-border py-3 z-10">
            {/* CTA WhatsApp no rodapé */}
            <div className="mr-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Contato rápido:</span>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-300 px-3 py-2 text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  title="Falar pelo WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">sem telefone detectado</span>
              )}
            </div>
            <div className="mr-auto flex flex-col gap-1">
              <Button
                type="button"
                variant="destructive"
                onClick={handleOpenDeleteDialog}
                disabled={
                  isSubmitting ||
                  (permissions ? !permissions.canDeleteLeads : false)
                }
                title={
                  permissions && !permissions.canDeleteLeads
                    ? deleteRestrictionMessage
                    : undefined
                }
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              {permissions && !permissions.canDeleteLeads && (
                <span className="text-[11px] text-muted-foreground">
                  {deleteRestrictionMessage}
                </span>
              )}
            </div>
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
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!permissions?.canDeleteLeads}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommentsSection({ leadId, currentUserId, nextFollowUpDate }: { leadId: string; currentUserId?: string; nextFollowUpDate?: Date }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [linkToFollowup, setLinkToFollowup] = useState<boolean>(!!nextFollowUpDate);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["lead-comments", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_name, user_id")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const displayName = (user?.user_metadata as any)?.full_name || user?.email || "Usuário";
      const payload = linkToFollowup && nextFollowUpDate
        ? `Follow-up (${format(nextFollowUpDate, 'dd/MM/yyyy', { locale: ptBR })}): ${text}`
        : text;
      const { error } = await supabase
        .from("comments")
        .insert({
          lead_id: leadId,
          content: payload,
          user_name: displayName,
          user_id: user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["lead-comments", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-comments", leadId] });
    }
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-foreground">Novo comentário</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox id="link-followup" checked={linkToFollowup} onCheckedChange={(val) => setLinkToFollowup(Boolean(val))} />
          <label htmlFor="link-followup" className="cursor-pointer">
            Vincular ao próximo follow-up {nextFollowUpDate ? `( ${format(nextFollowUpDate, 'dd/MM/yyyy', { locale: ptBR })} )` : '(nenhum definido)'}
          </label>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="bg-input border-border min-h-[90px]"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && content.trim()) {
              e.preventDefault();
              addComment.mutate(content.trim());
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => content.trim() && addComment.mutate(content.trim())}
            disabled={addComment.isLoading || !content.trim()}
          >
            {addComment.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              "Adicionar comentário"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando comentários...</div>
        ) : comments && comments.length > 0 ? (
          comments.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border/60 p-3 bg-card/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                    {(c.user_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm font-medium">{c.user_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                  </div>
                  {currentUserId && c.user_id === currentUserId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate(c.id)}
                      title="Excluir comentário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.content}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Sem comentários ainda.</div>
        )}
      </div>
    </div>
  );
}

function FollowupTimeline({ lead, followUpDate, dueDate }: { lead: any; followUpDate?: Date; dueDate?: Date }) {
  const { data: comments } = useQuery({
    queryKey: ["lead-comments", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_name")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: activities } = useLeadActivity(lead.id);
  const { data: interactions } = useInteractions(lead.id);

  type TimelineItem = { date: Date; title: string; subtitle?: string; kind: string };
  const items: TimelineItem[] = [];

  if (lead.created_at) items.push({ date: new Date(lead.created_at), title: "Lead criado", kind: "created" });
  const fu = followUpDate || (lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined);
  if (fu) items.push({ date: fu, title: "Próximo contato", kind: "follow_up" });
  const du = dueDate || (lead.due_date ? new Date(lead.due_date) : undefined);
  if (du) items.push({ date: du, title: "Data de entrega", kind: "due_date" });

  (comments || []).forEach((c: any) => {
    if (!c.created_at) return;
    items.push({ date: new Date(c.created_at), title: `Comentário — ${c.user_name || "Usuário"}`, subtitle: c.content, kind: "comment" });
  });
  (activities || []).forEach((a: any) => {
    if (!a.created_at) return;
    const label = a.action_type === 'status_change'
      ? `Mudança de etapa: ${a.from_status || '—'} → ${a.to_status || '—'}`
      : a.action_type === 'assignment'
      ? `Responsável: ${a.description || ''}`
      : a.action_type === 'value_update'
      ? `Atualização de valor`
      : a.description || a.action_type;
    items.push({ date: new Date(a.created_at), title: label, kind: a.action_type || "activity" });
  });
  (interactions || []).forEach((it: any) => {
    const when = it.interaction_date || it.created_at;
    if (!when) return;
    const type = it.interaction_type || 'interação';
    const who = it.created_by_profile?.full_name || it.created_by_profile?.email || '';
    const title = `${type} ${who ? `— ${who}` : ''}`;
    const subtitle = [it.outcome, it.description || it.notes].filter(Boolean).join(' • ');
    items.push({ date: new Date(when), title, subtitle, kind: 'interaction' });
  });

  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const iconFor = (kind: string) => {
    switch (kind) {
      case 'status_change':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'assignment':
        return <UserIcon className="h-4 w-4" />;
      case 'value_update':
        return <DollarSign className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'interaction':
        return <MessageCircle className="h-4 w-4" />;
      case 'follow_up':
        return <Clock className="h-4 w-4" />;
      case 'due_date':
        return <CalendarIcon className="h-4 w-4" />;
      case 'created':
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const styleFor = (kind: string) => {
    switch (kind) {
      case 'status_change':
        return { ring: 'ring-blue-400/40', icon: 'text-blue-500' };
      case 'assignment':
        return { ring: 'ring-purple-400/40', icon: 'text-purple-500' };
      case 'value_update':
        return { ring: 'ring-amber-400/40', icon: 'text-amber-500' };
      case 'comment':
        return { ring: 'ring-slate-400/40', icon: 'text-slate-500' };
      case 'interaction':
        return { ring: 'ring-emerald-400/40', icon: 'text-emerald-500' };
      case 'follow_up':
        return { ring: 'ring-cyan-400/40', icon: 'text-cyan-500' };
      case 'due_date':
        return { ring: 'ring-zinc-400/40', icon: 'text-zinc-500' };
      case 'created':
      default:
        return { ring: 'ring-gray-400/40', icon: 'text-gray-500' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-foreground">Linha do tempo</div>
      <ul className="relative pl-8 space-y-6 before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-border/60">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">Sem eventos ainda.</li>
        ) : (
          items.map((it, idx) => (
            <li key={idx} className="relative">
              {/* ponto da trilha */}
              <span className="absolute left-4 top-3 h-2 w-2 rounded-full bg-border" />
              <div className="ml-2 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const s = styleFor(it.kind);
                      return <span className={s.icon}>{iconFor(it.kind)}</span>;
                    })()}
                    <span className="text-muted-foreground">—</span>
                    <span className="text-sm font-medium text-foreground leading-snug">{it.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{format(it.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                </div>
                {it.subtitle && (
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{it.subtitle}</div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
