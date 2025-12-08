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
  Building2,
  MapPin,
  Briefcase,
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
  custom_fields?: Record<string, any> | null;
};

interface LeadCardProps {
  lead: Lead;
  onUpdate?: (id: string, data: Partial<Lead>) => void;
  className?: string;
}

export function LeadCard({ lead, onUpdate, className }: LeadCardProps) {
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
          "bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer",
          className
        )}
        onClick={() => setIsEditOpen(true)}
      >
        <CardHeader className="pb-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
              {lead.title}
            </CardTitle>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Abrir WhatsApp"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2 p-3 pt-0">
          {/* Contact: Telefone / WhatsApp */}
          {/* Telefone ocultado por solicitação: manter apenas o botão de WhatsApp */}

          {/* Custom Fields - Company Info */}
          {lead.custom_fields && (
            <div className="space-y-1.5 text-[11px]">
              {/* Nome Fantasia / Razão Social */}
              {(lead.custom_fields["Nome Fantasia"] || lead.custom_fields["Razão Social"]) && (
                <div className="flex items-start gap-1.5">
                  <Building2 className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    {lead.custom_fields["Nome Fantasia"] && (
                      <p className="font-medium text-foreground truncate">
                        {lead.custom_fields["Nome Fantasia"]}
                      </p>
                    )}
                    {lead.custom_fields["Razão Social"] && (
                      <p className="text-muted-foreground truncate">
                        {lead.custom_fields["Razão Social"]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* CNPJ */}
              {lead.custom_fields.CNPJ && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">CNPJ: {lead.custom_fields.CNPJ}</span>
                </div>
              )}

              {/* Endereço */}
              {(lead.custom_fields.Cidade || lead.custom_fields.Estado) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {[lead.custom_fields.Cidade, lead.custom_fields.Estado]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Email */}
              {(lead.custom_fields.email || lead.custom_fields["E-mail"]) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lead.custom_fields.email || lead.custom_fields["E-mail"]}</span>
                </div>
              )}

              {/* Porte / Capital Social */}
              {(lead.custom_fields.Porte || lead.custom_fields["Capital Social"]) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {lead.custom_fields.Porte && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {lead.custom_fields.Porte}
                    </Badge>
                  )}
                  {lead.custom_fields["Capital Social"] && (
                    <span className="text-[10px]">
                      Capital: {lead.custom_fields["Capital Social"]}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {lead.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {lead.description}
            </p>
          )}

          {/* Source Badge - Only show if not manual */}
          {lead.source && lead.source !== 'manual' && <SourceBadge />}

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
              {(lead.comments_count || 0) > 0 && (
                <div className="flex items-center gap-0.5">
                  <MessageSquare className="w-2.5 h-2.5" />
                  {lead.comments_count}
                </div>
              )}
              {/* Mini contador e menu de Follow up (unificado quando não há data) */}
              {(() => {
                const fu = lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null;
                const label = fu ? formatDistanceToNowStrict(fu, { locale: ptBR, addSuffix: true }) : null;
                const tone = fu ? (isPast(new Date(fu.toDateString())) && !isToday(fu) ? "text-destructive" : isToday(fu) ? "text-amber-600" : "text-blue-600") : "text-muted-foreground";
                const base = fu || new Date();
                const snooze = async (days: number) => {
                  const next = addDays(base, days);
                  try {
                    await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: next.toISOString().split("T")[0] } });
                    toast({ title: "Follow-up reagendado", description: format(next, "dd/MM/yyyy", { locale: ptBR }) });
                  } catch (e) {
                    // handled upstream
                  }
                };
                const clearFU = async () => {
                  try {
                    await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: null } });
                    toast({ title: "Follow-up limpo" });
                  } catch (e) {
                    // no-op
                  }
                };
                // Sem follow-up: mostrar apenas o botão "Follow up" (unificado)
                if (!fu) {
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center gap-1 justify-center rounded px-1.5 h-4 text-[10px] border border-border hover:bg-accent/50">
                            <Clock className="w-2.5 h-2.5" /> Follow up
                          </button>
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
                // Com follow-up: esconder botão e permitir alterar clicando na data
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1 cursor-pointer hover:underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                        title="Alterar follow-up"
                      >
                        <Clock className={cn("w-2.5 h-2.5", tone)} />
                        <span className={cn("text-[10px]", tone)}>{label}</span>
                      </button>
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
                              await updateLead.mutateAsync({ id: lead.id, updates: { next_follow_up_date: date.toISOString().split('T')[0] } });
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
                                  lead_id: lead.id,
                                  content,
                                  user_name: displayName,
                                  user_id: user?.id ?? null,
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
