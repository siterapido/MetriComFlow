import { motion } from "framer-motion";
import { BarChart3, Target, Zap, Shield, Globe, Users, LayoutDashboard, ListTodo, Contact, CheckCircle2 } from "lucide-react";

export function FeaturesBento() {
  const features = [
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Dashboard Unificada",
      description: "Visualize todos os seus KPIs, metas e origens de tráfego em um único painel intuitivo.",
      colSpan: "lg:col-span-2",
      bg: "bg-gradient-to-br from-card to-card/50"
    },
    {
      icon: <Target className="w-8 h-8 text-red-500" />,
      title: "Metas Inteligentes",
      description: "Defina, acompanhe e ajuste metas para cada membro da equipe.",
      colSpan: "lg:col-span-1",
      bg: "bg-card"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Automação de Leads",
      description: "Capture leads do Meta Ads e distribua automaticamente para sua equipe comercial.",
      colSpan: "lg:col-span-1",
      bg: "bg-card"
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Segurança de Dados",
      description: "Seus dados protegidos com criptografia de ponta a ponta e conformidade LGPD.",
      colSpan: "lg:col-span-2",
      bg: "bg-gradient-to-bl from-card to-card/50"
    }
  ];

  return (
    <section id="features" className="py-32 bg-background relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 -z-10" />

      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-secondary/10 text-secondary mb-4 border border-secondary/20"
          >
            Recursos Poderosos
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground"
          >
            Tudo o que você precisa para <span className="text-gradient">crescer</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg sm:text-xl"
          >
            Ferramentas projetadas para simplificar sua operação e maximizar resultados.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`group p-8 rounded-3xl border border-white/5 hover:border-primary/50 transition-all duration-500 ${feature.colSpan} ${feature.bg} shadow-lg hover:shadow-primary/10 relative overflow-hidden`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-slide-in opacity-0 group-hover:opacity-100 transition-opacity" />
                
              <div className="w-14 h-14 rounded-2xl bg-background/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CRM Integration Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 glass-card rounded-3xl p-8 sm:p-12 border border-white/10 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10" />

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6 text-foreground">CRM Integrado & Inteligente</h3>
              <p className="text-muted-foreground mb-8 text-lg">
                Gerencie seu funil de vendas com uma interface visual estilo Kanban, automatize follow-ups e nunca mais perca uma oportunidade.
              </p>
              <ul className="space-y-4">
                {[
                  "Qualificação automática de leads via IA",
                  "Distribuição inteligente para vendedores",
                  "Alertas de estagnação no funil",
                  "Integração nativa com WhatsApp"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 opacity-50" />
                <div className="bg-background/40 rounded-xl border border-white/10 p-6 backdrop-blur-sm shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                        <div className="font-semibold text-foreground">Pipeline de Vendas</div>
                        <div className="text-sm text-muted-foreground">42 Oportunidades</div>
                    </div>
                    <div className="space-y-3">
                        {[
                        { name: "Tech Solutions Ltda", val: "R$ 12.000", stage: "Negociação", color: "bg-yellow-500/20 text-yellow-500" },
                        { name: "Grupo Alpha", val: "R$ 45.000", stage: "Fechamento", color: "bg-green-500/20 text-green-500" },
                        { name: "StartUp Inc", val: "R$ 8.500", stage: "Qualificação", color: "bg-blue-500/20 text-blue-500" },
                        ].map((deal, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-white/10">
                            <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {deal.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium text-sm text-foreground">{deal.name}</div>
                                <div className="text-xs text-muted-foreground">{deal.val}</div>
                            </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${deal.color}`}>{deal.stage}</span>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}








