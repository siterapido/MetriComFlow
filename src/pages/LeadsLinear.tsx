import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Upload, CheckSquare, Square, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { SpreadsheetImporter } from "@/components/leads/SpreadsheetImporter";
import { ModernLeadCard } from "@/components/leads/ModernLeadCard";
import { StageValueCard } from "@/components/leads/StageValueCard";
import { LeadsFiltersMinimal } from "@/components/leads/LeadsFiltersMinimal";
import { LeadsBulkActions } from "@/components/leads/LeadsBulkActions";
import { BulkEditModal } from "@/components/leads/BulkEditModal";
import { useToast } from "@/hooks/use-toast";
import { useLeads, useUpdateLead, type Lead, type LeadFilters } from "@/hooks/useLeads";
import { useBulkDeleteLeads } from "@/hooks/useBulkLeadsActions";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { cn } from "@/lib/utils";

// Define board stages
const BOARD_STAGES = [
  { id: "novo_lead", title: "Novo Lead", color: "from-blue-500/20 to-cyan-500/20" },
  { id: "qualificacao", title: "Qualificação", color: "from-purple-500/20 to-pink-500/20" },
  { id: "proposta", title: "Proposta", color: "from-yellow-500/20 to-orange-500/20" },
  { id: "negociacao", title: "Negociação", color: "from-green-500/20 to-emerald-500/20" },
  { id: "fechado_ganho", title: "Fechado - Ganho", color: "from-success/20 to-success/30" },
  { id: "fechado_perdido", title: "Fechado - Perdido", color: "from-destructive/20 to-destructive/30" },
] as const;

type StageId = typeof BOARD_STAGES[number]["id"];

export default function LeadsLinear() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const { toast } = useToast();
  const bulkDelete = useBulkDeleteLeads();

  // Filters state unificado
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({});

  // Fetch data com os filtros unificados
  const { data: leads, isLoading, error } = useLeads(leadFilters);
  const updateLead = useUpdateLead();
  const { data: campaigns } = useAdCampaigns(leadFilters.account_id);

  // Group leads by stage and calculate values
  const stageMetrics = useMemo(() => {
    if (!leads) return {};

    // Obter IDs das campanhas da conta selecionada para filtro
    const campaignIds = leadFilters.account_id && campaigns
      ? campaigns.map(c => c.id)
      : [];

    const filteredLeads = leads.filter((lead) => {
      // Filtro de busca
      const matchesSearch = searchTerm
        ? (() => {
            const searchLower = searchTerm.toLowerCase();
            const titleMatch = lead.title.toLowerCase().includes(searchLower);
            const customFields = lead.custom_fields as Record<string, any> | null;
            if (customFields) {
              const nomeFantasia = customFields["Nome Fantasia"]?.toLowerCase() || "";
              const razaoSocial = customFields["Razão Social"]?.toLowerCase() || "";
              return titleMatch || nomeFantasia.includes(searchLower) || razaoSocial.includes(searchLower);
            }
            return titleMatch;
          })()
        : true;

      // Filtro de data (já aplicado no hook useLeads, mas mantemos aqui para busca)
      const matchesDate = (() => {
        if (leadFilters.date_range && lead.created_at) {
          const createdAt = new Date(lead.created_at);
          const createdDateStr = createdAt.toISOString().split('T')[0];
          return createdDateStr >= leadFilters.date_range.start && createdDateStr <= leadFilters.date_range.end;
        }
        return true;
      })();

      // Filtro de conta Meta Ads - filtra por campanhas da conta
      const matchesAccount = leadFilters.account_id
        ? lead.source === "meta_ads" && lead.campaign_id && campaignIds.includes(lead.campaign_id)
        : true;

      // Filtro de campanha Meta Ads
      const matchesCampaign = leadFilters.campaign_id
        ? lead.campaign_id === leadFilters.campaign_id
        : true;

      return matchesSearch && matchesDate && matchesAccount && matchesCampaign;
    });

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
  }, [leads, searchTerm, leadFilters, campaigns]);

  // Seleção em massa
  const selectionMode = isSelectionModeActive;
  const allLeadIds = useMemo(() => {
    return Object.values(stageMetrics).flatMap(metrics => metrics.leads.map(lead => lead.id));
  }, [stageMetrics]);
  const allSelected = allLeadIds.length > 0 && allLeadIds.every(id => selectedLeadIds.has(id));
  const someSelected = Array.from(selectedLeadIds).some(id => allLeadIds.includes(id));

  const handleToggleSelectionMode = () => {
    setIsSelectionModeActive(prev => !prev);
    if (isSelectionModeActive) {
      // Se está desativando, limpar seleções
      setSelectedLeadIds(new Set());
    }
  };

  const handleToggleSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(allLeadIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    
    if (!confirm(`Tem certeza que deseja mover ${selectedLeadIds.size} lead(s) para a lixeira?`)) {
      return;
    }

    try {
      await bulkDelete.mutateAsync(Array.from(selectedLeadIds));
      setSelectedLeadIds(new Set());
      setIsSelectionModeActive(false);
    } catch (error) {
      // Error já é tratado no hook
    }
  };

  const handleNewLead = () => {
    setIsNewLeadModalOpen(false);
    toast({
      title: "Lead criado com sucesso!",
      description: "O lead foi adicionado ao sistema.",
    });
  };

  // Exclusão é realizada dentro do LeadDetailsSheet

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
      <div className="flex-shrink-0 space-y-2 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/5 pb-2">
          {/* Barra de busca */}
          <div className="relative flex-shrink-0 w-48">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2 h-7 text-sm bg-input border-border"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-1 items-center flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-7 w-7 bg-primary hover:bg-primary/90"
                  onClick={() => setIsNewLeadModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo Lead</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsImportOpen(true)}
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importar planilha</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelectionModeActive ? "default" : "outline"}
                  size="icon"
                  className={cn("h-7 w-7", isSelectionModeActive && "bg-primary text-primary-foreground")}
                  onClick={handleToggleSelectionMode}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSelectionModeActive ? "Sair da Seleção" : "Selecionar"}</TooltipContent>
            </Tooltip>
          </div>

          {/* Filtros */}
          <div className="flex gap-1.5 items-center flex-shrink-0">
            <LeadsFiltersMinimal
              filters={leadFilters}
              onFiltersChange={setLeadFilters}
            />
          </div>
        </div>

        {/* Seleção em Massa - Header */}
        {isSelectionModeActive && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 px-2 text-xs"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 mr-2" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedLeadIds.size} {selectedLeadIds.size === 1 ? "lead selecionado" : "leads selecionados"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSelectionMode}
              className="h-6 px-2 text-xs ml-auto"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Horizontal Kanban Board (Trello-style) with Drag and Drop */}
      {!isLoading && (
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
                                  isDragDisabled={isSelectionModeActive}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...(!isSelectionModeActive ? provided.dragHandleProps : {})}
                                      className={cn(
                                        "transition-all",
                                        snapshot.isDragging && "ring-2 ring-primary shadow-2xl scale-105 rotate-2"
                                      )}
                                    >
                                      <ModernLeadCard
                                        lead={lead}
                                        index={index}
                                        isSelected={selectedLeadIds.has(lead.id)}
                                        onToggleSelection={handleToggleSelection}
                                        selectionMode={selectionMode}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
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
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

  {/* Modal para Novo Lead */}
  <NewLeadModal
    open={isNewLeadModalOpen}
    onOpenChange={setIsNewLeadModalOpen}
    onSave={handleNewLead}
  />
  <SpreadsheetImporter open={isImportOpen} onOpenChange={setIsImportOpen} />

  {/* Barra de Ações em Massa */}
  <LeadsBulkActions
    selectedCount={selectedLeadIds.size}
    onEdit={() => setIsBulkEditOpen(true)}
    onDelete={handleBulkDelete}
    onClearSelection={() => {
      setSelectedLeadIds(new Set());
      setIsSelectionModeActive(false);
    }}
    isLoading={bulkDelete.isPending}
  />

  {/* Modal de Edição em Massa */}
  <BulkEditModal
    open={isBulkEditOpen}
    onOpenChange={setIsBulkEditOpen}
    selectedLeadIds={Array.from(selectedLeadIds)}
    selectedCount={selectedLeadIds.size}
  />
  </div>
  );
}
