import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Calendar,
  User,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadEditDialog } from "./LeadEditDialog";
import type { Tables } from "@/lib/database.types";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
};

interface LeadCardProps {
  lead: Lead;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Lead>) => void;
  className?: string;
}

export function LeadCard({ lead, onDelete, onUpdate, className }: LeadCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const contractTypeLabels = {
    monthly: "Mensal",
    annual: "Anual",
    one_time: "Único",
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getLabelColor = (name: string) => {
    const colors: { [key: string]: string } = {
      Urgente: "bg-destructive text-destructive-foreground",
      Comercial: "bg-primary text-primary-foreground",
      Reunião: "bg-secondary text-secondary-foreground",
      Desenvolvimento: "bg-accent text-accent-foreground",
      "Alta Prioridade": "bg-warning text-warning-foreground",
      Concluído: "bg-success text-success-foreground",
      Faturado: "bg-muted text-muted-foreground",
      Proposta: "bg-primary text-primary-foreground",
      Negociação: "bg-accent text-accent-foreground",
      Contrato: "bg-success text-success-foreground",
      "Baixa Prioridade": "bg-muted text-muted-foreground",
    };
    return colors[name] || "bg-muted text-muted-foreground";
  };

  return (
    <>
      <Card
        className={cn(
          "bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer",
          className
        )}
        onClick={() => setIsEditOpen(true)}
      >
        <CardHeader className="pb-2 p-3">
          <CardTitle className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
            {lead.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 p-3 pt-0">
          {/* Description */}
          {lead.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {lead.description}
            </p>
          )}

          {/* Meta Ads Badge */}
          {lead.source === "meta_ads" && (
            <Badge
              variant="outline"
              className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-0.5 w-fit px-1.5 py-0.5"
            >
              <Facebook className="w-2.5 h-2.5" />
              Meta
            </Badge>
          )}

          {/* Labels */}
          {lead.lead_labels && lead.lead_labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.lead_labels.map((labelRel, index) => (
                <Badge
                  key={index}
                  className={`text-[10px] px-1.5 py-0.5 ${getLabelColor(labelRel.labels.name)}`}
                >
                  {labelRel.labels.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Contract Info - Compact */}
          {lead.contract_value && lead.contract_value > 0 && (
            <div className="space-y-0.5 p-1.5 bg-primary/5 rounded border border-primary/20">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {contractTypeLabels[lead.contract_type as keyof typeof contractTypeLabels] || "Único"}
                  {lead.contract_type === "monthly" && ` (${lead.contract_months || 1}x)`}
                </span>
                <span className="font-semibold text-primary">
                  {formatCurrency(lead.contract_value || 0)}
                </span>
              </div>
              {lead.value !== lead.contract_value && (
                <div className="text-[10px] font-semibold text-success flex items-center justify-end gap-0.5">
                  Total: {formatCurrency(lead.value || 0)}
                </div>
              )}
            </div>
          )}

          {/* Footer Info - Compact */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-2">
              {lead.due_date && (
                <div className="flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  {format(new Date(lead.due_date), "dd/MM", { locale: ptBR })}
                </div>
              )}
              <button
                onClick={() => setIsCommentsOpen(true)}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                {lead.comments_count || 0}
              </button>
            </div>

            {lead.assignee_name && (
              <div className="flex items-center gap-0.5">
                <User className="w-2.5 h-2.5" />
                <span className="truncate max-w-[60px]">{lead.assignee_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <LeadEditDialog lead={lead} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}
