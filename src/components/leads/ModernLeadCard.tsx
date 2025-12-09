import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadDetailsSheet } from "./LeadDetailsSheet";

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
  custom_fields?: Record<string, any> | null;
};

interface ModernLeadCardProps {
  lead: Lead;
  index: number;
  isSelected?: boolean;
  onToggleSelection?: (leadId: string) => void;
  selectionMode?: boolean;
}

export function ModernLeadCard({ 
  lead, 
  index, 
  isSelected = false, 
  onToggleSelection,
  selectionMode = false 
}: ModernLeadCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
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

  // Resolve phone for WhatsApp
  const resolvedPhone: string | null = (() => {
    const p = (lead as any).phone as string | undefined;
    const extractPhone = (text?: string | null) => {
      if (!text) return null;
      const match = (text.match(/\d[\d\s().-]{8,}\d/g) || [])
        .map((m) => m.replace(/\D/g, ""))
        .find((n) => n.length >= 10 && n.length <= 13);
      return match || null;
    };
    const fromDesc = extractPhone(lead.description);
    const fromCustom = lead.custom_fields?.["Telefone Principal"] || lead.custom_fields?.phone;
    return p || fromCustom || fromDesc || null;
  })();

  const whatsappHref = resolvedPhone
    ? `https://wa.me/${String(resolvedPhone).replace(/\D/g, "").replace(/^((?!55).*)$/, "55$1")}`
    : null;

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
              {lead.title}
            </h3>
          </div>

          {/* Body: Custom Fields - Company Info */}
          {lead.custom_fields && (
            <div className="space-y-2 mb-3 text-[11px] relative z-10">
              {/* Nome Fantasia */}
              {lead.custom_fields["Nome Fantasia"] && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground/90 truncate">
                      {lead.custom_fields["Nome Fantasia"]}
                    </p>
                  </div>
                </div>
              )}

              {/* Cidade / Estado */}
              {(lead.custom_fields.Cidade || lead.custom_fields.Estado) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {[lead.custom_fields.Cidade, lead.custom_fields.Estado]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Capital Social */}
              {lead.custom_fields["Capital Social"] && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px]">
                    Capital: {lead.custom_fields["Capital Social"]}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 relative z-10">
            {/* Left: Assignee or Date */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
               {lead.assignee_name ? (
                 <div className="flex items-center gap-1.5">
                   <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px] font-semibold">
                     {lead.assignee_name.charAt(0).toUpperCase()}
                   </div>
                   <span className="max-w-[80px] truncate font-medium">{lead.assignee_name}</span>
                 </div>
               ) : (
                 <span className="flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {formatDistanceToNowStrict(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}
                 </span>
               )}
            </div>

            {/* Right: Badges & Actions */}
            <div className="flex items-center gap-2">
              {/* Badges (max 2) */}
              <div className="flex items-center gap-1">
                {lead.lead_labels?.slice(0, 2).map((labelRel, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={cn("text-[9px] h-5 px-1.5 border font-normal", getLabelColor(labelRel.labels.name))}
                  >
                    {labelRel.labels.name}
                  </Badge>
                ))}
                {(lead.lead_labels?.length || 0) > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{(lead.lead_labels?.length || 0) - 2}</span>
                )}
              </div>

              {/* Actions (visible on hover) */}
              <div className={cn(
                "flex items-center gap-1 transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                {whatsappHref && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500"
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
                  className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
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

      <LeadDetailsSheet lead={lead} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}





