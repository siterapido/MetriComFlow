import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, LayoutList, Filter, Upload } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { LeadsImportDialog } from "@/components/leads/LeadsImportDialog";
import { LeadCard } from "@/components/leads/LeadCard";
import { StageValueCard } from "@/components/leads/StageValueCard";
import { DateRangeFilter } from "@/components/meta-ads/DateRangeFilter";
import { useToast } from "@/hooks/use-toast";
import { useLeads, useUpdateLead, type Lead } from "@/hooks/useLeads";
import { useAdAccounts, useAdCampaigns, getLastNDaysDateRange } from "@/hooks/useMetaMetrics";
import type { FilterValues } from "@/components/meta-ads/MetaAdsFiltersV2";
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
  const { toast } = useToast();

  // Filters state (sem filtro de data por padrão - mostra todos os leads)
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: undefined, // Sem filtro de data - mostra todos os leads
  });

  // Fetch data
  const { data: leads, isLoading, error } = useLeads();
  const updateLead = useUpdateLead();
  const { data: accounts } = useAdAccounts();
  const { data: campaigns } = useAdCampaigns(filters.accountId);

  // Group leads by stage and calculate values
  const stageMetrics = useMemo(() => {
    if (!leads) return {};

    const filteredLeads = leads.filter((lead) => {
      // Filtro de busca
      const matchesSearch = searchTerm
        ? lead.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      // Filtro de data (verifica created_at)
      const matchesDate = (() => {
        if (filters.dateRange && lead.created_at) {
          // Comparar apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
          const createdAt = new Date(lead.created_at);
          const createdDateStr = createdAt.toISOString().split('T')[0];

          return createdDateStr >= filters.dateRange.start && createdDateStr <= filters.dateRange.end;
        }
        return true;
      })();

      // Filtro de conta Meta Ads
      const matchesAccount = filters.accountId
        ? lead.source === "meta_ads"
        : true;

      // Filtro de campanha Meta Ads
      const matchesCampaign = filters.campaignId
        ? lead.campaign_id === filters.campaignId
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
  }, [leads, searchTerm, filters]);

  const handleNewLead = () => {
    setIsNewLeadModalOpen(false);
    toast({
      title: "Lead criado com sucesso!",
      description: "O lead foi adicionado ao sistema.",
    });
  };

  // Exclusão é realizada dentro do LeadEditDialog

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
              <LayoutList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">CRM - Pipeline</h2>
              <p className="text-muted-foreground mt-1">
                Gestão horizontal de oportunidades e contratos
              </p>
            </div>
          </div>

          {/* Filters inline - Dashboard style */}
          <div className="flex flex-wrap gap-2">
            <DateRangeFilter
              value={filters.dateRange}
              onChange={(dateRange) => setFilters({ ...filters, dateRange })}
            />

            <Select
              value={filters.accountId || 'all'}
              onValueChange={(value) => setFilters({
                ...filters,
                accountId: value === 'all' ? undefined : value,
                campaignId: undefined
              })}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.business_name || account.external_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.accountId && (
              <Select
                value={filters.campaignId || 'all'}
                onValueChange={(value) => setFilters({
                  ...filters,
                  campaignId: value === 'all' ? undefined : value
                })}
              >
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Search and New Lead Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>

          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setIsNewLeadModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Importar planilha
          </Button>
        </div>
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
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "transition-all",
                                        snapshot.isDragging && "ring-2 ring-primary shadow-2xl scale-105 rotate-2"
                                      )}
                                    >
                                      <LeadCard
                                        lead={lead}
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
  <LeadsImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
  </div>
  );
}
