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
import { CalendarIcon, X, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateLead } from "@/hooks/useLeads";
import { useLabels, useAddLabelToLead } from "@/hooks/useLabels";
import { useToast } from "@/hooks/use-toast";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { USER_TYPE_LABELS } from "@/hooks/useUserPermissions";

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

// Fetch team members from Supabase instead of hardcoded list
// Uses useTeamMembers hook to get real data from the database

const statusOptions = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "reuniao", label: "Reunião" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" }
];

export function NewLeadModal({ open, onOpenChange, onSave }: NewLeadModalProps) {
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { data: labels } = useLabels();
  const addLabelToLead = useAddLabelToLead();
  const { data: assignableUsers } = useAssignableUsers();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    selectedLabels: [] as string[],
    dueDate: undefined as Date | undefined,
    value: "",
    contractValue: "",
    contractType: "monthly" as 'monthly' | 'annual' | 'one_time',
    contractMonths: "1",
    assigneeId: "",
    status: "novo_lead",
    source: "manual" as 'manual',
    // New fields
    cnpj: "",
    legal_name: "",
    trade_name: "",
    size: "",
    share_capital: "",
    opening_date: undefined as Date | undefined,
    phone: "",
    secondary_phone: "",
    email: "",
    address: "",
    address_number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    main_activity: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Create lead
      const newLead = await createLead.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        value: totalContractValue, // Valor total do contrato (usado no pipeline e dashboard)
        contract_value: contractValueNumber, // Valor mensal/anual/único
        contract_type: formData.contractType,
        contract_months: formData.contractType === 'monthly' ? parseInt(formData.contractMonths) : 1,
        due_date: formData.dueDate?.toISOString().split('T')[0] || null,
        assignee_id: formData.assigneeId || null,
        assignee_name: selectedAssigneeName,
        position: 0,
        source: formData.source,
        // New fields
        cnpj: formData.cnpj || null,
        legal_name: formData.legal_name || null,
        trade_name: formData.trade_name || null,
        size: formData.size || null,
        share_capital: formData.share_capital ? parseFloat(formData.share_capital.replace(/\./g, '').replace(',', '.')) : null,
        opening_date: formData.opening_date?.toISOString().split('T')[0] || null,
        phone: formData.phone || null,
        secondary_phone: formData.secondary_phone || null,
        email: formData.email || null,
        address: formData.address || null,
        address_number: formData.address_number || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        main_activity: formData.main_activity || null,
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
      value: "",
      contractValue: "",
      contractType: "monthly",
      contractMonths: "1",
      assigneeId: "",
      status: "novo_lead",
      source: "manual",
      cnpj: "",
      legal_name: "",
      trade_name: "",
      size: "",
      share_capital: "",
      opening_date: undefined,
      phone: "",
      secondary_phone: "",
      email: "",
      address: "",
      address_number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: "",
      main_activity: "",
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

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Lead</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha as informações do novo lead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Dados de Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border p-4">
            <div className="md:col-span-2 font-medium">Contatos</div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail</Label>
              <Input
                id="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Telefone Principal</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_phone" className="text-foreground">Telefone Secundário</Label>
              <Input
                id="secondary_phone"
                placeholder="(00) 00000-0000"
                value={formData.secondary_phone}
                onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border p-4">
            <div className="md:col-span-2 font-medium">Dados da Empresa</div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão Social</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Porte</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEI">MEI</SelectItem>
                  <SelectItem value="Microempresa">Microempresa (ME)</SelectItem>
                  <SelectItem value="Pequena Empresa">Pequena Empresa (EPP)</SelectItem>
                  <SelectItem value="Médio Porte">Médio Porte</SelectItem>
                  <SelectItem value="Grande Porte">Grande Porte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share_capital">Capital Social</Label>
              <Input
                id="share_capital"
                value={formData.share_capital}
                onChange={(e) => setFormData({ ...formData, share_capital: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening_date">Data de Abertura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-input border-border",
                      !formData.opening_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.opening_date ? (
                      format(formData.opening_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border">
                  <Calendar
                    mode="single"
                    selected={formData.opening_date}
                    onSelect={(date) => setFormData({ ...formData, opening_date: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="main_activity">Atividade Principal</Label>
              <Input
                id="main_activity"
                value={formData.main_activity}
                onChange={(e) => setFormData({ ...formData, main_activity: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg border border-border p-4">
            <div className="md:col-span-2 lg:col-span-3 font-medium">Endereço</div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Logradouro</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_number">Número</Label>
              <Input
                id="address_number"
                value={formData.address_number}
                onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="bg-input border-border"
                disabled={isSubmitting}
                maxLength={2}
              />
            </div>
          </div>

          {/* Grid de campos */}
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
                onValueChange={(value: 'manual') => setFormData({ ...formData, source: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
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

            {/* Valor do Contrato */}
            <div className="space-y-2">
              <Label htmlFor="contractValue" className="text-foreground">
                Valor do Contrato {formData.contractType === 'monthly' ? '(mensal)' : ''}
              </Label>
              <Input
                id="contractValue"
                placeholder="R$ 0,00"
                value={formData.contractValue}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
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

            {/* Etiquetas disponíveis */}
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
          </div>

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
