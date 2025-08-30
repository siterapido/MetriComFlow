import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Calendar, MessageSquare, Paperclip, User } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { useToast } from "@/hooks/use-toast";

// Mock data para o Kanban - agora como estado
const initialBoards = [
  {
    id: "todo",
    title: "A Fazer",
    cards: [
      {
        id: "1",
        title: "Proposta Empresa ABC",
        description: "Desenvolver proposta comercial completa",
        labels: ["Urgente", "Comercial"],
        dueDate: "2024-01-15",
        value: 50000,
        assignee: "João Silva",
        comments: 3,
        attachments: 2,
        checklist: { completed: 2, total: 5 }
      },
      {
        id: "2",
        title: "Reunião Cliente XYZ",
        description: "Apresentação do projeto piloto",
        labels: ["Reunião"],
        dueDate: "2024-01-18",
        value: 25000,
        assignee: "Maria Santos",
        comments: 1,
        attachments: 0,
        checklist: { completed: 1, total: 3 }
      }
    ]
  },
  {
    id: "doing",
    title: "Em Andamento",
    cards: [
      {
        id: "3",
        title: "Projeto DEF em desenvolvimento",
        description: "Implementação da primeira fase",
        labels: ["Desenvolvimento", "Alta Prioridade"],
        dueDate: "2024-01-20",
        value: 75000,
        assignee: "Pedro Costa",
        comments: 8,
        attachments: 5,
        checklist: { completed: 4, total: 8 }
      }
    ]
  },
  {
    id: "done",
    title: "Concluído",
    cards: [
      {
        id: "4",
        title: "Contrato GHI assinado",
        description: "Projeto finalizado com sucesso",
        labels: ["Concluído", "Faturado"],
        dueDate: "2024-01-10",
        value: 100000,
        assignee: "Ana Lima",
        comments: 12,
        attachments: 8,
        checklist: { completed: 6, total: 6 }
      }
    ]
  }
];

const getLabelColor = (label: string) => {
  const colors: { [key: string]: string } = {
    "Urgente": "bg-destructive text-destructive-foreground",
    "Comercial": "bg-primary text-primary-foreground",
    "Reunião": "bg-secondary text-secondary-foreground",
    "Desenvolvimento": "bg-accent text-accent-foreground",
    "Alta Prioridade": "bg-warning text-warning-foreground",
    "Concluído": "bg-success text-success-foreground",
    "Faturado": "bg-muted text-muted-foreground",
    "Proposta": "bg-primary text-primary-foreground",
    "Negociação": "bg-accent text-accent-foreground",
    "Contrato": "bg-success text-success-foreground",
    "Baixa Prioridade": "bg-muted text-muted-foreground"
  };
  return colors[label] || "bg-muted text-muted-foreground";
};

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [boards, setBoards] = useState(initialBoards);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const { toast } = useToast();

  const handleNewLead = (leadData: any) => {
    // Adicionar o novo lead na lista "A Fazer"
    const updatedBoards = boards.map(board => {
      if (board.id === leadData.status || (board.id === "todo" && !leadData.status)) {
        return {
          ...board,
          cards: [...board.cards, leadData]
        };
      }
      return board;
    });
    
    setBoards(updatedBoards);
    
    toast({
      title: "Lead criado com sucesso!",
      description: `O lead "${leadData.title}" foi adicionado ao sistema.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads - Kanban</h1>
          <p className="text-muted-foreground">Gestão de oportunidades e projetos</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setIsNewLeadModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-input border-border"
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-x-auto">
        {boards.map((board) => (
          <div key={board.id} className="min-w-[320px]">
            <Card className="h-full border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {board.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {board.cards.length}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {board.cards.map((card) => (
                  <Card
                    key={card.id}
                    className="p-4 bg-muted border-border hover:shadow-lg transition-all duration-200 cursor-pointer hover-lift"
                  >
                    <div className="space-y-3">
                      {/* Title */}
                      <h3 className="font-medium text-foreground text-sm leading-tight">
                        {card.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {card.description}
                      </p>
                      
                      {/* Labels */}
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((label, index) => (
                          <Badge
                            key={index}
                            className={`text-xs px-2 py-1 ${getLabelColor(label)}`}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Value */}
                      <div className="text-sm font-semibold text-primary">
                        R$ {card.value.toLocaleString("pt-BR")}
                      </div>
                      
                      {/* Due Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(card.dueDate).toLocaleDateString("pt-BR")}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Checklist</span>
                          <span>{card.checklist.completed}/{card.checklist.total}</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${(card.checklist.completed / card.checklist.total) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {card.comments}
                          </div>
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {card.attachments}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[80px]">{card.assignee}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* Add New Card Button */}
                <Button
                  variant="ghost"
                  className="w-full h-12 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar cartão
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Modal para Novo Lead */}
      <NewLeadModal 
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSave={handleNewLead}
      />
    </div>
  );
}