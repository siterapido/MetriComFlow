import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Filter, Calendar, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useAdAccounts, useAdCampaigns } from "@/hooks/useMetaMetrics";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { supabase } from "@/lib/supabase";
import type { LeadFilters } from "@/hooks/useLeads";

const statusOptions = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_ganho", label: "Fechado - Ganho" },
  { value: "fechado_perdido", label: "Fechado - Perdido" },
  { value: "follow_up", label: "Follow Up" },
  { value: "aguardando_resposta", label: "Aguardando Resposta" },
];

const priorityOptions = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const sourceOptions = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "evento", label: "Evento" },
  { value: "manual", label: "Manual" },
];

interface LeadsFiltersMinimalProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

export function LeadsFiltersMinimal({ filters, onFiltersChange }: LeadsFiltersMinimalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [nomeFantasiaSearch, setNomeFantasiaSearch] = useState("");
  const { data: org } = useActiveOrganization();
  const { data: assignableUsers } = useAssignableUsers();
  const { hasActiveConnection } = useMetaConnectionStatus();
  const { data: accounts } = useAdAccounts();
  const { data: campaigns } = useAdCampaigns(filters.account_id, { enabled: hasActiveConnection });

  // Buscar valores únicos dos campos customizados
  const { data: customFieldsOptions } = useQuery({
    queryKey: ["lead-custom-fields-options", org?.id],
    queryFn: async () => {
      if (!org?.id) return { cidades: [], estados: [], portes: [], atividades: [] };

      const { data: leads, error } = await supabase
        .from("leads")
        .select("custom_fields")
        .eq("organization_id", org.id)
        .is("deleted_at", null)
        .not("custom_fields", "is", null);

      if (error) {
        console.error("Erro ao buscar valores únicos:", error);
        return { cidades: [], estados: [], portes: [], atividades: [] };
      }

      const cidades = new Set<string>();
      const estados = new Set<string>();
      const portes = new Set<string>();
      const atividades = new Set<string>();

      leads?.forEach((lead) => {
        const cf = lead.custom_fields as Record<string, any> | null;
        if (cf) {
          if (cf.Cidade && typeof cf.Cidade === "string") cidades.add(cf.Cidade);
          if (cf.Estado && typeof cf.Estado === "string") estados.add(cf.Estado);
          if (cf.Porte && typeof cf.Porte === "string") portes.add(cf.Porte);
          if (cf["Atividade Principal"] && typeof cf["Atividade Principal"] === "string") {
            atividades.add(cf["Atividade Principal"]);
          }
        }
      });

      return {
        cidades: Array.from(cidades).sort(),
        estados: Array.from(estados).sort(),
        portes: Array.from(portes).sort(),
        atividades: Array.from(atividades).sort(),
      };
    },
    enabled: !!org?.id,
  });

  const hasActiveFilters =
    !!filters.status ||
    !!filters.priority ||
    !!filters.source ||
    !!filters.assignee_id ||
    !!filters.campaign_id ||
    !!filters.account_id ||
    (filters.date_range?.start && filters.date_range?.end) ||
    (filters.custom_fields && Object.keys(filters.custom_fields).length > 0);

  const handleFilterChange = <K extends keyof LeadFilters>(
    key: K,
    value: LeadFilters[K] | undefined
  ) => {
    const newFilters = { ...filters };
    if (value === undefined || (typeof value === 'string' && value === 'all')) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearFilter = (key: keyof LeadFilters) => {
    handleFilterChange(key, undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    if (start && end) {
      handleFilterChange('date_range', {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      });
    } else {
      handleFilterChange('date_range', undefined);
    }
  };

  const dateRangeStart = filters.date_range?.start ? new Date(filters.date_range.start) : undefined;
  const dateRangeEnd = filters.date_range?.end ? new Date(filters.date_range.end) : undefined;

  return (
    <div className="relative">
      {/* Botão de Filtros */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 border-white/10 bg-black/20 hover:bg-black/30",
          hasActiveFilters && "border-primary/50 bg-primary/10"
        )}
      >
        <Filter className="w-4 h-4 mr-2" />
        Filtros
        {hasActiveFilters && (
          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
            {[
              filters.status ? 1 : 0,
              filters.priority ? 1 : 0,
              filters.source ? 1 : 0,
              filters.assignee_id ? 1 : 0,
              filters.campaign_id ? 1 : 0,
              filters.account_id ? 1 : 0,
              filters.date_range ? 1 : 0,
              filters.custom_fields ? Object.keys(filters.custom_fields).length : 0,
            ].reduce((a, b) => a + b, 0)}
          </Badge>
        )}
      </Button>

      {/* Painel de Filtros */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Painel com Tabs */}
          <div className="absolute top-full left-0 mt-2 w-[420px] bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl z-50 max-h-[85vh] flex flex-col">
            {/* Header com botão limpar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-xs font-medium text-muted-foreground">
                  {[
                    filters.status ? 1 : 0,
                    filters.priority ? 1 : 0,
                    filters.source ? 1 : 0,
                    filters.assignee_id ? 1 : 0,
                    filters.campaign_id ? 1 : 0,
                    filters.account_id ? 1 : 0,
                    filters.date_range ? 1 : 0,
                    filters.custom_fields ? Object.keys(filters.custom_fields).length : 0,
                  ].reduce((a, b) => a + b, 0)} filtro(s) ativo(s)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  Limpar tudo
                </Button>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                <TabsTrigger value="geral" className="text-xs">
                  <Filter className="w-3 h-3 mr-1.5" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="empresa" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1.5" />
                  Empresa
                </TabsTrigger>
              </TabsList>

              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Aba Geral */}
                <TabsContent value="geral" className="space-y-3 mt-0">
                  {/* Grid de 2 colunas para campos principais */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Status</label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prioridade */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Prioridade</label>
                      <Select
                        value={filters.priority || "all"}
                        onValueChange={(value) => handleFilterChange('priority', value === 'all' ? undefined : value as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Origem e Responsável */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Origem */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Origem</label>
                      <Select
                        value={filters.source || "all"}
                        onValueChange={(value) => handleFilterChange('source', value === 'all' ? undefined : value as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {sourceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Responsável */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Responsável</label>
                      <Select
                        value={filters.assignee_id || "all"}
                        onValueChange={(value) => handleFilterChange('assignee_id', value === 'all' ? undefined : value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {assignableUsers?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Conta Meta Ads e Campanha */}
                  {hasActiveConnection && accounts && accounts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Conta Meta Ads */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">Conta Meta Ads</label>
                        <Select
                          value={filters.account_id || "all"}
                          onValueChange={(value) => {
                            handleFilterChange('account_id', value === 'all' ? undefined : value);
                            // Limpar campanha quando mudar a conta
                            if (value === 'all' || value !== filters.account_id) {
                              handleFilterChange('campaign_id', undefined);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Todas as contas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as contas</SelectItem>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <span className="truncate max-w-[150px]">{account.business_name || account.external_id}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campanha */}
                      {filters.account_id && campaigns && campaigns.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Campanha</label>
                          <Select
                            value={filters.campaign_id || "all"}
                            onValueChange={(value) => handleFilterChange('campaign_id', value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {campaigns.map((campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  <span className="truncate max-w-[150px]">{campaign.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data de Criação */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Período</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-8 justify-start text-left font-normal text-xs",
                            !dateRangeStart && !dateRangeEnd && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-3 w-3" />
                          {dateRangeStart && dateRangeEnd
                            ? `${format(dateRangeStart, "dd/MM", { locale: ptBR })} - ${format(dateRangeEnd, "dd/MM", { locale: ptBR })}`
                            : "Todo o período"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="range"
                          selected={{
                            from: dateRangeStart,
                            to: dateRangeEnd,
                          }}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              handleDateRangeChange(range.from, range.to);
                            } else if (range?.from) {
                              handleDateRangeChange(range.from, undefined);
                            } else {
                              handleDateRangeChange(undefined, undefined);
                            }
                          }}
                          locale={ptBR}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </TabsContent>

                {/* Aba Empresa */}
                <TabsContent value="empresa" className="space-y-3 mt-0">
                  {/* Nome Fantasia */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Nome Fantasia</label>
                    <Input
                      type="text"
                      placeholder="Buscar..."
                      value={nomeFantasiaSearch}
                      onChange={(e) => {
                        setNomeFantasiaSearch(e.target.value);
                        handleFilterChange('custom_fields', {
                          ...filters.custom_fields,
                          "Nome Fantasia": e.target.value || undefined,
                        });
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Grid de 2 colunas para Cidade/Estado */}
                  {(customFieldsOptions?.cidades.length > 0 || customFieldsOptions?.estados.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Cidade */}
                      {customFieldsOptions && customFieldsOptions.cidades.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Cidade</label>
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                            {customFieldsOptions.cidades.map((cidade) => {
                              const isSelected = (filters.custom_fields?.Cidade as string[] || []).includes(cidade);
                              return (
                                <div key={cidade} className="flex items-center gap-1.5">
                                  <Checkbox
                                    id={`cidade-${cidade}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const currentCidades = (filters.custom_fields?.Cidade as string[]) || [];
                                      const newCidades = checked
                                        ? [...currentCidades, cidade]
                                        : currentCidades.filter((c) => c !== cidade);
                                      
                                      handleFilterChange('custom_fields', {
                                        ...filters.custom_fields,
                                        Cidade: newCidades.length > 0 ? newCidades : undefined,
                                      });
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <Label htmlFor={`cidade-${cidade}`} className="text-xs cursor-pointer flex-1 truncate">
                                    {cidade}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Estado */}
                      {customFieldsOptions && customFieldsOptions.estados.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">Estado</label>
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                            {customFieldsOptions.estados.map((estado) => {
                              const isSelected = (filters.custom_fields?.Estado as string[] || []).includes(estado);
                              return (
                                <div key={estado} className="flex items-center gap-1.5">
                                  <Checkbox
                                    id={`estado-${estado}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const currentEstados = (filters.custom_fields?.Estado as string[]) || [];
                                      const newEstados = checked
                                        ? [...currentEstados, estado]
                                        : currentEstados.filter((e) => e !== estado);
                                      
                                      handleFilterChange('custom_fields', {
                                        ...filters.custom_fields,
                                        Estado: newEstados.length > 0 ? newEstados : undefined,
                                      });
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <Label htmlFor={`estado-${estado}`} className="text-xs cursor-pointer flex-1 truncate">
                                    {estado}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Porte */}
                  {customFieldsOptions && customFieldsOptions.portes.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Porte</label>
                      <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                        <div className="grid grid-cols-2 gap-1.5">
                          {customFieldsOptions.portes.map((porte) => {
                            const isSelected = (filters.custom_fields?.Porte as string[] || []).includes(porte);
                            return (
                              <div key={porte} className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`porte-${porte}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const currentPortes = (filters.custom_fields?.Porte as string[]) || [];
                                    const newPortes = checked
                                      ? [...currentPortes, porte]
                                      : currentPortes.filter((p) => p !== porte);
                                    
                                    handleFilterChange('custom_fields', {
                                      ...filters.custom_fields,
                                      Porte: newPortes.length > 0 ? newPortes : undefined,
                                    });
                                  }}
                                  className="h-3.5 w-3.5"
                                />
                                <Label htmlFor={`porte-${porte}`} className="text-xs cursor-pointer flex-1 truncate">
                                  {porte}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}

