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
import { CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (leadData: any) => void;
}

const predefinedLabels = [
  "Urgente",
  "Comercial", 
  "Reunião",
  "Desenvolvimento",
  "Alta Prioridade",
  "Baixa Prioridade",
  "Proposta",
  "Negociação",
  "Contrato"
];

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

export function NewLeadModal({ open, onOpenChange, onSave }: NewLeadModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    labels: [] as string[],
    dueDate: undefined as Date | undefined,
    value: "",
    assignee: "",
    status: "todo",
    newLabel: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert("Título é obrigatório!");
      return;
    }

    const leadData = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      labels: formData.labels,
      dueDate: formData.dueDate?.toISOString().split('T')[0],
      value: parseInt(formData.value.replace(/\D/g, '')) || 0,
      assignee: formData.assignee,
      comments: 0,
      attachments: 0,
      checklist: { completed: 0, total: 1 }
    };

    onSave(leadData);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      labels: [],
      dueDate: undefined,
      value: "",
      assignee: "",
      status: "todo",
      newLabel: ""
    });
  };

  const addLabel = (label: string) => {
    if (label && !formData.labels.includes(label)) {
      setFormData({ ...formData, labels: [...formData.labels, label] });
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter(label => label !== labelToRemove)
    });
  };

  const addCustomLabel = () => {
    if (formData.newLabel.trim()) {
      addLabel(formData.newLabel.trim());
      setFormData({ ...formData, newLabel: "" });
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
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
            />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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
              <Select value={formData.assignee} onValueChange={(value) => setFormData({ ...formData, assignee: value })}>
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
              />
            </div>

            {/* Data de Entrega */}
            <div className="space-y-2">
              <Label className="text-foreground">Data de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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
            
            {/* Etiquetas selecionadas */}
            {formData.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.labels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-primary text-primary-foreground"
                  >
                    {label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeLabel(label)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Etiquetas predefinidas */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Etiquetas predefinidas:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => addLabel(label)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Nova etiqueta customizada */}
            <div className="flex gap-2">
              <Input
                placeholder="Nova etiqueta..."
                value={formData.newLabel}
                onChange={(e) => setFormData({ ...formData, newLabel: e.target.value })}
                className="bg-input border-border focus:ring-primary"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLabel())}
              />
              <Button type="button" onClick={addCustomLabel} size="sm" className="gap-1">
                <Plus className="w-3 h-3" />
                Adicionar
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}