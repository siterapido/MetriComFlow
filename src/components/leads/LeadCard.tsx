import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, formatDistanceToNowStrict, addHours, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadEditDialog } from "./LeadEditDialog";
import type { Tables } from "@/lib/database.types";
import { stripNonNumeric, validatePhone } from "@/lib/cpf-cnpj-validator";
import { useUpdateLead } from "@/hooks/useLeads";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: Tables<"labels">;
  }>;
  comments?: Tables<"comments">[];
  ad_campaigns?: {
    name: string;
    external_id: string;
  } | null;
  // Optional fields that may exist in the schema
  phone?: string | null;
  contact_name?: string | null;
};

interface LeadCardProps {
  lead: Lead;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Lead>) => void;
  className?: string;
}

export function LeadCard({ lead, onDelete, onUpdate, className }: LeadCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [quickComment, setQuickComment] = useState("");
  const [linkFU, setLinkFU] = useState<boolean>(!!lead.next_follow_up_date);

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

  // Best-effort phone resolution (supports upcoming `phone` field or attempts to extract from description)
  const resolvedPhone = useMemo(() => {
    if (lead.phone && validatePhone(lead.phone)) return lead.phone as string;
    // Try to extract a phone from description (10-11 digit sequences common in BR)
    if (lead.description) {
      const digits = (lead.description.match(/\d[\d\s().-]{8,}\d/g) || [])
        .map((m) => stripNonNumeric(m))
        .find((n) => n.length === 10 || n.length === 11 || n.length === 12 || n.length === 13);
      if (digits) return digits;
    }
    return null;
  }, [lead.phone, lead.description]);

  const whatsappHref = useMemo(() => {
    if (!resolvedPhone) return null;
    const raw = stripNonNumeric(resolvedPhone);
    // If already includes country code (55..), keep; otherwise prefix BR code
    const withCC = raw.startsWith("55") ? raw : `55${raw}`;
    return `https://wa.me/${withCC}`;
  }, [resolvedPhone]);

  const SourceBadge = () => {
    const source = lead.source || "manual";
    const commonClasses = "text-[10px] px-1.5 py-0.5 border flex items-center gap-0.5 w-fit";
    switch (source) {
      case "meta_ads":
        return (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className={cn(
                commonClasses,
                "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              )}
            >
              <Facebook className="w-2.5 h-2.5" />
              Meta Ads
            </Badge>
            {lead.ad_campaigns?.name && (
              <Badge
                variant="outline"
                className="text-[10px] bg-primary/10 text-primary border-primary/30 px-1.5 py-0.5 max-w-[140px] truncate"
                title={lead.ad_campaigns.name}
              >
                {lead.ad_campaigns.name}
              </Badge>
            )}
          </div>
        );
      case "whatsapp":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-emerald-50 border-emerald-200 text-emerald-700")}>
            <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
          </Badge>
        );
      case "google_ads":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-yellow-50 border-yellow-200 text-yellow-700")}>
            <Megaphone className="w-2.5 h-2.5" /> Google Ads
          </Badge>
        );
      case "site":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-slate-50 border-slate-200 text-slate-700")}>
            <Globe className="w-2.5 h-2.5" /> Site
          </Badge>
        );
      case "email":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-indigo-50 border-indigo-200 text-indigo-700")}>
            <Mail className="w-2.5 h-2.5" /> E-mail
          </Badge>
        );
      case "telefone":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-zinc-50 border-zinc-200 text-zinc-700")}>
            <Phone className="w-2.5 h-2.5" /> Telefone
          </Badge>
        );
      case "indicacao":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700")}>
            <Users className="w-2.5 h-2.5" /> Indicação
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-muted/50 text-muted-foreground")}>
            Manual
          </Badge>
        );
    }
  };

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden bg-card hover:bg-accent/5 transition-all duration-300 border-border/60 hover:border-primary/30 hover:shadow-md cursor-pointer",
          className
        )}
        onClick={() => setIsEditOpen(true)}
      >
        {/* Hover Strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-all duration-300" />

        <CardContent className="p-3 space-y-3">
          {/* Header: Title & Actions */}
          <div className="flex items-start justify-between gap-2 pl-2">
            <div className="space-y-1 overflow-hidden">
              <h3 className="font-semibold text-sm text-foreground leading-tight truncate pr-2" title={lead.title}>
                {lead.title}
              </h3>
              {lead.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {lead.description}
                </p>
              )}
            </div>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-400 border border-emerald-200"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Value Section - Elegant Display */}
          <div className="bg-muted/40 rounded-md p-2 border border-border/40 flex items-center justify-between group-hover:bg-muted/60 transition-colors ml-2">
            <span className="text-[10px] text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
              Proposta
            </span>
            <span className="text-sm font-bold text-primary font-mono tracking-tight">
              {lead.value ? formatCurrency(lead.value) : "R$ 0,00"}
            </span>
          </div>

          {/* Badges & Tags */}
          <div className="flex flex-wrap gap-1.5 pl-2">
            <SourceBadge />
            {lead.lead_labels && lead.lead_labels.length > 0 && lead.lead_labels.map((labelRel, index) => (
              <Badge
                key={index}
                variant="outline"
                className={`text-[10px] px-1.5 py-0 border-transparent bg-opacity-15 font-normal ${getLabelColor(labelRel.labels.name)}`}
              >
                {labelRel.labels.name}
              </Badge>
            ))}
          </div>

          {/* Footer: Date, Comments, FollowUp */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30 pl-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              {lead.due_date && (
                <div className="flex items-center gap-1 text-[10px]" title="Data de vencimento">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(lead.due_date), "dd/MM", { locale: ptBR })}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px]" title="Comentários">
                <MessageSquare className="w-3 h-3" />
                <span>{lead.comments_count || 0}</span>
              </div>
            </div>

            {/* Follow Up Component */}
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
                          className="h-6 px-2 text-[10px] hover:bg-primary/5 hover:text-primary gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          Follow-up
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
                        <DropdownMenuItem onClick={() => {
                          const date = addDays(new Date(), 2);
                          updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                        }}>+2 dias</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const date = addDays(new Date(), 7);
                          updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
                        }}>+1 semana</DropdownMenuItem>
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
                          "h-6 px-2 text-[10px] gap-1 font-medium ring-1 ring-inset",
                          isLate ? "bg-destructive/10 text-destructive ring-destructive/20 hover:bg-destructive/20" :
                            isTodayFu ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 hover:bg-amber-500/20" :
                              "bg-blue-500/10 text-blue-600 ring-blue-500/20 hover:bg-blue-500/20"
                        )}
                      >
                        <Clock className="w-3 h-3" />
                        {format(fu, "dd/MM", { locale: ptBR })}
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
                          className="h-6 text-xs text-destructive hover:text-destructive"
                          onClick={() => updateLead.mutate({ id: lead.id, updates: { next_follow_up_date: null } })}
                        >
                          Remover Data
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

      {/* Edit Dialog */}
      <LeadEditDialog lead={lead} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}
