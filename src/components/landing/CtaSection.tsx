import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { PAYMENT_LINKS } from "@/config/paymentLinks";

const LANDING_PAGE_CHECKOUT_URL = PAYMENT_LINKS.basico.url;

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden flex items-center justify-center">
      {/* Intense Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 animate-gradient-xy" />
      <div className="absolute inset-0 bg-mesh opacity-30" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="container mx-auto px-4 relative z-10 text-center max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-8 text-primary-foreground font-medium">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-white">Oferta por tempo limitado</span>
        </div>
        
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 text-white tracking-tight leading-tight">
          Pare de perder dinheiro em <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">anúncios hoje.</span>
        </h2>
        
        <p className="text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Junte-se a gestores que estão dobrando o ROI com a inteligência da InsightFy. 
          Comece agora e veja a mágica acontecer.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
                size="lg" 
                className="h-16 px-10 text-xl rounded-full bg-white text-primary hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                asChild
            >
                <a href={LANDING_PAGE_CHECKOUT_URL}>
                    Começar Teste Grátis <ArrowRight className="ml-2 w-6 h-6" />
                </a>
            </Button>
            <p className="text-sm text-blue-200/60 mt-4 sm:mt-0">
                Não requer cartão de crédito • Cancelamento a qualquer momento
            </p>
        </div>
      </motion.div>
    </section>
  );
}






