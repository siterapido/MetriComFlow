import { motion } from "framer-motion";
import { Briefcase, TrendingUp, Users2, ArrowRight } from "lucide-react";

export function TargetAudienceSection() {
  const audiences = [
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Gestores de Tráfego",
      description: "Prove o ROI das suas campanhas em tempo real e pare de perder tempo montando relatórios manuais.",
      benefits: ["Rastreamento de leads via UTM", "Dashboard unificado Meta Ads", "Relatórios automáticos"]
    },
    {
      icon: <Users2 className="w-8 h-8 text-secondary" />,
      title: "Equipes de Vendas",
      description: "Receba leads qualificados instantaneamente e aumente sua taxa de conversão com organização.",
      benefits: ["Distribuição automática de leads", "Funil de vendas visual", "Histórico de interações"]
    },
    {
      icon: <Briefcase className="w-8 h-8 text-purple-400" />,
      title: "Agências & Consultores",
      description: "Gerencie múltiplos clientes em uma única plataforma e entregue valor percebido imediato.",
      benefits: ["Múltiplos workspaces (Em breve)", "White-label reports", "Controle de permissões"]
    }
  ];

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Feito sob medida para <span className="text-gradient">você</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Não importa o tamanho da sua operação, a InsightFy se adapta ao seu fluxo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -10 }}
              className="glass-card p-8 rounded-3xl border border-white/5 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
              <p className="text-muted-foreground mb-8 leading-relaxed h-20">
                {item.description}
              </p>
              
              <ul className="space-y-3 mb-8">
                {item.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all cursor-pointer">
                Ver recursos <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}




