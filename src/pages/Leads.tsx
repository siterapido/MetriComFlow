import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, Calendar, MessageSquare, Paperclip, User, History, Loader2, Facebook } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLeads, useUpdateLead, type LeadWithLabels } from "@/hooks/useLeads";
import { useLeadActivity } from "@/hooks/useLeads";
import type { Database } from "@/lib/database.types";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";

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

const BOARD_CONFIG = [
  { id: "novo_lead", title: "Novo Lead" },
  { id: "qualificacao", title: "Qualificação" },
  { id: "proposta", title: "Proposta" },
  { id: "negociacao", title: "Negociação" },
  { id: "fechado_ganho", title: "Fechado - Ganho" },
  { id: "fechado_perdido", title: "Fechado - Perdido" }
];

// Allowed lead statuses for Kanban columns
type LeadStatus =
  | 'novo_lead'
  | 'qualificacao'
  | 'proposta'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';
export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_ads' | 'manual'>('all');
  const { toast } = useToast();

  const {
    hasActiveConnection: hasMetaConnection,
    isLoading: metaStatusLoading,
    isFetching: metaStatusFetching,
  } = useMetaConnectionStatus();
  const metaStatusPending = metaStatusLoading || metaStatusFetching;
  const hideMetaLeads = !metaStatusPending && !hasMetaConnection;

  useEffect(() => {
    if (hideMetaLeads && sourceFilter === 'meta_ads') {
      setSourceFilter('all');
    }
  }, [hideMetaLeads, sourceFilter]);

  // Fetch data
  const { data: leads, isLoading, error } = useLeads();
  type LeadActivity = Database['public']['Tables']['lead_activity']['Row']
  const { data: activitiesData } = useLeadActivity();
  const updateLead = useUpdateLead();

  const recentActivities = useMemo<LeadActivity[]>(() => {
    return (activitiesData ?? []).slice(0, 10)
  }, [activitiesData])

  // Group leads by status
  const boards = useMemo(() => {
    if (!leads) return BOARD_CONFIG.map(config => ({ ...config, cards: [] }));

    const filteredLeads = leads.filter(lead => {
      // Search filter
      const matchesSearch = searchTerm
        ? lead.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      // Source filter
      const matchesSource = sourceFilter === 'all'
        ? true
        : lead.source === sourceFilter;

      const matchesVisibility = hideMetaLeads
        ? (lead.source !== 'meta_ads' && !lead.campaign_id)
        : true;

      return matchesSearch && matchesSource && matchesVisibility;
    });

    return BOARD_CONFIG.map(config => ({
      ...config,
      cards: filteredLeads.filter(lead => lead.status === config.id)
    }));
  }, [leads, searchTerm, sourceFilter, hideMetaLeads]);

  const handleNewLead = () => {
    setIsNewLeadModalOpen(false);
    toast({
      title: "Lead criado com sucesso!",
      description: "O lead foi adicionado ao sistema.",
    });
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const lead = leads?.find(l => l.id === draggableId);
    if (!lead) return;

    const newStatus = destination.droppableId as LeadStatus;
    const oldStatus = source.droppableId;

    // Update lead status
    try {
      await updateLead.mutateAsync({
        id: draggableId,
        updates: {
          status: newStatus,
          position: destination.index
        }
      });

      if (oldStatus !== newStatus) {
        const fromBoard = BOARD_CONFIG.find(b => b.id === oldStatus);
        const toBoard = BOARD_CONFIG.find(b => b.id === newStatus);

        toast({
          title: "Lead movido",
          description: `"${lead.title}": ${fromBoard?.title} → ${toBoard?.title}`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao mover lead",
        description: "Não foi possível atualizar o status do lead.",
        variant: "destructive"
      });
    }
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const isAuthError = errorMessage.toLowerCase().includes('autenticado') || errorMessage.toLowerCase().includes('autenticação')

    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Erro ao carregar leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-foreground font-medium">
                {errorMessage}
              </p>
            </div>

            {isAuthError && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Solução:</strong> Faça logout e login novamente para renovar sua sessão.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong>Passos para debug:</strong>
              </p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Abra o console do navegador (F12)</li>
                <li>Verifique os logs do hook [useLeads]</li>
                <li>Verifique se você está autenticado</li>
                <li>Tente fazer logout e login novamente</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Recarregar página
              </Button>
              {isAuthError && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  Ir para Login
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setIsNewLeadModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>

        <Select
          value={sourceFilter}
          onValueChange={(value) => setSourceFilter(value as 'all' | 'meta_ads' | 'manual')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Origens</SelectItem>
            <SelectItem value="meta_ads" disabled={hideMetaLeads}>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Meta Ads
              </div>
            </SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hideMetaLeads && (
        <Alert>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Leads vinculados a campanhas do Meta Ads estão ocultos até que a integração seja reativada. Eles permanecem salvos para uso futuro.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="/metricas">Reativar Meta Ads</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto">
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

                  <Droppable droppableId={board.id} type="CARD">
                    {(provided, snapshot) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-3 rounded-lg min-h-24 transition-colors",
                          snapshot.isDraggingOver && "bg-primary/5"
                        )}
                      >
                        {board.cards.map((card, index) => (
                          <Draggable draggableId={card.id} index={index} key={card.id}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-4 bg-muted border-border hover:shadow-lg transition-all duration-200 cursor-grab hover-lift",
                                  snapshot.isDragging && "ring-2 ring-primary scale-[1.02]"
                                )}
                              >
                                <div className="space-y-3">
                                  {/* Title */}
                                  <h3 className="font-medium text-foreground text-sm leading-tight">
                                    {card.title}
                                  </h3>

                                  {/* Description */}
                                  {card.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {card.description}
                                    </p>
                                  )}

                                  {/* Meta Ads Information */}
                                  {card.source === 'meta_ads' && (
                                    <div className="space-y-1">
                                      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit">
                                        <Facebook className="w-3 h-3" />
                                        Meta Ads
                                      </Badge>
                                      {card.external_lead_id && (
                                        <p className="text-xs text-muted-foreground">
                                          ID: {card.external_lead_id.substring(0, 20)}...
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Labels */}
                                  {card.lead_labels && card.lead_labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {card.lead_labels.map((labelRel, index) => (
                                        <Badge
                                          key={index}
                                          className={`text-xs px-2 py-1 ${getLabelColor(labelRel.labels.name)}`}
                                        >
                                          {labelRel.labels.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Value */}
                                  {card.value > 0 && (
                                    <div className="text-sm font-semibold text-primary">
                                      R$ {card.value.toLocaleString("pt-BR")}
                                    </div>
                                  )}

                                  {/* Due Date */}
                                  {card.due_date && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(card.due_date).toLocaleDateString("pt-BR")}
                                    </div>
                                  )}

                                  {/* Progress Bar */}
                                  {card.checklist_items && card.checklist_items.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Checklist</span>
                                        <span>
                                          {card.checklist_items.filter(i => i.completed).length}/
                                          {card.checklist_items.length}
                                        </span>
                                      </div>
                                      <div className="w-full bg-border rounded-full h-1">
                                        <div
                                          className="bg-primary h-1 rounded-full transition-all duration-300"
                                          style={{
                                            width: `${(card.checklist_items.filter(i => i.completed).length / card.checklist_items.length) * 100}%`
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Footer */}
                                  <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        {card.comments_count || 0}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Paperclip className="w-3 h-3" />
                                        {card.attachments_count || 0}
                                      </div>
                                    </div>

                                    {card.assignee_name && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="w-3 h-3" />
                                        <span className="truncate max-w-[80px]">{card.assignee_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}

                        {/* Add New Card Button */}
                        <Button
                          variant="ghost"
                          className="w-full h-12 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                          onClick={() => setIsNewLeadModalOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar cartão
                        </Button>
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Modal para Novo Lead */}
      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSave={handleNewLead}
      />

      {/* Histórico de movimentações */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <CardTitle className="text-lg font-semibold text-foreground">Histórico de movimentações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
          ) : (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString("pt-BR")}
                </span>
                <span className="font-medium">
                  "{activity.lead_title}" {activity.from_status} → {activity.to_status}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
