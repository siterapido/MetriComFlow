import { useState } from "react";
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

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const teamMembers = [
  "João Silva",
  "Maria Santos",
  "Pedro Costa",
  "Ana Lima",
  "Carlos Oliveira",
  "Beatriz Ferreira"
];

const statusOptions = [
  { value: "todo", label: "Leads frio" },
  { value: "doing", label: "Em Andamento" },
  { value: "done", label: "Contrato fechado" }
];

export function NewLeadModalSupabase({ open, onOpenChange, onSave }: NewLeadModalProps) {
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { data: labels } = useLabels();
  const addLabelToLead = useAddLabelToLead();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    selectedLabels: [] as string[],
    dueDate: undefined as Date | undefined,
    value: "",
    assignee: "",
    status: "todo" as 'todo' | 'doing' | 'done',
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
      // Parse value to number (remove currency formatting)
      const valueNumber = formData.value
        ? parseInt(formData.value.replace(/\D/g, '')) / 100
        : 0;

      // Create lead
      const newLead = await createLead.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        value: valueNumber,
        due_date: formData.dueDate?.toISOString().split('T')[0] || null,
        assignee_name: formData.assignee || null,
        position: 0,
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
      assignee: "",
      status: "todo",
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

          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'todo' | 'doing' | 'done' })}
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

            {/* Responsável */}
            <div className="space-y-2">
              <Label className="text-foreground">Responsável</Label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor do Contrato */}
            <div className="space-y-2">
              <Label htmlFor="value" className="text-foreground">Valor do Contrato</Label>
              <Input
                id="value"
                placeholder="R$ 0,00"
                value={formData.value}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData({ ...formData, value: formatted });
                }}
                className="bg-input border-border focus:ring-primary"
                disabled={isSubmitting}
              />
            </div>

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
