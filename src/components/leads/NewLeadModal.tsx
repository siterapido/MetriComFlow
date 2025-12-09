import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, X, Plus, Loader2, Facebook, Building2, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateLead } from "@/hooks/useLeads";
import { useLabels, useAddLabelToLead, useCreateLabel } from "@/hooks/useLabels";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useToast } from "@/hooks/use-toast";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";
import { formatCNPJ, formatPhone, formatCEP } from "@/lib/cpf-cnpj-validator";

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const statusOptions = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" }
];

const porteOptions = [
  { value: "Microempresa", label: "Microempresa" },
  { value: "Pequena", label: "Pequena" },
  { value: "Média", label: "Média" },
  { value: "Grande", label: "Grande" },
];

const estadosBrasileiros = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function NewLeadModal({ open, onOpenChange, onSave }: NewLeadModalProps) {
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { data: labels } = useLabels();
  const addLabelToLead = useAddLabelToLead();
  const createLabel = useCreateLabel();
  const { data: campaigns } = useAdCampaigns();
  const { data: assignableUsers } = useAssignableUsers();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    selectedLabels: [] as string[],
    dueDate: undefined as Date | undefined,
    contractValue: "",
    contractType: "monthly" as 'monthly' | 'annual' | 'one_time',
    contractMonths: "1",
    assigneeId: "",
    status: "novo_lead",
    source: "manual" as 'manual' | 'meta_ads',
    campaign_id: undefined as string | undefined,
    // Campos customizados - Empresa
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    porte: "",
    capitalSocial: "",
    dataAbertura: undefined as Date | undefined,
    atividadePrincipal: "",
    // Campos customizados - Contato
    telefonePrincipal: "",
    telefoneSecundario: "",
    email: "",
    // Campos customizados - Endereço
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");

  // Função auxiliar para formatar moeda
  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório!",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse contract value to number (remove currency formatting)
      const contractValueNumber = formData.contractValue
        ? parseInt(formData.contractValue.replace(/\D/g, '')) / 100
        : 0;

      const selectedAssigneeName = assignableUsers?.find((user) => user.id === formData.assigneeId)?.full_name ?? null;

      // Calcular o valor total do contrato (para exibição no pipeline)
      const totalContractValue = formData.contractType === 'monthly'
        ? contractValueNumber * parseInt(formData.contractMonths)
        : contractValueNumber;

      // Preparar custom_fields
      const customFields: Record<string, any> = {};
      
      // Empresa
      if (formData.cnpj) customFields.CNPJ = formData.cnpj;
      if (formData.razaoSocial) customFields["Razão Social"] = formData.razaoSocial;
      if (formData.nomeFantasia) customFields["Nome Fantasia"] = formData.nomeFantasia;
      if (formData.porte) customFields.Porte = formData.porte;
      if (formData.capitalSocial) customFields["Capital Social"] = formData.capitalSocial;
      if (formData.dataAbertura) customFields["Data de Abertura"] = format(formData.dataAbertura, "dd/MM/yyyy", { locale: ptBR });
      if (formData.atividadePrincipal) customFields["Atividade Principal"] = formData.atividadePrincipal;
      
      // Contato
      if (formData.telefonePrincipal) customFields["Telefone Principal"] = formData.telefonePrincipal;
      if (formData.telefoneSecundario) customFields["Telefone Secundário"] = formData.telefoneSecundario;
      if (formData.email) customFields["E-mail"] = formData.email;
      
      // Endereço
      if (formData.logradouro) customFields.Logradouro = formData.logradouro;
      if (formData.numero) customFields.Número = formData.numero;
      if (formData.complemento) customFields.Complemento = formData.complemento;
      if (formData.bairro) customFields.Bairro = formData.bairro;
      if (formData.cidade) customFields.Cidade = formData.cidade;
      if (formData.estado) customFields.Estado = formData.estado;
      if (formData.cep) customFields.CEP = formData.cep;

      // Create lead
      const newLead = await createLead.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        value: totalContractValue,
        contract_value: contractValueNumber,
        contract_type: formData.contractType,
        contract_months: formData.contractType === 'monthly' ? parseInt(formData.contractMonths) : 1,
        due_date: formData.dueDate?.toISOString().split('T')[0] || null,
        assignee_id: formData.assigneeId || null,
        assignee_name: selectedAssigneeName,
        position: 0,
        source: formData.source,
        campaign_id: formData.source === 'meta_ads' ? formData.campaign_id : null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      });

      // Add labels if any selected
      if (formData.selectedLabels.length > 0 && newLead) {
        await Promise.all(
          formData.selectedLabels.map(labelId =>
            addLabelToLead.mutateAsync({ leadId: newLead.id, labelId })
          )
        );
      }

      toast({
        title: "Lead criado com sucesso!",
        description: `O lead "${formData.title}" foi adicionado ao sistema.`,
      });

      resetForm();
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      selectedLabels: [],
      dueDate: undefined,
      contractValue: "",
      contractType: "monthly",
      contractMonths: "1",
      assigneeId: "",
      status: "novo_lead",
      source: "manual",
      campaign_id: undefined,
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      porte: "",
      capitalSocial: "",
      dataAbertura: undefined,
      atividadePrincipal: "",
      telefonePrincipal: "",
      telefoneSecundario: "",
      email: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
    });
  };

  const toggleLabel = (labelId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLabels: prev.selectedLabels.includes(labelId)
        ? prev.selectedLabels.filter(id => id !== labelId)
        : [...prev.selectedLabels, labelId]
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

  const getLabelColor = (name: string) => {
    const colors: { [key: string]: string } = {
      "Urgente": "bg-red-500 hover:bg-red-600",
      "Comercial": "bg-blue-500 hover:bg-blue-600",
      "Reunião": "bg-purple-500 hover:bg-purple-600",
      "Desenvolvimento": "bg-green-500 hover:bg-green-600",
      "Alta Prioridade": "bg-orange-500 hover:bg-orange-600",
      "Baixa Prioridade": "bg-gray-500 hover:bg-gray-600",
      "Proposta": "bg-indigo-500 hover:bg-indigo-600",
      "Negociação": "bg-pink-500 hover:bg-pink-600",
      "Contrato": "bg-emerald-500 hover:bg-emerald-600",
    };
    return colors[name] || "bg-primary hover:bg-primary/90";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Lead</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha as informações do novo lead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
              <TabsTrigger value="contato">Contato</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
            </TabsList>

            {/* Aba: Básico */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Proposta Empresa ABC"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-input border-border focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva os detalhes do lead..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-input border-border focus:ring-primary min-h-[100px]"
                  disabled={isSubmitting}
                />
              </div>

              {/* Grid de campos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-foreground">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
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

                {/* Origem */}
                <div className="space-y-2">
                  <Label className="text-foreground">Origem do Lead</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value: 'manual' | 'meta_ads') => setFormData({ ...formData, source: value, campaign_id: value === 'manual' ? undefined : formData.campaign_id })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione a origem" />
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

                {/* Campanha (somente se source = meta_ads) */}
                {formData.source === 'meta_ads' && (
                  <div className="space-y-2 md:col-span-2">
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
                              <span className="text-xs text-muted-foreground">
                                {USER_TYPE_LABELS[user.user_type]}
                              </span>
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

                {/* Tipo de Contrato */}
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de Contrato</Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value: 'monthly' | 'annual' | 'one_time') =>
                      setFormData({ ...formData, contractType: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="one_time">Pagamento Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor da Proposta */}
                <div className="space-y-2">
                  <Label htmlFor="contractValue" className="text-foreground">
                    Valor da Proposta
                  </Label>
                  <Input
                    id="contractValue"
                    placeholder="R$ 0,00"
                    value={formData.contractValue}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData({ ...formData, contractValue: formatted });
                    }}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Quantidade de Meses (só para contratos mensais) */}
                {formData.contractType === 'monthly' && (
                  <div className="space-y-2">
                    <Label htmlFor="contractMonths" className="text-foreground">
                      Quantidade de Meses
                    </Label>
                    <Input
                      id="contractMonths"
                      type="number"
                      min="1"
                      max="120"
                      placeholder="1"
                      value={formData.contractMonths}
                      onChange={(e) => setFormData({ ...formData, contractMonths: e.target.value })}
                      className="bg-input border-border focus:ring-primary"
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
                        onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Etiquetas */}
              <div className="space-y-3">
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
            </TabsContent>

            {/* Aba: Empresa */}
            <TabsContent value="empresa" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-foreground">CNPJ <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                    maxLength={18}
                  />
                </div>

                {/* Porte */}
                <div className="space-y-2">
                  <Label className="text-foreground">Porte <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Select
                    value={formData.porte}
                    onValueChange={(value) => setFormData({ ...formData, porte: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o porte" />
                    </SelectTrigger>
                    <SelectContent>
                      {porteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Razão Social */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="razaoSocial" className="text-foreground">Razão Social <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Razão Social da empresa"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nomeFantasia" className="text-foreground">Nome Fantasia <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="nomeFantasia"
                    placeholder="Nome Fantasia da empresa"
                    value={formData.nomeFantasia}
                    onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Capital Social */}
                <div className="space-y-2">
                  <Label htmlFor="capitalSocial" className="text-foreground">Capital Social <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="capitalSocial"
                    placeholder="R$ 0,00"
                    value={formData.capitalSocial}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData({ ...formData, capitalSocial: formatted });
                    }}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Data de Abertura */}
                <div className="space-y-2">
                  <Label className="text-foreground">Data de Abertura <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-input border-border",
                          !formData.dataAbertura && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dataAbertura ? (
                          format(formData.dataAbertura, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border">
                      <Calendar
                        mode="single"
                        selected={formData.dataAbertura}
                        onSelect={(date) => setFormData({ ...formData, dataAbertura: date })}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Atividade Principal */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="atividadePrincipal" className="text-foreground">Atividade Principal <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="atividadePrincipal"
                    placeholder="CNAE ou descrição da atividade principal"
                    value={formData.atividadePrincipal}
                    onChange={(e) => setFormData({ ...formData, atividadePrincipal: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba: Contato */}
            <TabsContent value="contato" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telefone Principal */}
                <div className="space-y-2">
                  <Label htmlFor="telefonePrincipal" className="text-foreground">Telefone Principal <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="telefonePrincipal"
                    placeholder="(00) 00000-0000"
                    value={formData.telefonePrincipal}
                    onChange={(e) => setFormData({ ...formData, telefonePrincipal: formatPhone(e.target.value) })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                    maxLength={15}
                  />
                </div>

                {/* Telefone Secundário */}
                <div className="space-y-2">
                  <Label htmlFor="telefoneSecundario" className="text-foreground">Telefone Secundário <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="telefoneSecundario"
                    placeholder="(00) 00000-0000"
                    value={formData.telefoneSecundario}
                    onChange={(e) => setFormData({ ...formData, telefoneSecundario: formatPhone(e.target.value) })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                    maxLength={15}
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email" className="text-foreground">E-mail <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba: Endereço */}
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CEP */}
                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-foreground">CEP <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                    maxLength={9}
                  />
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label className="text-foreground">Estado <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasileiros.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Logradouro */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logradouro" className="text-foreground">Logradouro <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida, etc."
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Número */}
                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-foreground">Número <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Complemento */}
                <div className="space-y-2">
                  <Label htmlFor="complemento" className="text-foreground">Complemento <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="complemento"
                    placeholder="Apto, Sala, etc."
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-foreground">Bairro <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="bairro"
                    placeholder="Nome do bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-foreground">Cidade <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
                  <Input
                    id="cidade"
                    placeholder="Nome da cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="bg-input border-border focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
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
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
