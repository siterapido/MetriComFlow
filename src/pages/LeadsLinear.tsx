import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Upload, Edit, Trash2, X, Users } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { LeadImportModal } from "@/components/leads/LeadImportModal";
import { LeadCard } from "@/components/leads/LeadCard";
import { BulkEditDialog } from "@/components/leads/BulkEditDialog";
import { LeadDistributionModal } from "@/components/leads/LeadDistributionModal";
import { StageValueCard } from "@/components/leads/StageValueCard";
import { useToast } from "@/hooks/use-toast";
import { useLeads, useDeleteLead, useUpdateLead, type Lead, useBulkDeleteLeads } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown } from "lucide-react";

// Define board stages
const BOARD_STAGES = [
  { id: "novo_lead", title: "Novo Lead", color: "from-blue-500/20 to-cyan-500/20" },
  { id: "qualificacao", title: "Qualificação", color: "from-purple-500/20 to-pink-500/20" },
  { id: "reuniao", title: "Reunião", color: "from-indigo-500/20 to-violet-500/20" },
  { id: "proposta", title: "Proposta", color: "from-yellow-500/20 to-orange-500/20" },
  { id: "negociacao", title: "Negociação", color: "from-green-500/20 to-emerald-500/20" },
  { id: "fechado_ganho", title: "Fechado - Ganho", color: "from-success/20 to-success/30" },
  { id: "fechado_perdido", title: "Fechado - Perdido", color: "from-destructive/20 to-destructive/30" },
] as const;

type StageId = typeof BOARD_STAGES[number]["id"];

export default function LeadsLinear() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: leads, isLoading, error } = useLeads();
  const deleteLead = useDeleteLead();
  const bulkDelete = useBulkDeleteLeads();
  const updateLead = useUpdateLead();

  // Group leads by stage and calculate values
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter((lead) => {
      // Filtro de busca
      const matchesSearch = searchTerm
        ? lead.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return matchesSearch;
    });
  }, [leads, searchTerm]);

  const stageMetrics = useMemo(() => {
    return BOARD_STAGES.reduce((acc, stage) => {
      const stageLeads = filteredLeads.filter((lead) => lead.status === stage.id);
      const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const averageValue = stageLeads.length > 0 ? totalValue / stageLeads.length : 0;

      acc[stage.id] = {
        leads: stageLeads,
        totalValue,
        averageValue,
        count: stageLeads.length,
      };

      return acc;
    }, {} as Record<StageId, { leads: Lead[]; totalValue: number; averageValue: number; count: number }>);
  }, [filteredLeads]);

  const [isDistributeOpen, setIsDistributeOpen] = useState(false);

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      handleClearSelection();
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleSelectCount = (count: number) => {
    if (!filteredLeads) return;
    const toSelect = filteredLeads.slice(0, count);
    setSelectedLeads(new Set(toSelect.map(l => l.id)));
  };

  const handleNewLead = () => {
    setIsNewLeadModalOpen(false);
    toast({
      title: "Lead criado com sucesso!",
      description: "O lead foi adicionado ao sistema.",
    });
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLead.mutateAsync(id);
      toast({
        title: "Lead excluído",
        description: "O lead foi removido com sucesso.",
      });
    } catch (error) {
      console.error('[handleDeleteLead] Erro ao excluir lead:', error);
      console.error('[handleDeleteLead] Lead ID:', id);
      console.error('[handleDeleteLead] Tipo de erro:', typeof error);
      console.error('[handleDeleteLead] Detalhes completos:', JSON.stringify(error, null, 2));

      const anyErr = error as any;
      const description =
        anyErr?.message ||
        anyErr?.error?.message ||
        anyErr?.data?.message ||
        (anyErr?.code ? `Código: ${anyErr.code}` : 'Não foi possível remover o lead.');

      toast({
        title: "Erro ao excluir lead",
        description,
        variant: "destructive",
      });
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedLeads(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads?`)) return;

    try {
      await bulkDelete.mutateAsync(Array.from(selectedLeads));
      handleClearSelection();
    } catch (error) {
      // Error handled in hook
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const lead = leads?.find(l => l.id === draggableId);
    if (!lead) return;

    const newStatus = destination.droppableId as StageId;
    const oldStatus = source.droppableId as StageId;

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
        const fromStage = BOARD_STAGES.find(s => s.id === oldStatus);
        const toStage = BOARD_STAGES.find(s => s.id === newStatus);

        toast({
          title: "Lead movido",
          description: `"${lead.title}": ${fromStage?.title} → ${toStage?.title}`,
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Erro ao carregar leads</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 p-1">
          {/* Search Bar - Left Side */}
          <div className="relative w-full xl:w-72 2xl:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border focus:bg-background transition-colors"
            />
          </div>

          {/* Right Side Controls - Unified Line */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto mt-2 xl:mt-0 no-scrollbar">
            {/* Selection Status */}
            {filteredLeads.length > 0 && selectedLeads.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                onClick={handleSelectAll}
              >
                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px]">
                  {selectedLeads.size === filteredLeads.length ? "✓" : selectedLeads.size}
                </div>
                <span className="whitespace-nowrap">
                  {selectedLeads.size === filteredLeads.length ? "Todos selecionados" : "Selecionados"}
                </span>
              </Button>
            )}

            {/* Select All Toggle / Count Selection */}
            {filteredLeads.length > 0 && selectedLeads.size === 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-foreground gap-1.5">
                    Selecionar
                    <ArrowDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={handleSelectAll}>
                    Selecionar Todos <span className="ml-auto text-xs opacity-50">({filteredLeads.length})</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSelectCount(10)}>Selecionar 10</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSelectCount(30)}>Selecionar 30</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSelectCount(50)}>Selecionar 50</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 text-[10px] gap-1.5 text-primary hover:text-primary hover:bg-primary/5 transition-colors border border-primary/20"
              onClick={() => setIsDistributeOpen(true)}
            >
              <Users className="w-3 h-3" />
              Distribuição
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>

            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 h-9"
              onClick={() => setIsNewLeadModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Lead</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {
        isLoading && (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )
      }

      {/* Horizontal Kanban Board (Trello-style) with Drag and Drop */}
      {
        !isLoading && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
              <div className="flex gap-4 h-full min-w-max px-1">
                {BOARD_STAGES.map((stage) => {
                  const metrics = stageMetrics[stage.id];
                  if (!metrics) return null;

                  return (
                    <div
                      key={stage.id}
                      className="flex flex-col w-[280px] flex-shrink-0 bg-muted/30 rounded-lg p-2 border border-border"
                    >
                      {/* Column Header with Value Card */}
                      <div className="flex-shrink-0 mb-2">
                        <StageValueCard
                          title={stage.title}
                          totalValue={metrics.totalValue}
                          leadsCount={metrics.count}
                          averageValue={metrics.averageValue}
                        />
                      </div>

                      {/* Droppable area for Lead Cards */}
                      <Droppable droppableId={stage.id} type="LEAD">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 overflow-y-auto space-y-2 pr-1 rounded-lg transition-colors",
                              snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20"
                            )}
                          >
                            {metrics.leads.length === 0 ? (
                              <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground bg-background/50">
                                <p className="text-sm mb-2">Nenhum lead nesta etapa</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => setIsNewLeadModalOpen(true)}
                                >
                                  <Plus className="w-4 h-4" />
                                  Adicionar lead
                                </Button>
                              </div>
                            ) : (
                              <>
                                {metrics.leads.map((lead: Lead, index: number) => (
                                  <Draggable
                                    key={lead.id}
                                    draggableId={lead.id}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(
                                          "transition-all",
                                          "mb-2",
                                          snapshot.isDragging && "ring-2 ring-primary shadow-2xl scale-105 rotate-2"
                                        )}
                                      >
                                        <LeadCard
                                          lead={lead}
                                          onDelete={handleDeleteLead}
                                          isSelected={selectedLeads.has(lead.id)}
                                          onToggleSelect={(id) => handleToggleSelect(id)}
                                          selectionMode={selectedLeads.size > 0}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {/* Add Lead Button at bottom */}
                                <button
                                  onClick={() => setIsNewLeadModalOpen(true)}
                                  className="w-full py-3 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all group"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Novo Lead</span>
                                </button>
                              </>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        )
      }

      {/* New Lead Modal */}
      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSave={handleNewLead}
      />

      {/* Import Modal */}
      <LeadImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />

      {/* Bulk Actions Floating Bar */}
      {
        selectedLeads.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-foreground text-background px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom-5">
            <div className="font-semibold text-sm">
              {selectedLeads.size} selecionado{selectedLeads.size > 1 ? 's' : ''}
            </div>
            <div className="h-4 w-px bg-background/20" />
            <Button
              variant="ghost"
              size="sm"
              className="text-background hover:bg-background/20 hover:text-background h-8 px-3"
              onClick={() => setIsBulkEditOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-background/20 hover:text-red-300 h-8 px-3"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <div className="h-4 w-px bg-background/20" />
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:bg-background/20 hover:text-background h-8 w-8 rounded-full ml-auto"
              onClick={handleClearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )
      }

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={isBulkEditOpen || isDistributeOpen}
        onOpenChange={(open) => {
          setIsBulkEditOpen(open);
          if (!open) setIsDistributeOpen(false);
        }}
        selectedIds={Array.from(selectedLeads)}
        onSuccess={() => {
          handleClearSelection();
        }}
        initialField={isDistributeOpen ? "assignee" : undefined}
      />

      <LeadDistributionModal
        open={isDistributeOpen}
        onOpenChange={setIsDistributeOpen}
        onSuccess={() => {
          toast({
            title: "Sucesso",
            description: "Leads distribuídos com sucesso!"
          });
        }}
      />
    </div>
  );
}
