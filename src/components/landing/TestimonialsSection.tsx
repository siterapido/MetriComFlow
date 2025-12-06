import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Ricardo Silva",
    role: "Gestor de Tráfego",
    company: "Agência Scale",
    content: "O InsightFy mudou a forma como reporto resultados. Antes eu perdia horas no Excel, agora o cliente vê o ROI em tempo real.",
    avatar: "RS"
  },
  {
    name: "Amanda Costa",
    role: "Diretora Comercial",
    company: "TechSolutions",
    content: "A distribuição automática de leads para os vendedores aumentou nossa conversão em 40% no primeiro mês.",
    avatar: "AC"
  },
  {
    name: "Carlos Mendes",
    role: "CEO",
    company: "Grupo Alpha",
    content: "Finalmente uma ferramenta que une o marketing e vendas de verdade. A visibilidade do funil é incrível.",
    avatar: "CM"
  },
  {
    name: "Fernanda Lima",
    role: "Head de Growth",
    company: "Startup One",
    content: "A integração com o Meta Ads é perfeita. Consigo ver exatamente qual campanha está trazendo leads qualificados.",
    avatar: "FL"
  },
  {
    name: "João Pedro",
    role: "Consultor de Vendas",
    company: "JP Consultoria",
    content: "Interface limpa, rápida e intuitiva. Meus clientes adoram o acesso transparente aos dados.",
    avatar: "JP"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-background overflow-hidden border-y border-white/5 relative">
      <div className="absolute inset-0 bg-mesh opacity-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Quem usa, <span className="text-gradient">recomenda</span>
        </h2>
        <p className="text-muted-foreground">Junte-se a líderes que escalaram suas operações.</p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="flex animate-marquee whitespace-nowrap gap-6">
          {[...testimonials, ...testimonials].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, borderColor: "#00BFFF" }}
              className="w-[350px] glass-card p-6 rounded-2xl border border-white/10 flex-shrink-0 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-10 w-10 border border-primary/50">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} />
                  <AvatarFallback className="bg-primary/20 text-primary">{item.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}, {item.company}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-normal leading-relaxed italic">
                "{item.content}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
      </div>

      <style>{`
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .group:hover .animate-marquee {
            animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}

