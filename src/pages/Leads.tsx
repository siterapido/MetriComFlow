import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Loader2, Upload, CheckSquare, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { SpreadsheetImporter } from "@/components/leads/SpreadsheetImporter";
import { LeadFiltersCompact, CustomFieldsFilters } from "@/components/leads/LeadFiltersCompact";
import { LeadsFiltersMinimal } from "@/components/leads/LeadsFiltersMinimal";
import { LeadsBulkActions } from "@/components/leads/LeadsBulkActions";
import { BulkEditModal } from "@/components/leads/BulkEditModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLeads, useUpdateLead, type LeadFilters } from "@/hooks/useLeads";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useBulkDeleteLeads } from "@/hooks/useBulkLeadsActions";
import { ModernLeadCard } from "@/components/leads/ModernLeadCard";
import { CelebrationOverlay } from "@/components/leads/CelebrationOverlay";
import { motion } from "framer-motion";

const BOARD_CONFIG = [
  { id: "novo_lead", title: "Novo Lead", color: "bg-blue-500" },
  { id: "qualificacao", title: "Qualificação", color: "bg-purple-500" },
  { id: "proposta", title: "Proposta", color: "bg-orange-500" },
  { id: "negociacao", title: "Negociação", color: "bg-yellow-500" },
  { id: "fechado_ganho", title: "Fechado - Ganho", color: "bg-emerald-500" },
  { id: "fechado_perdido", title: "Fechado - Perdido", color: "bg-red-500" }
];

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [customFieldsFilters, setCustomFieldsFilters] = useState<CustomFieldsFilters>({});
  const [filters, setFilters] = useState<LeadFilters>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const bulkDelete = useBulkDeleteLeads();

  const {
    hasActiveConnection: hasMetaConnection,
    isLoading: metaStatusLoading,
    isFetching: metaStatusFetching,
  } = useMetaConnectionStatus();
  
  const metaStatusPending = metaStatusLoading || metaStatusFetching;
  const hideMetaLeads = !metaStatusPending && !hasMetaConnection;

  const { data: leads, isLoading, error } = useLeads({
    ...filters,
    custom_fields: Object.keys(customFieldsFilters).length > 0 ? customFieldsFilters : undefined,
  });
  const updateLead = useUpdateLead();

  const boards = useMemo(() => {
    if (!leads) return BOARD_CONFIG.map(config => ({ ...config, cards: [] }));

    const filteredLeads = leads.filter(lead => {
      // Busca por título e campos customizados
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

      const matchesVisibility = hideMetaLeads
        ? (lead.source !== 'meta_ads' && !lead.campaign_id)
        : true;

      return matchesSearch && matchesVisibility;
    });

    // Ordenar por posição ou data (exemplo simples)
    const sortedLeads = [...filteredLeads].sort((a, b) => (a.position || 0) - (b.position || 0));

    return BOARD_CONFIG.map(config => ({
      ...config,
      cards: sortedLeads.filter(lead => lead.status === config.id)
    }));
  }, [leads, searchTerm, hideMetaLeads]);

  // Seleção em massa
  const selectionMode = selectedLeadIds.size > 0;
  const allLeadIds = useMemo(() => {
    return boards.flatMap(board => board.cards.map(card => card.id));
  }, [boards]);
  const allSelected = allLeadIds.length > 0 && allLeadIds.every(id => selectedLeadIds.has(id));
  const someSelected = Array.from(selectedLeadIds).some(id => allLeadIds.includes(id));

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

    try {
      // Otimisticamente atualiza UI (React Query fará revalidação)
      await updateLead.mutateAsync({
        id: draggableId,
        updates: {
          status: newStatus,
          position: destination.index
        }
      });

      if (oldStatus !== newStatus) {
        if (newStatus === 'fechado_ganho') {
          setShowCelebration(true);
        }
        
        const toBoard = BOARD_CONFIG.find(b => b.id === newStatus);
        toast({
          title: "Status atualizado",
          description: `Movido para ${toBoard?.title}`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao mover",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    }
  };

  if (error) {
     // Tratamento de erro simplificado para focar no UI
     return <div className="p-8 text-center text-red-500">Erro ao carregar leads. Tente recarregar.</div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 sm:p-6 overflow-hidden">
       {/* Background Ambient Effects - Glassmorphism Vibe */}
       <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-40" />
       </div>

      <div className="space-y-4 animate-fade-in relative z-10">
        {/* Header Section Compacto */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {/* Barra de busca */}
            <div className="relative flex-shrink-0 w-48 group">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-3.5 h-3.5" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2 bg-white/5 border-white/10 focus:border-primary/50 transition-all text-sm h-7"
              />
            </div>
            
            {/* Botões de ação */}
            <div className="flex gap-1 items-center flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-7 w-7 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                    className="h-7 w-7 border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => setIsImportOpen(true)}
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar Leads</TooltipContent>
              </Tooltip>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 items-center flex-shrink-0">
              <LeadsFiltersMinimal
                filters={filters}
                onFiltersChange={setFilters}
              />
              <LeadFiltersCompact
                filters={customFieldsFilters}
                onFiltersChange={setCustomFieldsFilters}
              />
            </div>
          </div>

          {/* Seleção em Massa - Header */}
          {selectionMode && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 mt-1">
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
              <span className="text-sm text-muted-foreground">
                {selectedLeadIds.size} {selectedLeadIds.size === 1 ? "lead selecionado" : "leads selecionados"}
              </span>
            </div>
          )}
        </div>

        {hideMetaLeads && (
          <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500">
            <AlertDescription className="flex justify-between items-center">
              <span>Leads do Meta Ads ocultos (integração pausada).</span>
              <Button variant="link" size="sm" className="text-amber-400 p-0 h-auto" asChild>
                <a href="/metricas">Reativar</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-8 min-h-[600px] items-start">
              {boards.map((board) => (
                <div key={board.id} className="min-w-[300px] w-[300px] flex flex-col gap-4">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${board.color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} style={{ boxShadow: `0 0 10px ${board.color}` }} />
                        <h3 className="font-medium text-sm text-foreground/90">{board.title}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {board.cards.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={board.id} type="CARD">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 rounded-xl transition-all duration-300 min-h-[150px]",
                          snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-transparent"
                        )}
                      >
                        {board.cards.map((lead, index) => (
                          <Draggable draggableId={lead.id} index={index} key={lead.id}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{ ...provided.draggableProps.style }}
                                className="mb-3"
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
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSave={handleNewLead}
      />
      <SpreadsheetImporter open={isImportOpen} onOpenChange={setIsImportOpen} />
      <CelebrationOverlay 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      {/* Barra de Ações em Massa */}
      <LeadsBulkActions
        selectedCount={selectedLeadIds.size}
        onEdit={() => setIsBulkEditOpen(true)}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedLeadIds(new Set())}
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
