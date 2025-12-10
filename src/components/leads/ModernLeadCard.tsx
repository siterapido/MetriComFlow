import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Calendar,
  User,
  Clock,
  Edit2,
  Building2,
  MapPin,
  Briefcase,
  Facebook,
  Phone,
  Mail,
  Globe,
  Users,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadDetailsSheet } from "./LeadDetailsSheet";
import { getLeadDisplayName } from "@/lib/leadUtils";
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
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type Lead = Tables<"leads"> & {
  lead_labels?: Array<{
    labels: {
      id: string;
      name: string;
      color?: string | null;
      created_at?: string;
    };
  }>;
  comments?: Tables<"comments">[];
  ad_campaigns?: {
    name: string;
    external_id: string;
  } | null;
  // Optional fields that may exist in the schema
  phone?: string | null;
  contact_name?: string | null;
  custom_fields?: Record<string, any> | null;
  source?: string | null;
  contract_value?: number | null;
  contract_type?: string | null;
  contract_months?: number | null;
  next_follow_up_date?: string | null;
  description?: string | null;
  status?: string | null;
  value?: number | null;
  due_date?: string | null;
  comments_count?: number | null;
  assignee_name?: string | null;
  id?: string;
  title?: string;
  created_at?: string;
  organization_id: string;
};

interface ModernLeadCardProps {
  lead: Lead;
  index: number;
  isSelected?: boolean;
  onToggleSelection?: (leadId: string) => void;
  selectionMode?: boolean;
  onUpdate?: (id: string, data: Partial<Lead>) => void;
  className?: string;
}

export function ModernLeadCard({
  lead,
  index,
  isSelected = false,
  onToggleSelection,
  selectionMode = false,
  onUpdate,
  className
}: ModernLeadCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [quickComment, setQuickComment] = useState("");
  const [linkFU, setLinkFU] = useState<boolean>(!!lead.next_follow_up_date);

  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isWon = lead.status === 'fechado_ganho';

  // Cores modernas para labels
  const getLabelColor = (name: string) => {
    const colors: { [key: string]: string } = {
      Urgente: "bg-red-500/10 text-red-400 border-red-500/20",
      Comercial: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Reunião: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      Desenvolvimento: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      "Alta Prioridade": "bg-orange-500/10 text-orange-400 border-orange-500/20",
      Concluído: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Faturado: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      Proposta: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      Negociação: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      Contrato: "bg-green-500/10 text-green-400 border-green-500/20",
      "Baixa Prioridade": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return colors[name] || "bg-white/5 text-muted-foreground border-white/10";
  };

  // Best-effort phone resolution (supports upcoming `phone` field or attempts to extract from description or custom_fields)
  const resolvedPhone = useMemo(() => {
    if (lead.phone && validatePhone(lead.phone)) return lead.phone as string;
    // Check custom_fields
    if (lead.custom_fields?.phone && validatePhone(lead.custom_fields.phone)) return lead.custom_fields.phone as string;
    if (lead.custom_fields?.["Telefone Principal"] && validatePhone(lead.custom_fields["Telefone Principal"]))
      return lead.custom_fields["Telefone Principal"] as string;
    // Try to extract a phone from description (10-11 digit sequences common in BR)
    if (lead.description) {
      const digits = (lead.description.match(/\d[\d\s().-]{8,}\d/g) || [])
        .map((m) => stripNonNumeric(m))
        .find((n) => n.length === 10 || n.length === 11 || n.length === 12 || n.length === 13);
      if (digits) return digits;
    }
    return null;
  }, [lead.phone, lead.description, lead.custom_fields]);

  const whatsappHref = useMemo(() => {
    if (!resolvedPhone) return null;
    const raw = stripNonNumeric(resolvedPhone);
    // If already includes country code (55..), keep; otherwise prefix BR code
    const withCC = raw.startsWith("55") ? raw : `55${raw}`;
    return `https://wa.me/${withCC}`;
  }, [resolvedPhone]);

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
          <Badge variant="outline" className={cn(commonClasses, "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300")}>
            <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
          </Badge>
        );
      case "google_ads":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300")}>
            <Megaphone className="w-2.5 h-2.5" /> Google Ads
          </Badge>
        );
      case "site":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300")}>
            <Globe className="w-2.5 h-2.5" /> Site
          </Badge>
        );
      case "email":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300")}>
            <Mail className="w-2.5 h-2.5" /> E-mail
          </Badge>
        );
      case "telefone":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300")}>
            <Phone className="w-2.5 h-2.5" /> Telefone
          </Badge>
        );
      case "indicacao":
        return (
          <Badge variant="outline" className={cn(commonClasses, "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-950 dark:border-fuchsia-800 dark:text-fuchsia-300")}>
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
      <motion.div
        layoutId={lead.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        className="relative group mb-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          // Se estiver em modo de seleção e clicar no checkbox, não abrir o modal
          if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
            return;
          }
          if (!selectionMode) {
            setIsEditOpen(true);
          }
        }}
      >
        {/* Victory Glow Effect - Only for Won Leads */}
        {isWon && (
          <>
            <motion.div
              className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-75 blur-md z-[-1]"
              animate={{
                opacity: [0.5, 0.8, 0.5],
                rotate: [0, 1, 0, -1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-400/20 via-white/20 to-emerald-400/20 z-[-1]"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ backgroundSize: "200% 200%" }}
            />
          </>
        )}

        {/* Glow Effect on Hover (Only if not won) */}
        {!isWon && (
          <div
            className={cn(
              "absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm",
              isHovered && "animate-pulse"
            )}
          />
        )}

        {/* Card Content */}
        <div className={cn(
          "relative bg-card backdrop-blur-md rounded-xl p-4 shadow-lg overflow-hidden transition-all duration-300",
          isWon
            ? "border-2 border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
            : "border border-border hover:border-primary/30 hover:shadow-xl",
          isSelected && "ring-2 ring-primary ring-offset-2",
          selectionMode ? "cursor-default" : "cursor-pointer"
        )}>

          {/* Checkbox de Seleção */}
          {selectionMode && onToggleSelection && (
            <div
              className="absolute top-3 left-3 z-20"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(lead.id);
              }}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(lead.id)}
                className="h-5 w-5 border-2"
              />
            </div>
          )}

          {/* Victory Shine Effect */}
          {isWon && (
            <motion.div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)",
                backgroundSize: "200% 100%",
              }}
              animate={{
                backgroundPosition: ["200% 0", "-200% 0"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Header: Title */}
          <div className={cn("mb-3 relative z-10", selectionMode && onToggleSelection && "pl-8")}>
            <h3 className="font-semibold text-sm text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {getLeadDisplayName(lead as any)}
            </h3>
          </div>

          {/* Body: Custom Fields - Company Info */}
          {lead.custom_fields && (
            <div className="space-y-2 mb-3 text-[11px] relative z-10">
              {/* Nome Fantasia */}
              {(() => {
                let nomeFantasia = lead.custom_fields?.["Nome Fantasia"];
                const razaoSocial = lead.custom_fields?.["Razão Social"];

                // Se nome fantasia for "-", substitui pela razão social
                if (nomeFantasia && String(nomeFantasia).trim() === "-" && razaoSocial) {
                  nomeFantasia = razaoSocial;
                }

                return nomeFantasia &&
                  String(nomeFantasia).trim() !== "" &&
                  String(nomeFantasia).trim() !== "0" &&
                  String(nomeFantasia).trim() !== "-" ? (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground/90 truncate">
                        {nomeFantasia}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Cidade / Estado */}
              {(lead.custom_fields.Cidade || lead.custom_fields.Estado) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {[lead.custom_fields.Cidade, lead.custom_fields.Estado]
                      .filter(v => v && String(v).trim() !== "" && String(v).trim() !== "0")
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Capital Social */}
              {lead.custom_fields["Capital Social"] &&
                String(lead.custom_fields["Capital Social"]).trim() !== "" &&
                String(lead.custom_fields["Capital Social"]).trim() !== "0" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px]">
                      Capital: {lead.custom_fields["Capital Social"]}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Description - com validação para não exibir apenas "0" */}
          {lead.description && lead.description.trim() && lead.description.trim() !== "0" && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 relative z-10">
              {lead.description}
            </p>
          )}

          {/* Source Badge - Only show if not manual */}
          {lead.source && lead.source !== 'manual' && (
            <div className="mb-3 relative z-10">
              <SourceBadge />
            </div>
          )}

          {/* Contract Info - Minimalist */}
          {((lead.value || 0) > 0 || (lead.contract_value || 0) > 0) && (
            <div className="flex items-center justify-between p-2 py-1.5 bg-primary/5 rounded border border-primary/10 mb-3 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-medium text-muted-foreground">
                  {contractTypeLabels[lead.contract_type as keyof typeof contractTypeLabels] || "Único"}
                </span>
                {lead.contract_type === "monthly" && (lead.contract_months || 1) > 1 && (
                  <span className="text-[9px] px-1 rounded-sm bg-background/50 border border-border/50 text-muted-foreground">
                    {lead.contract_months}x
                  </span>
                )}
              </div>
              <div className="text-right leading-tight">
                <div className="font-bold text-sm text-primary/90">
                  {formatCurrency(lead.contract_value || lead.value || 0)}
                </div>
                {(lead.contract_value || 0) > 0 && lead.value !== lead.contract_value && (
                  <div className="text-[9px] text-muted-foreground/70">
                    Total: {formatCurrency(lead.value || 0)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col gap-3 pt-3 border-t border-border/50 relative z-10">
            {/* Row 1: Data, Comments, Follow-up */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Data com badge contextual */}
              {lead.due_date && (() => {
                const dueDate = new Date(lead.due_date);
                const isOverdue = isPast(new Date(dueDate.toDateString())) && !isToday(dueDate);
                const isDueToday = isToday(dueDate);

                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-6 px-2 border font-medium flex items-center gap-1",
                      isOverdue && "bg-red-500/10 text-red-500 border-red-500/30 dark:bg-red-950/30 dark:text-red-400",
                      isDueToday && "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400",
                      !isOverdue && !isDueToday && "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-400"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {format(dueDate, "dd/MM", { locale: ptBR })}
                  </Badge>
                );
              })()}

              {/* Comentários */}
              {(lead.comments_count || 0) > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-6 px-2 border font-medium flex items-center gap-1 bg-purple-500/10 text-purple-600 border-purple-500/30 dark:bg-purple-950/30 dark:text-purple-400"
                >
                  <MessageSquare className="w-3 h-3" />
                  {lead.comments_count}
                </Badge>
              )}

              {/* Follow-up melhorado */}
              {(() => {
                const fu = lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null;
                const label = fu ? formatDistanceToNowStrict(fu, { locale: ptBR, addSuffix: true }) : null;
                const isOverdue = fu ? (isPast(new Date(fu.toDateString())) && !isToday(fu)) : false;
                const isDueToday = fu ? isToday(fu) : false;
                const base = fu || new Date();

                const snooze = async (days: number) => {
                  const next = addDays(base, days);
                  try {
                    await updateLead.mutateAsync({ id: lead.id!, updates: { next_follow_up_date: next.toISOString().split("T")[0] } as any });
                    toast({ title: "Follow-up reagendado", description: format(next, "dd/MM/yyyy", { locale: ptBR }) });
                  } catch (e) {
                    // handled upstream
                  }
                };

                const clearFU = async () => {
                  try {
                    await updateLead.mutateAsync({ id: lead.id!, updates: { next_follow_up_date: null } as any });
                    toast({ title: "Follow-up limpo" });
                  } catch (e) {
                    // no-op
                  }
                };

                // Sem follow-up: botão para adicionar
                if (!fu) {
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-6 px-2 border font-medium flex items-center gap-1 cursor-pointer hover:bg-accent/50 transition-colors bg-muted/30 text-muted-foreground border-border"
                          >
                            <Clock className="w-3 h-3" />
                            Follow-up
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-card border-border text-foreground">
                          <DropdownMenuItem onClick={() => snooze(0)} className="cursor-pointer">Hoje</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(1)} className="cursor-pointer">Amanhã</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(2)} className="cursor-pointer">+2 dias</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(7)} className="cursor-pointer">Próx. semana</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(30)} className="cursor-pointer">+30 dias</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                }

                // Com follow-up: badge clicável
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-6 px-2 border font-medium flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                          isOverdue && "bg-red-500/10 text-red-500 border-red-500/30 dark:bg-red-950/30 dark:text-red-400",
                          isDueToday && "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-400",
                          !isOverdue && !isDueToday && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        title="Alterar follow-up"
                      >
                        <Clock className="w-3 h-3" />
                        {label}
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="p-2 bg-card border-border w-72" align="center" side="right" sideOffset={8} collisionPadding={10}>
                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="text-xs text-muted-foreground mr-1">Agendar rápido:</span>
                        {[
                          { label: 'Hoje', days: 0 },
                          { label: 'Amanhã', days: 1 },
                          { label: '+2d', days: 2 },
                          { label: '+7d', days: 7 },
                          { label: '+30d', days: 30 },
                        ].map((opt) => (
                          <Button
                            key={opt.label}
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => snooze(opt.days)}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      <div className="rounded-md border border-border/60 overflow-hidden">
                        <CalendarPicker
                          mode="single"
                          selected={fu}
                          onSelect={async (date) => {
                            if (!date) return;
                            try {
                              await updateLead.mutateAsync({ id: lead.id!, updates: { next_follow_up_date: date.toISOString().split('T')[0] } as any });
                              toast({ title: 'Follow-up atualizado', description: format(date, 'dd/MM/yyyy', { locale: ptBR }) });
                            } catch (e) {
                              // no-op
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="space-y-1">
                          <Textarea
                            value={quickComment}
                            onChange={(e) => setQuickComment(e.target.value)}
                            placeholder="Adicionar comentário..."
                            className="bg-input border-border text-xs min-h-[60px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox id={`linkfu-${lead.id}`} checked={linkFU} onCheckedChange={(v) => setLinkFU(Boolean(v))} />
                              <label htmlFor={`linkfu-${lead.id}`} className="cursor-pointer">Vincular ao follow-up</label>
                            </div>
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={!quickComment.trim()}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const displayName = (user?.user_metadata as any)?.full_name || user?.email || 'Usuário';
                                const content = linkFU && fu
                                  ? `Follow-up (${format(fu, 'dd/MM/yyyy', { locale: ptBR })}): ${quickComment.trim()}`
                                  : quickComment.trim();
                                const { error } = await supabase.from('comments').insert({
                                  lead_id: lead.id!,
                                  content,
                                  user_name: displayName,
                                  user_id: user?.id!,
                                  organization_id: lead.organization_id,
                                });
                                if (!error) {
                                  setQuickComment('');
                                  queryClient.invalidateQueries({ queryKey: ['leads'] });
                                  toast({ title: 'Comentário adicionado' });
                                } else {
                                  toast({ title: 'Erro ao comentar', description: error.message, variant: 'destructive' });
                                }
                              }}
                            >
                              Comentar
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                          <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={clearFU}>
                            Limpar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>

            {/* Row 2: Responsável, Etiquetas e Ações */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Responsável com avatar de iniciais */}
                {lead.assignee_name && (() => {
                  const initials = lead.assignee_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      className="flex items-center gap-1.5 group/assignee"
                      title={lead.assignee_name}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center text-[9px] font-semibold text-primary">
                        {initials}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px] group-hover/assignee:text-foreground transition-colors">
                        {lead.assignee_name}
                      </span>
                    </div>
                  );
                })()}

                {/* Etiquetas responsivas */}
                <div className="flex items-center gap-1 flex-wrap">
                  {lead.lead_labels?.slice(0, 2).map((labelRel, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={cn(
                        "text-[9px] h-5 px-2 border font-medium whitespace-nowrap",
                        getLabelColor(labelRel.labels.name)
                      )}
                      title={labelRel.labels.name}
                    >
                      {labelRel.labels.name}
                    </Badge>
                  ))}
                  {(lead.lead_labels?.length || 0) > 2 && (
                    <Badge
                      variant="outline"
                      className="text-[9px] h-5 px-1.5 bg-muted/50 text-muted-foreground border-border"
                      title={`${(lead.lead_labels?.length || 0) - 2} etiquetas adicionais`}
                    >
                      +{(lead.lead_labels?.length || 0) - 2}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ações (visíveis no hover) */}
              <div className={cn(
                "flex items-center gap-1 transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                {whatsappHref && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(whatsappHref, "_blank");
                    }}
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <LeadDetailsSheet lead={lead as any} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}





