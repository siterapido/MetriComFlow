import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, Loader2, Facebook, LayoutGrid, List, Upload } from "lucide-react";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { SpreadsheetImporter } from "@/components/leads/SpreadsheetImporter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useAdCampaigns } from "@/hooks/useMetaMetrics";
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
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_ads' | 'manual'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [showCelebration, setShowCelebration] = useState(false);
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

  const { data: leads, isLoading, error } = useLeads();
  const { data: campaigns } = useAdCampaigns(undefined, { enabled: hasMetaConnection });
  const updateLead = useUpdateLead();

  const boards = useMemo(() => {
    if (!leads) return BOARD_CONFIG.map(config => ({ ...config, cards: [] }));

    const filteredLeads = leads.filter(lead => {
      const matchesSearch = searchTerm
        ? lead.title.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesSource = sourceFilter === 'all'
        ? true
        : lead.source === sourceFilter;

      const matchesCampaign = campaignFilter === 'all'
        ? true
        : lead.campaign_id === campaignFilter;

      const matchesVisibility = hideMetaLeads
        ? (lead.source !== 'meta_ads' && !lead.campaign_id)
        : true;

      return matchesSearch && matchesSource && matchesCampaign && matchesVisibility;
    });

    // Ordenar por posição ou data (exemplo simples)
    const sortedLeads = [...filteredLeads].sort((a, b) => (a.position || 0) - (b.position || 0));

    return BOARD_CONFIG.map(config => ({
      ...config,
      cards: sortedLeads.filter(lead => lead.status === config.id)
    }));
  }, [leads, searchTerm, sourceFilter, campaignFilter, hideMetaLeads]);

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

      <div className="space-y-8 animate-fade-in relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Gestão de Leads
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
                Gerencie suas oportunidades com inteligência e agilidade.
            </p>
          </div>

          <div className="flex gap-3">
             <Button
              className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/20 backdrop-blur-sm transition-all hover:scale-105"
              onClick={() => setIsNewLeadModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4" />
            <Input
              placeholder="Buscar por nome, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/20 border-white/10 focus:border-primary/50 transition-all text-sm h-10"
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Select
              value={sourceFilter}
              onValueChange={(value) => setSourceFilter(value as any)}
            >
              <SelectTrigger className="w-[180px] bg-black/20 border-white/10 h-10">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Origem" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="meta_ads" disabled={hideMetaLeads}>Meta Ads</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            {hasMetaConnection && campaigns && campaigns.length > 0 && (
              <Select
                value={campaignFilter}
                onValueChange={setCampaignFilter}
              >
                <SelectTrigger className="w-[200px] bg-black/20 border-white/10 h-10">
                   <SelectValue placeholder="Campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Campanhas</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <span className="truncate max-w-[160px]">{campaign.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
                                <ModernLeadCard lead={lead} index={index} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Quick Add Button per Column (Optional) */}
                         <button
                          onClick={() => setIsNewLeadModalOpen(true)}
                          className="w-full py-3 rounded-xl border border-dashed border-white/10 text-muted-foreground/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs group"
                        >
                            <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
                            Adicionar
                        </button>
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
    </div>
  );
}
