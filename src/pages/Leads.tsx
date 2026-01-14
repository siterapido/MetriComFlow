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
import { Plus, Search, Filter, History, Loader2, Facebook, Upload, ArrowDown, RefreshCw, User, Users } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { LeadImportModal } from "@/components/leads/LeadImportModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLeads, useUpdateLead, type LeadStatus, type LeadFilters } from "@/hooks/useLeads";
import { useLeadActivity } from "@/hooks/useLeads";
import { useBulkDeleteLeads, type Lead } from "@/hooks/useLeads";
import { LeadCard } from "@/components/leads/LeadCard";
import { BulkEditDialog } from "@/components/leads/BulkEditDialog";
import { LeadDistributionModal } from "@/components/leads/LeadDistributionModal";

// We need to implement the floating bar.
import { X, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const observerTarget = React.useRef<HTMLDivElement>(null);

  // Reset limit when base filters change
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

  // Infinite Scroll Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setLimit(prev => prev + 50);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading]);

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
                "p-3 space-y-3 flex-1 overflow-y-auto min-h-[150px] scrollbar-thin scrollbar-thumb-border/40",
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
                            lead={lead as any}
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

                  {/* Infinite Scroll Sentinel */}
                  <div ref={observerTarget} className="h-4 flex items-center justify-center">
                    {isLoading && hasMore && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Add New Card Button */}
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

  // Header compacting and grouping
  const baseFilters = useMemo<LeadFilters>(() => ({
    search: searchTerm,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    campaign_id: campaignFilter === 'all' ? undefined : campaignFilter,
  }), [searchTerm, sourceFilter, campaignFilter]);

  // Fetch only IDs for bulk selection? No, the hook fetches everything. 
  // Let's at least ensure we don't trigger too many re-renders.
  const { data: allMatchingLeads } = useLeads(baseFilters);

  const handleToggleSelect = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => setSelectedLeads(new Set());

  const handleSelectAll = () => {
    if (!allMatchingLeads) return;
    if (selectedLeads.size === allMatchingLeads.length) handleClearSelection();
    else setSelectedLeads(new Set(allMatchingLeads.map(l => l.id)));
  };

  const [isDistributeOpen, setIsDistributeOpen] = useState(false);

  const handleSelectCount = (count: number) => {
    if (!allMatchingLeads) return;
    const toSelect = allMatchingLeads.slice(0, count);
    setSelectedLeads(new Set(toSelect.map(l => l.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads?`)) return;
    try {
      await bulkDelete.mutateAsync(Array.from(selectedLeads));
      handleClearSelection();
    } catch (error) { }
  };

  const updateLead = useUpdateLead();
  const { data: activitiesData } = useLeadActivity();

  const recentActivities = useMemo(() => (activitiesData ?? []).slice(0, 3), [activitiesData]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as LeadStatus;
    const oldStatus = source.droppableId;

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-2 animate-in fade-in duration-500">
      {/* Ultra-Minimalist Control Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-muted/10 p-1 rounded-md border border-border/20">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-[11px] bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/10"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {allMatchingLeads && allMatchingLeads.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(
                  "h-7 text-[10px] gap-1.5 font-medium hover:bg-primary/5 px-2",
                  selectedLeads.size > 0 ? "text-primary" : "text-muted-foreground"
                )}>
                  {selectedLeads.size > 0 ? `Selecionados (${selectedLeads.size})` : "Selecionar"}
                  <ArrowDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleSelectAll}>
                  {selectedLeads.size === allMatchingLeads.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  <span className="ml-auto text-xs opacity-50">({allMatchingLeads.length})</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelectCount(10)}>
                  Selecionar 10
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelectCount(30)}>
                  Selecionar 30
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleSelectCount(50)}>
                  Selecionar 50
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="w-px h-3 bg-border/20 mx-0.5" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1.5 text-primary hover:text-primary hover:bg-primary/5 transition-colors border border-primary/20"
              onClick={() => setIsDistributeOpen(true)}
            >
              <Users className="w-3 h-3" />
              Distribuição
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-3 h-3" />
              Importar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 px-3 text-[10px] gap-1.5 shadow-none font-medium h-7"
              onClick={() => setIsNewLeadModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Novo Lead
            </Button>
          </div>

          <div className="w-px h-3 bg-border/20 mx-0.5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <Filter className="w-3 h-3" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="p-2 space-y-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">Origem</span>
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-1.5 border-t mt-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      if (!allMatchingLeads) return;
                      const updates = allMatchingLeads.filter(l => {
                        const trade = (l as any).trade_name;
                        const legal = (l as any).legal_name;
                        const desired = trade || legal;
                        return desired && l.title !== desired;
                      }).map(l => ({ id: l.id, title: (l as any).trade_name || (l as any).legal_name }));

                      if (updates.length > 0) {
                        toast({ title: "Corrigindo nomes...", description: `${updates.length} leads sendo atualizados.` });
                        const chunks = [];
                        for (let i = 0; i < updates.length; i += 10) chunks.push(updates.slice(i, i + 10));
                        for (const chunk of chunks) await Promise.all(chunk.map(u => updateLead.mutateAsync({ id: u.id, updates: { title: u.title } })));
                        window.location.reload();
                      } else {
                        toast({ title: "Tudo certo", description: "Nomes consistentes." });
                      }
                    }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Corrigir Nomes
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0 relative">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="absolute inset-0 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
            <div className="flex gap-4 h-full min-w-max px-1">
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
      </div>

      {/* Floating Action Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-bold px-2 py-0.5 bg-primary/20 text-primary rounded-full">
            {selectedLeads.size}
          </span>
          <div className="flex items-center gap-1 border-l border-white/10 dark:border-black/10 pl-4">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-2 hover:bg-white/5 active:bg-white/10" onClick={() => setIsBulkEditOpen(true)}>
              <Edit className="w-3.5 h-3.5" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-2 rounded-full hover:bg-white/5" onClick={handleClearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Modals & Dialogs */}
      <BulkEditDialog
        open={isBulkEditOpen || isDistributeOpen}
        onOpenChange={(open) => {
          setIsBulkEditOpen(open);
          if (!open) setIsDistributeOpen(false);
        }}
        selectedIds={Array.from(selectedLeads)}
        onSuccess={handleClearSelection}
        initialField={isDistributeOpen ? "assignee" : undefined}
      />
      <NewLeadModal open={isNewLeadModalOpen} onOpenChange={setIsNewLeadModalOpen} onSave={() => toast({ title: "Sucesso", description: "Lead criado!" })} />
      <LeadImportModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
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

      {/* Footer Activities */}
      <div className="flex items-center gap-4 px-2 py-1 bg-muted/5 rounded-md border border-border/20 text-[10px] text-muted-foreground overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0 opacity-80">
          <History className="w-3 h-3" />
          <span className="font-bold uppercase tracking-wider">Histórico:</span>
        </div>
        <div className="flex gap-4 overflow-hidden mask-fade-right">
          {recentActivities.length === 0 ? (
            <span>Nenhuma atividade recente.</span>
          ) : (
            recentActivities.map(activity => (
              <div key={activity.id} className="flex items-center gap-2 whitespace-nowrap">
                <span className="opacity-50">{format(new Date(activity.created_at), "HH:mm")}</span>
                <span className="font-medium">"{activity.lead_title}"</span>
                <span className="opacity-70">{activity.from_status} → {activity.to_status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
