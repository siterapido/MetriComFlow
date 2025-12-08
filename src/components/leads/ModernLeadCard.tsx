import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Megaphone,
  Clock,
  MoreHorizontal,
  Edit2,
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, addDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Button } from "@/components/ui/button";
import { LeadEditDialog } from "./LeadEditDialog";
import { useAuth } from "@/hooks/useAuth";

// Tipos trazidos do componente original
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
}

export function ModernLeadCard({ lead, index }: ModernLeadCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isWon = lead.status === 'fechado_ganho';

  // Cores modernas e vibrantes para labels
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0, 
    }).format(value);
  };

  // Ícones de origem minimalistas
  const SourceIcon = () => {
    const source = lead.source || "manual";
    const iconClass = "w-3 h-3";
    
    switch (source) {
      case "meta_ads": return <Facebook className={cn(iconClass, "text-blue-400")} />;
      case "whatsapp": return <MessageCircle className={cn(iconClass, "text-emerald-400")} />;
      case "google_ads": return <Megaphone className={cn(iconClass, "text-yellow-400")} />;
      case "site": return <Globe className={cn(iconClass, "text-slate-400")} />;
      case "email": return <Mail className={cn(iconClass, "text-indigo-400")} />;
      case "telefone": return <Phone className={cn(iconClass, "text-zinc-400")} />;
      default: return <User className={cn(iconClass, "text-muted-foreground")} />;
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
        onClick={() => setIsEditOpen(true)}
      >
        {/* Victory/Achievement Glow Effect - Only for Won Leads */}
        {isWon && (
          <>
            <motion.div
              className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-75 blur-md z-[-1]"
              animate={{
                opacity: [0.5, 0.8, 0.5],
                rotate: [0, 1, 0, -1, 0], // Slight wobble
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

        {/* Glow Effect no Hover (Only if not won to avoid conflict) */}
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
            "relative bg-[#0f0f12]/90 backdrop-blur-md rounded-xl p-4 shadow-xl overflow-hidden transition-all duration-300",
            isWon 
              ? "border border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" 
              : "border border-white/5 hover:border-primary/20"
          )}>
          
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
          
          {/* Header: Title & Value */}
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-100 truncate leading-tight group-hover:text-primary transition-colors">
                {lead.title}
              </h3>
              {lead.description && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {lead.description}
                </p>
              )}
            </div>
            {lead.value > 0 && (
              <div className="shrink-0 font-semibold text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                {formatCurrency(lead.value)}
              </div>
            )}
          </div>

          {/* Custom Fields - Company Info */}
          {lead.custom_fields && (
            <div className="space-y-1 mb-2 text-[11px]">
              {/* Nome Fantasia / Razão Social */}
              {(lead.custom_fields["Nome Fantasia"] || lead.custom_fields["Razão Social"]) && (
                <div className="flex items-start gap-1.5">
                  <Building2 className="w-3 h-3 shrink-0 mt-0.5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    {lead.custom_fields["Nome Fantasia"] && (
                      <p className="font-medium text-gray-300 truncate">
                        {lead.custom_fields["Nome Fantasia"]}
                      </p>
                    )}
                    {lead.custom_fields["Razão Social"] && (
                      <p className="text-gray-500 truncate">
                        {lead.custom_fields["Razão Social"]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* CNPJ */}
              {lead.custom_fields.CNPJ && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">CNPJ: {lead.custom_fields.CNPJ}</span>
                </div>
              )}

              {/* Endereço */}
              {(lead.custom_fields.Cidade || lead.custom_fields.Estado) && (
                <div className="flex items-center gap-1.5 text-gray-500">
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
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{lead.custom_fields.email || lead.custom_fields["E-mail"]}</span>
                </div>
              )}

              {/* Porte / Capital Social */}
              {(lead.custom_fields.Porte || lead.custom_fields["Capital Social"]) && (
                <div className="flex items-center gap-2 text-gray-500">
                  {lead.custom_fields.Porte && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-white/5 border-white/10">
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

          {/* Badges & Source */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
             <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5" title={`Origem: ${lead.source}`}>
                <SourceIcon />
                <span className="text-[10px] text-gray-400 capitalize">{lead.source?.replace('_', ' ') || 'Manual'}</span>
             </div>
             
             {lead.lead_labels?.slice(0, 2).map((labelRel, idx) => (
               <Badge 
                 key={idx} 
                 variant="outline" 
                 className={cn("text-[10px] h-5 px-2 border font-normal", getLabelColor(labelRel.labels.name))}
               >
                 {labelRel.labels.name}
               </Badge>
             ))}
             {(lead.lead_labels?.length || 0) > 2 && (
               <span className="text-[10px] text-gray-500">+{ (lead.lead_labels?.length || 0) - 2}</span>
             )}
          </div>

          {/* Footer Secundário (Reveal on Hover) */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            {/* Sempre visível: Data ou Assignee */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
               {lead.assignee_name && (
                 <div className="flex items-center gap-1">
                   <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px]">
                     {lead.assignee_name.charAt(0).toUpperCase()}
                   </div>
                   <span className="max-w-[60px] truncate">{lead.assignee_name}</span>
                 </div>
               )}
               {!lead.assignee_name && (
                 <span className="flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {formatDistanceToNowStrict(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}
                 </span>
               )}
            </div>

            {/* Ações Secundárias (Visíveis apenas no hover) */}
            <div className={cn(
              "flex items-center gap-1 transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-0"
            )}>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-6 w-6 rounded-full hover:bg-white/10 hover:text-white"
                 onClick={(e) => {
                   e.stopPropagation();
                   setIsEditOpen(true);
                 }}
               >
                 <Edit2 className="w-3 h-3" />
               </Button>
               {/* Mais ações podem ser adicionadas aqui */}
            </div>
          </div>
          
          {/* Indicador de Meta Ads sutil (faixa lateral) */}
          {lead.source === 'meta_ads' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/50" />
          )}
        </div>
      </motion.div>

      <LeadEditDialog lead={lead} open={isEditOpen} onOpenChange={setIsEditOpen} />
    </>
  );
}

