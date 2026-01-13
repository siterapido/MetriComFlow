import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Filter, History, Loader2, Facebook, Upload, ArrowDown, RefreshCw } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { LeadImportModal } from "@/components/leads/LeadImportModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLeads, useUpdateLead, type LeadStatus, type LeadFilters } from "@/hooks/useLeads";
import { useLeadActivity } from "@/hooks/useLeads";
import type { Database } from "@/lib/database.types";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
import { LeadCard } from "@/components/leads/LeadCard";
import { BulkEditDialog } from "@/components/leads/BulkEditDialog";
import { useBulkDeleteLeads, type Lead } from "@/hooks/useLeads";
import { CheckCheckbox } from "@/components/ui/checkbox"; // Assuming this might be needed or just reused standard Checkbox logic if implemented in LeadCard. actually LeadCard has it.
// We need to implement the floating bar.
import { X, Edit, Trash2 } from "lucide-react";

const BOARD_CONFIG = [
  { id: "novo_lead", title: "Novo Lead" },
  { id: "qualificacao", title: "Qualificação" },
  { id: "reuniao", title: "Reunião" },
  { id: "proposta", title: "Proposta" },
  { id: "negociacao", title: "Negociação" },
  { id: "fechado_ganho", title: "Fechado - Ganho" },
  { id: "fechado_perdido", title: "Fechado - Perdido" }
];

interface KanbanColumnProps {
  status: string; // Using string to match BOARD_CONFIG id
  title: string;
  baseFilters: LeadFilters;
  onNewLead: () => void;
  selectedLeads: Set<string>;
  onToggleSelect: (id: string, shiftKey?: boolean) => void;
}

function KanbanColumn({ status, title, baseFilters, onNewLead, selectedLeads, onToggleSelect }: KanbanColumnProps) {
  const [limit, setLimit] = useState(50);

  // Reset limit when base filters change (except pagination)
  useEffect(() => {
    setLimit(50);
  }, [baseFilters.search, baseFilters.source, baseFilters.campaign_id, baseFilters.hideMetaLeads]);

  const filters = useMemo(() => ({
    ...baseFilters,
    status: status as LeadStatus,
    limit
  }), [baseFilters, status, limit]);

  const { data: leads, isLoading } = useLeads(filters);
  const hasMore = leads && leads.length >= limit;

  return (
    <div className="min-w-[320px] flex flex-col h-full">
      <Card className="flex flex-col h-full border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              {title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {leads?.length || 0}
            </Badge>
          </div>
        </CardHeader>

        <Droppable droppableId={status} type="CARD">
          {(provided, snapshot) => (
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-3 space-y-3 flex-1 overflow-y-auto min-h-[150px]",
                snapshot.isDraggingOver && "bg-primary/5"
              )}
            >
              {isLoading && limit === 50 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                </div>
              ) : (
                <>
                  {leads?.map((lead, index) => (
                    <Draggable draggableId={lead.id} index={index} key={lead.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{ ...provided.draggableProps.style }}
                          className="mb-3"
                        >
                          <LeadCard
                            lead={lead}
                            className={cn(
                              snapshot.isDragging && "ring-2 ring-primary rotate-2 shadow-xl opacity-90"
                            )}
                            isSelected={selectedLeads.has(lead.id)}
                            onToggleSelect={(id) => onToggleSelect(id)}
                            selectionMode={selectedLeads.size > 0}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}

                  {hasMore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setLimit(prev => prev + 50)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                      ) : (
                        <ArrowDown className="w-3 h-3 mr-2" />
                      )}
                      Carregar mais
                    </Button>
                  )}

                  {/* Add New Card Button - Only for first column usually, or strictly new_lead? 
                      The original design had it in every column. Keeping it. */}
                  <Button
                    variant="ghost"
                    className="w-full h-10 border border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all mt-2"
                    onClick={onNewLead}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </>
              )}
            </CardContent>
          )}
        </Droppable>
      </Card>
    </div>
  );
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_ads' | 'manual'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const { toast } = useToast();
  const bulkDelete = useBulkDeleteLeads();

  // Construct base filters to pass to columns AND for global selection
  const baseFilters = useMemo<LeadFilters>(() => ({
    search: searchTerm,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    campaign_id: campaignFilter === 'all' ? undefined : campaignFilter,
    hideMetaLeads
  }), [searchTerm, sourceFilter, campaignFilter, hideMetaLeads]);

  // Fetch all leads that match current filters for "Select All" functionality
  // Note: This fetches ALL leads matching filters, ignoring pagination for selection purposes
  const { data: allMatchingLeads } = useLeads(baseFilters);

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

  const handleSelectAll = () => {
    if (!allMatchingLeads) return;

    if (selectedLeads.size === allMatchingLeads.length) {
      handleClearSelection();
    } else {
      setSelectedLeads(new Set(allMatchingLeads.map(l => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;

    // Optimistic UI or wait for confirmation? Let's confirm via toast or just do it. 
    // Usually a confirmation dialog is better for delete.
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads?`)) return;

    try {
      await bulkDelete.mutateAsync(Array.from(selectedLeads));
      handleClearSelection();
    } catch (error) {
      // Error handling is inside the hook
    }
  };

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

  // Fetch aux data
  const { data: campaigns } = useAdCampaigns(undefined, { enabled: hasMetaConnection });
  type LeadActivity = Database['public']['Tables']['lead_activity']['Row']
  const { data: activitiesData } = useLeadActivity();
  const updateLead = useUpdateLead();

  const recentActivities = useMemo<LeadActivity[]>(() => {
    return (activitiesData ?? []).slice(0, 10)
  }, [activitiesData])

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
          description: `${fromBoard?.title} → ${toBoard?.title}`,
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

  // Construct base filters moved up

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
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
            variant="outline"
            className="gap-2"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Importar
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            title="Corrigir nomes dos leads (Nome Fantasia > Razão Social)"
            onClick={async () => {
              if (!allMatchingLeads) return;

              const updates = [];
              const isValidName = (name: string | null | undefined) => {
                return name && name.trim() !== '' && name.trim() !== '-';
              }

              toast({ title: "Verificando leads...", description: "Analisando consistência dos nomes..." });

              for (const lead of allMatchingLeads) {
                let newTitle = lead.title;

                const tradeName = (lead as any).trade_name;
                const legalName = (lead as any).legal_name;

                // Determine the desired name
                let desiredTitle = null;
                if (isValidName(tradeName)) {
                  desiredTitle = tradeName;
                } else if (isValidName(legalName)) {
                  desiredTitle = legalName;
                }

                // If we found a valid name, check if we need to update
                if (desiredTitle) {
                  // Update if current title is invalid ("-", empty) OR if it differs from the desired one
                  if (!isValidName(lead.title) || lead.title !== desiredTitle) {
                    newTitle = desiredTitle;
                  }
                }

                if (newTitle !== lead.title) {
                  updates.push({ id: lead.id, title: newTitle });
                }
              }

              if (updates.length === 0) {
                toast({ title: "Tudo certo", description: "Todos os leads já estão com os nomes corretos." });
                return;
              }

              toast({ title: "Atualizando...", description: `Corrigindo nomes de ${updates.length} leads...` });

              // Atualizar em lotes
              try {
                const BATCH_SIZE = 10;
                for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                  const chunk = updates.slice(i, i + BATCH_SIZE);
                  await Promise.all(chunk.map(u =>
                    updateLead.mutateAsync({ id: u.id, updates: { title: u.title } })
                  ));
                }
                toast({ title: "Sucesso", description: `${updates.length} leads atualizados.` });
                // Recarregar a página para garantir que tudo atualize visualmente
                window.location.reload();
              } catch (err) {
                toast({ title: "Erro", description: "Falha ao atualizar alguns leads.", variant: "destructive" });
              }
            }}
          >
            <RefreshCw className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
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
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="meta_ads" disabled={hideMetaLeads}>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Meta Ads
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Global Select All for Kanban */}
        {allMatchingLeads && allMatchingLeads.length > 0 && (
          <Button
            variant="outline"
            size="sm" // Changed form icon to sm to fit text if needed, maintaining style
            onClick={handleSelectAll}
            className={cn(
              "gap-2 ml-auto sm:ml-0", // Adjust spacing
              selectedLeads.size > 0 && selectedLeads.size === allMatchingLeads.length ? "bg-primary/10 border-primary text-primary" : ""
            )}
            title="Selecionar todos os leads filtrados"
          >
            {selectedLeads.size > 0 && selectedLeads.size === allMatchingLeads.length ? "Desmarcar todos" : "Selecionar todos"}
          </Button>
        )}

        {/* Campaign Filter */}
        {hasMetaConnection && campaigns && campaigns.length > 0 && (
          <Select
            value={campaignFilter}
            onValueChange={setCampaignFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Campanhas</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <span className="truncate max-w-[160px]" title={campaign.name}>
                    {campaign.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {hideMetaLeads && (
        <Alert className="shrink-0">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Leads vinculados a campanhas do Meta Ads estão ocultos até que a integração seja reativada. Eles permanecem salvos para uso futuro.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="/metricas">Reativar Meta Ads</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max px-1">
            {BOARD_CONFIG.map((board) => (
              <KanbanColumn
                key={board.id}
                title={board.title}
                status={board.id}
                baseFilters={baseFilters}
                onNewLead={() => setIsNewLeadModalOpen(true)}
                selectedLeads={selectedLeads}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Bulk Actions Floating Bar */}
      {selectedLeads.size > 0 && (
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
      )}

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedIds={Array.from(selectedLeads)}
        onSuccess={() => {
          handleClearSelection();
        }}
      />

      {/* Modal para Novo Lead */}
      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSave={handleNewLead}
      />

      {/* Modal para Importação */}
      <LeadImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />

      {/* Histórico de movimentações - Keeping slightly minimal here or moving to separate logic if needed, 
          but reducing prominence to focus on the board */}
      <div className="shrink-0 pt-4 border-t border-border">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold text-foreground">Histórico recente</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 py-2">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
            ) : (
              recentActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground mr-2">
                    {new Date(activity.created_at).toLocaleString("pt-BR")}
                  </span>
                  <span className="font-medium truncate">
                    "{activity.lead_title}" {activity.from_status} → {activity.to_status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
