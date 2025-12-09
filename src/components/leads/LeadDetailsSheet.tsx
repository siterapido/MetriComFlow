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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  X,
  Loader2,
  Facebook,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  ArrowRightLeft,
  User as UserIcon,
  DollarSign,
  Clock,
  AlertCircle,
  Plus,
  Building2,
  MapPin,
  Briefcase,
  FileText,
  Tag
} from "lucide-react";
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
import { buildLeadTitleFromCustomFields } from "@/lib/leadUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
  phone?: string | null;
  email?: string | null;
  custom_fields?: Record<string, any> | null;
};

interface LeadDetailsSheetProps {
  lead: Lead | null;
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

export function LeadDetailsSheet({ lead, open, onOpenChange }: LeadDetailsSheetProps) {
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!lead) return null;

  // Resolve phone for WhatsApp
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
    const fromCustom = lead.custom_fields?.["Telefone Principal"] || lead.custom_fields?.phone;
    return p || fromCustom || fromDesc || null;
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

  // Estado para campos personalizados editáveis
  const [customFields, setCustomFields] = useState<Record<string, any>>(lead.custom_fields || {});

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Atualizar título quando o lead mudar (quando abrir um lead diferente)
  useEffect(() => {
    const newTitle = buildLeadTitleFromCustomFields(lead.custom_fields, lead.title);
    setFormData((prev) => ({ ...prev, title: newTitle }));
    setCustomFields(lead.custom_fields || {});
  }, [lead.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

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
      const contractValueNumber = formData.contractValue
        ? parseInt(formData.contractValue.replace(/\D/g, "")) / 100
        : 0;

      const selectedAssigneeName =
        assignableUsers?.find((user) => user.id === formData.assigneeId)?.full_name ?? null;

      // Atualizar título automaticamente se houver nome fantasia ou razão social
      const finalTitle = buildLeadTitleFromCustomFields(customFields, formData.title);

      await updateLead.mutateAsync({
        id: lead.id,
        updates: {
          title: finalTitle,
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
          campaign_id: formData.source === "meta_ads" ? (formData.campaign_id ?? null) : null,
          custom_fields: customFields,
        },
      });

      if (formData.followUpDate && formData.followUpNote.trim()) {
        const displayName = (user?.user_metadata as any)?.full_name || user?.email || "Usuário";
        const when = format(formData.followUpDate, "dd/MM/yyyy", { locale: ptBR });
        const content = `Próximo contato (${when}): ${formData.followUpNote.trim()}`;
        await supabase
          .from("comments")
          .insert({
            lead_id: lead.id,
            content,
            user_name: displayName,
            user_id: user?.id ?? null,
          });
        queryClient.invalidateQueries({ queryKey: ["lead-comments", lead.id] });
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }

      // Update labels
      const currentLabelIds = lead.lead_labels?.map((l) => l.labels.id) || [];
      const newLabelIds = formData.selectedLabels;

      const labelsToAdd = newLabelIds.filter((id) => !currentLabelIds.includes(id));
      await Promise.all(
        labelsToAdd.map((labelId) =>
          addLabelToLead.mutateAsync({ leadId: lead.id, labelId })
        )
      );

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
        description: "Somente proprietários e administradores podem excluir leads.",
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
      <Sheet open={open && !showDeleteConfirm} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
          <SheetHeader className="space-y-4 pb-6 border-b">
            {/* Título editável */}
            <div className="space-y-2">
              <Label htmlFor="sheet-title" className="text-xs text-muted-foreground">Nome do Lead</Label>
              <Input
                id="sheet-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                disabled={isSubmitting}
              />
            </div>

            {/* Status e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-9">
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

              <div className="space-y-2">
                <Label htmlFor="sheet-value" className="text-xs text-muted-foreground">
                  Valor da Proposta
                </Label>
                <Input
                  id="sheet-value"
                  value={formData.contractValue}
                  onChange={(e) => setFormData({ ...formData, contractValue: formatCurrency(e.target.value) })}
                  className="h-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="activity">Atividades</TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Card: Dados da Empresa - Editável */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="w-4 h-4" />
                  Dados da Empresa
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                    <Input
                      value={customFields["Nome Fantasia"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Nome Fantasia": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Nome fantasia da empresa"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Razão Social</Label>
                    <Input
                      value={customFields["Razão Social"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Razão Social": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Razão social da empresa"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CNPJ</Label>
                    <Input
                      value={customFields.CNPJ || ""}
                      onChange={(e) => setCustomFields({ ...customFields, CNPJ: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Porte</Label>
                    <Input
                      value={customFields.Porte || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Porte: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="MEI, ME, EPP, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Capital Social</Label>
                    <Input
                      value={customFields["Capital Social"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Capital Social": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Abertura</Label>
                    <Input
                      value={customFields["Data de Abertura"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Data de Abertura": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Atividade Principal</Label>
                    <Input
                      value={customFields["Atividade Principal"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Atividade Principal": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Atividade principal da empresa"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Contato - Editável */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Phone className="w-4 h-4" />
                  Contato
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone Principal</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={customFields["Telefone Principal"] || customFields.phone || ""}
                        onChange={(e) => setCustomFields({ ...customFields, "Telefone Principal": e.target.value })}
                        className="h-9"
                        disabled={isSubmitting}
                        placeholder="(00) 00000-0000"
                      />
                      {(customFields["Telefone Principal"] || customFields.phone) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0"
                          onClick={() => {
                            const phone = customFields["Telefone Principal"] || customFields.phone;
                            const raw = phone.replace(/\D/g, "");
                            const withCC = raw.startsWith("55") ? raw : `55${raw}`;
                            window.open(`https://wa.me/${withCC}`, "_blank");
                          }}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone Secundário</Label>
                    <Input
                      value={customFields["Telefone Secundário"] || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "Telefone Secundário": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <Input
                      type="email"
                      value={customFields["E-mail"] || customFields.email || ""}
                      onChange={(e) => setCustomFields({ ...customFields, "E-mail": e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Endereço - Editável */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Logradouro</Label>
                    <Input
                      value={customFields.Logradouro || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Logradouro: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <Input
                      value={customFields.Número || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Número: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Complemento</Label>
                    <Input
                      value={customFields.Complemento || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Complemento: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bairro</Label>
                    <Input
                      value={customFields.Bairro || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Bairro: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <Input
                      value={customFields.Cidade || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Cidade: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Input
                      value={customFields.Estado || ""}
                      onChange={(e) => setCustomFields({ ...customFields, Estado: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CEP</Label>
                    <Input
                      value={customFields.CEP || ""}
                      onChange={(e) => setCustomFields({ ...customFields, CEP: e.target.value })}
                      className="h-9"
                      disabled={isSubmitting}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Descrição */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="w-4 h-4" />
                  Descrição
                </div>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                  placeholder="Adicione uma descrição..."
                />
              </div>

              {/* Card: Etiquetas */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="w-4 h-4" />
                  Etiquetas
                </div>
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
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nova etiqueta"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    disabled={isSubmitting || createLabel.isPending}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateLabel}
                    disabled={isSubmitting || createLabel.isPending || !newLabelName.trim()}
                  >
                    {createLabel.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Card: Responsável */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UserIcon className="w-4 h-4" />
                  Responsável
                </div>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value) => setFormData({ ...formData, assigneeId: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
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

              {/* Card: Contrato */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="w-4 h-4" />
                  Detalhes do Contrato
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de Contrato</Label>
                    <Select
                      value={formData.contractType}
                      onValueChange={(value: "monthly" | "annual" | "one_time") => setFormData({ ...formData, contractType: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="one_time">Pagamento Único</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.contractType === "monthly" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantidade de Meses</Label>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={formData.contractMonths}
                        onChange={(e) => setFormData({ ...formData, contractMonths: e.target.value })}
                        className="h-9"
                        disabled={isSubmitting}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card: Origem */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Facebook className="w-4 h-4" />
                  Origem
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Origem do Lead</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value: "manual" | "meta_ads") => setFormData({
                        ...formData,
                        source: value,
                        campaign_id: value === "manual" ? undefined : formData.campaign_id,
                      })}
                      disabled={isSubmitting || lead.source === "meta_ads"}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="meta_ads">Meta Ads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.source === "meta_ads" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Campanha</Label>
                      <Select
                        value={formData.campaign_id}
                        onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-9">
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
                </div>
              </div>
            </TabsContent>

            {/* Tab: Atividades */}
            <TabsContent value="activity" className="space-y-6 mt-6">
              {/* Follow-up */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="w-4 h-4" />
                  Próximo Follow-up
                </div>

                {(() => {
                  const d = formData.followUpDate || (lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined);
                  if (d) {
                    const isOverdue = isPast(new Date(d.toDateString())) && !isToday(d);
                    const isTodayFlag = isToday(d);
                    const tone = isOverdue ? 'text-destructive border-destructive/40 bg-destructive/10' : isTodayFlag ? 'text-amber-600 border-amber-300 bg-amber-50/10' : 'text-blue-600 border-blue-300 bg-blue-50/10';
                    return (
                      <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${tone}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{format(d, 'dd/MM/yyyy', { locale: ptBR })}</span>
                          <span className="text-xs">({formatDistanceToNowStrict(d, { locale: ptBR, addSuffix: true })})</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={async () => {
                            try {
                              await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: null } });
                              setFormData({ ...formData, followUpDate: undefined });
                            } catch { }
                          }}
                        >
                          Limpar
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" /> Nenhum follow-up agendado.
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data do próximo contato</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={isSubmitting}
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
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
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.followUpDate}
                          onSelect={async (date) => {
                            setFormData({ ...formData, followUpDate: date || undefined });
                            if (date) {
                              try {
                                await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                              } catch { }
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Atalhos:</span>
                    {[
                      { label: 'Hoje', days: 0 },
                      { label: 'Amanhã', days: 1 },
                      { label: '+7d', days: 7 },
                      { label: '+30d', days: 30 },
                    ].map((opt) => (
                      <Button
                        key={opt.label}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          const d = new Date();
                          d.setDate(d.getDate() + opt.days);
                          setFormData({ ...formData, followUpDate: d });
                          try {
                            await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: d.toISOString().split('T')[0] } });
                            toast({ title: 'Follow-up agendado', description: format(d, 'dd/MM/yyyy', { locale: ptBR }) });
                          } catch { }
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data de Entrega */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarIcon className="w-4 h-4" />
                  Data de Entrega
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
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
                  <PopoverContent className="w-auto p-0">
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

              {/* Comentários */}
              <CommentsSection
                leadId={lead.id}
                currentUserId={user?.id || undefined}
                nextFollowUpDate={formData.followUpDate || (lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined)}
              />

              {/* Timeline */}
              <FollowupTimeline lead={lead} followUpDate={formData.followUpDate} dueDate={formData.dueDate} />
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={handleOpenDeleteDialog}
              disabled={isSubmitting || (permissions ? !permissions.canDeleteLeads : false)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead "{lead.title}"? Esta ação não pode ser desfeita.
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
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="w-4 h-4" />
        Comentários
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox id="link-followup" checked={linkToFollowup} onCheckedChange={(val) => setLinkToFollowup(Boolean(val))} />
          <label htmlFor="link-followup" className="cursor-pointer">
            Vincular ao follow-up {nextFollowUpDate ? `(${format(nextFollowUpDate, 'dd/MM/yyyy', { locale: ptBR })})` : ''}
          </label>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="min-h-[80px]"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && content.trim()) {
              e.preventDefault();
              addComment.mutate(content.trim());
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => content.trim() && addComment.mutate(content.trim())}
            disabled={addComment.isPending || !content.trim()}
          >
            {addComment.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              "Adicionar"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : comments && comments.length > 0 ? (
          comments.map((c: any) => (
            <div key={c.id} className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
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
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteComment.mutate(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.content}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">Sem comentários ainda.</div>
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
      ? `Mudança: ${a.from_status || '—'} → ${a.to_status || '—'}`
      : a.action_type === 'assignment'
        ? `Responsável: ${a.description || ''}`
        : a.action_type === 'value_update'
          ? `Valor atualizado`
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
        return <ArrowRightLeft className="h-3 w-3" />;
      case 'assignment':
        return <UserIcon className="h-3 w-3" />;
      case 'value_update':
        return <DollarSign className="h-3 w-3" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3" />;
      case 'interaction':
        return <MessageCircle className="h-3 w-3" />;
      case 'follow_up':
        return <Clock className="h-3 w-3" />;
      case 'due_date':
        return <CalendarIcon className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="w-4 h-4" />
        Linha do Tempo
      </div>
      <ul className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-border">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground text-center py-4">Sem eventos ainda.</li>
        ) : (
          items.map((it, idx) => (
            <li key={idx} className="relative">
              <span className="absolute left-[-18px] top-2 h-2 w-2 rounded-full bg-primary" />
              <div className="ml-2 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    {iconFor(it.kind)}
                    <span className="text-sm font-medium">{it.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(it.date, "dd/MM/yy HH:mm", { locale: ptBR })}
                  </div>
                </div>
                {it.subtitle && (
                  <div className="text-xs text-muted-foreground ml-5">{it.subtitle}</div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

