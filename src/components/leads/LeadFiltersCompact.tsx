import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export interface CustomFieldsFilters {
  Cidade?: string[];
  Estado?: string[];
  Porte?: string[];
  "Nome Fantasia"?: string;
}

interface LeadFiltersCompactProps {
  filters: CustomFieldsFilters;
  onFiltersChange: (filters: CustomFieldsFilters) => void;
}

export function LeadFiltersCompact({ filters, onFiltersChange }: LeadFiltersCompactProps) {
  const { data: org } = useActiveOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [nomeFantasiaSearch, setNomeFantasiaSearch] = useState(filters["Nome Fantasia"] || "");

  // Buscar valores únicos para os filtros
  const { data: uniqueValues } = useQuery({
    queryKey: ["lead-custom-fields-unique", org?.id],
    queryFn: async () => {
      if (!org?.id) return { cidades: [], estados: [], portes: [] };

      const { data: leads, error } = await supabase
        .from("leads")
        .select("custom_fields")
        .eq("organization_id", org.id)
        .not("custom_fields", "is", null);

      if (error) {
        console.error("Erro ao buscar valores únicos:", error);
        return { cidades: [], estados: [], portes: [] };
      }

      const cidades = new Set<string>();
      const estados = new Set<string>();
      const portes = new Set<string>();

      leads?.forEach((lead) => {
        const cf = lead.custom_fields as Record<string, any> | null;
        if (cf) {
          if (cf.Cidade && typeof cf.Cidade === "string") cidades.add(cf.Cidade);
          if (cf.Estado && typeof cf.Estado === "string") estados.add(cf.Estado);
          if (cf.Porte && typeof cf.Porte === "string") portes.add(cf.Porte);
        }
      });

      return {
        cidades: Array.from(cidades).sort(),
        estados: Array.from(estados).sort(),
        portes: Array.from(portes).sort(),
      };
    },
    enabled: !!org?.id,
  });

  const handleFilterChange = (field: keyof CustomFieldsFilters, value: string | string[] | undefined) => {
    const newFilters = { ...filters };
    
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[field];
    } else {
      (newFilters as any)[field] = value;
    }
    
    onFiltersChange(newFilters);
  };

  const handleMultiSelectChange = (field: "Cidade" | "Estado" | "Porte", value: string) => {
    const currentValues = (filters[field] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    
    handleFilterChange(field, newValues.length > 0 ? newValues : undefined);
  };

  const clearFilter = (field: keyof CustomFieldsFilters) => {
    handleFilterChange(field, undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setNomeFantasiaSearch("");
  };

  const hasActiveFilters = 
    (filters.Cidade?.length || 0) > 0 ||
    (filters.Estado?.length || 0) > 0 ||
    (filters.Porte?.length || 0) > 0 ||
    !!filters["Nome Fantasia"];

  // Atualizar filtro de Nome Fantasia quando o input mudar
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange("Nome Fantasia", nomeFantasiaSearch.trim() || undefined);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [nomeFantasiaSearch]);

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
              filters.Cidade?.length || 0,
              filters.Estado?.length || 0,
              filters.Porte?.length || 0,
              filters["Nome Fantasia"] ? 1 : 0,
            ].reduce((a, b) => a + b, 0)}
          </Badge>
        )}
      </Button>

      {/* Painel de Filtros */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[320px] bg-card border border-border rounded-lg shadow-lg p-4 z-50 space-y-4">
          {/* Busca por Nome Fantasia */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={nomeFantasiaSearch}
                onChange={(e) => setNomeFantasiaSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Filtro de Cidade */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cidade</Label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {uniqueValues?.cidades.map((cidade) => (
                <label
                  key={cidade}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(filters.Cidade || []).includes(cidade)}
                    onChange={() => handleMultiSelectChange("Cidade", cidade)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span>{cidade}</span>
                </label>
              ))}
              {(!uniqueValues?.cidades || uniqueValues.cidades.length === 0) && (
                <p className="text-xs text-muted-foreground">Nenhuma cidade encontrada</p>
              )}
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {uniqueValues?.estados.map((estado) => (
                <label
                  key={estado}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(filters.Estado || []).includes(estado)}
                    onChange={() => handleMultiSelectChange("Estado", estado)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span>{estado}</span>
                </label>
              ))}
              {(!uniqueValues?.estados || uniqueValues.estados.length === 0) && (
                <p className="text-xs text-muted-foreground">Nenhum estado encontrado</p>
              )}
            </div>
          </div>

          {/* Filtro de Porte */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Porte</Label>
            <div className="space-y-1">
              {uniqueValues?.portes.map((porte) => (
                <label
                  key={porte}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(filters.Porte || []).includes(porte)}
                    onChange={() => handleMultiSelectChange("Porte", porte)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span>{porte}</span>
                </label>
              ))}
              {(!uniqueValues?.portes || uniqueValues.portes.length === 0) && (
                <p className="text-xs text-muted-foreground">Nenhum porte encontrado</p>
              )}
            </div>
          </div>

          {/* Chips de Filtros Ativos */}
          {hasActiveFilters && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Filtros ativos:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  Limpar tudo
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.Cidade?.map((cidade) => (
                  <Badge
                    key={`cidade-${cidade}`}
                    variant="secondary"
                    className="text-xs h-5 px-1.5"
                  >
                    {cidade}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        const newCidades = filters.Cidade?.filter((c) => c !== cidade);
                        handleFilterChange("Cidade", newCidades?.length ? newCidades : undefined);
                      }}
                    />
                  </Badge>
                ))}
                {filters.Estado?.map((estado) => (
                  <Badge
                    key={`estado-${estado}`}
                    variant="secondary"
                    className="text-xs h-5 px-1.5"
                  >
                    {estado}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        const newEstados = filters.Estado?.filter((e) => e !== estado);
                        handleFilterChange("Estado", newEstados?.length ? newEstados : undefined);
                      }}
                    />
                  </Badge>
                ))}
                {filters.Porte?.map((porte) => (
                  <Badge
                    key={`porte-${porte}`}
                    variant="secondary"
                    className="text-xs h-5 px-1.5"
                  >
                    {porte}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        const newPortes = filters.Porte?.filter((p) => p !== porte);
                        handleFilterChange("Porte", newPortes?.length ? newPortes : undefined);
                      }}
                    />
                  </Badge>
                ))}
                {filters["Nome Fantasia"] && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {filters["Nome Fantasia"]}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => {
                        handleFilterChange("Nome Fantasia", undefined);
                        setNomeFantasiaSearch("");
                      }}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

