import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Calendar,
  User,
  Facebook,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Users,
  Megaphone,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadEditDialog } from "./LeadEditDialog";
import type { Tables } from "@/lib/database.types";
import { stripNonNumeric, validatePhone } from "@/lib/cpf-cnpj-validator";
import { getWhatsAppUrl } from "@/lib/whatsapp-utils";
import { useUpdateLead, useLeads } from "@/hooks/useLeads";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
  ad_campaigns?: {
    name: string;
    external_id: string;
  } | null;
  phone?: string | null;
  contact_name?: string | null;
  comments_count: number;
};

interface LeadCardProps {
  lead: Lead;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Lead>) => void;
  className?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

export const LeadCard = React.memo(({ lead, className, isSelected, onToggleSelect, selectionMode }: LeadCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const updateLead = useUpdateLead();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getLabelColor = (name: string) => {
    const colors: { [key: string]: string } = {
      Urgente: "bg-red-500/10 text-red-600 border-red-200",
      Comercial: "bg-blue-500/10 text-blue-600 border-blue-200",
      Reunião: "bg-purple-500/10 text-purple-600 border-purple-200",
      Desenvolvimento: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
      "Alta Prioridade": "bg-orange-500/10 text-orange-600 border-orange-200",
      Concluído: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      Faturado: "bg-zinc-500/10 text-zinc-600 border-zinc-200",
      Proposta: "bg-primary/10 text-primary border-primary/20",
      Negociação: "bg-amber-500/10 text-amber-600 border-amber-200",
      Contrato: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      "Baixa Prioridade": "bg-zinc-500/10 text-zinc-600 border-zinc-200",
    };
    return colors[name] || "bg-muted text-muted-foreground border-transparent";
  };

  const resolvedPhone = useMemo(() => {
    if (lead.phone && validatePhone(lead.phone)) return lead.phone;
    if (lead.description) {
      const digits = (lead.description.match(/\d[\d\s().-]{8,}\d/g) || [])
        .map((m) => stripNonNumeric(m))
        .find((n) => n.length >= 10 && n.length <= 13);
      if (digits) return digits;
    }
    return null;
  }, [lead.phone, lead.description]);

  const whatsappHref = useMemo(() => {
    return getWhatsAppUrl(resolvedPhone, '11', lead.title);
  }, [resolvedPhone, lead.title]);

  const SourceIcon = () => {
    const source = lead.source || "manual";
    switch (source) {
      case "meta_ads": return <Facebook className="w-3 h-3 text-blue-600" />;
      case "whatsapp": return <MessageCircle className="w-3 h-3 text-emerald-600" />;
      case "google_ads": return <Megaphone className="w-3 h-3 text-yellow-600" />;
      case "site": return <Globe className="w-3 h-3 text-slate-600" />;
      case "email": return <Mail className="w-3 h-3 text-indigo-600" />;
      case "telefone": return <Phone className="w-3 h-3 text-zinc-600" />;
      case "indicacao": return <Users className="w-3 h-3 text-fuchsia-600" />;
      default: return <User className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden bg-card hover:bg-accent/5 transition-all duration-200 border-border/40 hover:border-primary/20 hover:shadow-sm cursor-pointer",
          isSelected && "ring-1 ring-primary bg-primary/5 border-primary/30",
          className
        )}
        onClick={() => setIsEditOpen(true)}
      >
        {/* Selection Checkbox */}
        {(selectionMode || isSelected || onToggleSelect) && (
          <div
            className={cn(
              "absolute top-2.5 left-2.5 z-10 transition-opacity duration-200",
              isSelected || selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(lead.id)}
              className="h-3.5 w-3.5 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
        )}

        <CardContent className="p-3 space-y-2.5">
          {/* Header Area */}
          <div className={cn("space-y-1", (selectionMode || isSelected || onToggleSelect) ? "pl-5" : "")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <SourceIcon />
                <h3 className="font-semibold text-[13px] text-foreground leading-tight truncate" title={lead.title}>
                  {lead.title}
                </h3>
              </div>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {lead.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 opacity-70">
                {lead.description}
              </p>
            )}
          </div>

          {/* Value and Labels */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 min-w-0">
              {lead.lead_labels?.slice(0, 2).map((labelRel, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 font-normal border min-w-0 truncate max-w-[80px]",
                    getLabelColor(labelRel.labels.name)
                  )}
                >
                  {labelRel.labels.name}
                </Badge>
              ))}
              {lead.lead_labels && lead.lead_labels.length > 2 && (
                <span className="text-[9px] text-muted-foreground font-medium">+{lead.lead_labels.length - 2}</span>
              )}
            </div>
            <div className="shrink-0 text-[12px] font-bold text-foreground/80 bg-muted/30 px-2 py-0.5 rounded-sm border border-border/20">
              {lead.value ? formatCurrency(lead.value) : "R$ 0"}
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-2 border-t border-border/10">
            <div className="flex items-center gap-2.5 text-muted-foreground/60">
              {lead.due_date && (
                <div className="flex items-center gap-0.5 text-[10px]" title="Vencimento">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{format(new Date(lead.due_date), "dd/MM")}</span>
                </div>
              )}
              {lead.comments_count > 0 && (
                <div className="flex items-center gap-0.5 text-[10px]" title="Comentários">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>{lead.comments_count}</span>
                </div>
              )}
              {lead.assignee_name && (
                <div className="flex items-center gap-0.5 text-[10px] font-medium text-primary/70" title={`Responsável: ${lead.assignee_name}`}>
                  <User className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[60px]">{lead.assignee_name}</span>
                </div>
              )}
              <div className="flex items-center gap-0.5 text-[10px]" title="Criado em">
                <Clock className="w-2.5 h-2.5" />
                <span className="truncate max-w-[40px]">
                  {formatDistanceToNowStrict(new Date(lead.created_at), { addSuffix: false, locale: ptBR }).replace('atrás', '').trim()}
                </span>
              </div>
            </div>

            {/* Follow-up Action */}
            <div onClick={(e) => e.stopPropagation()}>
              {(() => {
                const fu = lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null;
                const isLate = fu && isPast(new Date(fu.toDateString())) && !isToday(fu);
                const isTodayFu = fu && isToday(fu);

                if (!fu) {
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          + Follow-up
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => {
                          const date = new Date();
                          updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                        }}>Hoje</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const date = addDays(new Date(), 1);
                          updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                        }}>Amanhã</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-5 px-1.5 text-[9px] font-medium rounded-sm ring-1 ring-inset",
                          isLate ? "bg-red-500/10 text-red-600 ring-red-500/20" :
                            isTodayFu ? "bg-amber-500/10 text-amber-600 ring-amber-500/20" :
                              "bg-blue-500/10 text-blue-600 ring-blue-500/20"
                        )}
                      >
                        {format(fu, "dd/MM")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarPicker
                        mode="single"
                        selected={fu}
                        onSelect={(date) => {
                          if (date) {
                            updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                          }
                        }}
                        initialFocus
                      />
                      <div className="p-2 border-t flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() => updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: null } })}
                        >
                          Remover
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      <LeadEditDialog lead={lead} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
});

LeadCard.displayName = "LeadCard";
