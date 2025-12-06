import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PAYMENT_LINKS } from "@/config/paymentLinks";

const LANDING_PAGE_CHECKOUT_URL = PAYMENT_LINKS.basico.url;

type DataLayerEvent = { event: string;[key: string]: any };

function useTracker() {
  useEffect(() => {
    (window as any).dataLayer = (window as any).dataLayer || [];
  }, []);
  return (event: DataLayerEvent) => {
    try {
      (window as any).dataLayer.push(event);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("dataLayer push failed", error);
      }
    }
  };
}

export function HeroSection() {
  const track = useTracker();
  const paymentLinkUrl = LANDING_PAGE_CHECKOUT_URL;
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  return (
    <section className="relative min-h-[100vh] flex items-center pt-20 overflow-hidden bg-background">
      {/* Mesh Gradients Background */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] -z-10 animate-float" style={{ animationDelay: "2s" }} />

      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-white/5 border border-white/10 backdrop-blur-sm shadow-sm mb-6 text-primary"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Nova geração de CRM + Ads
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground">
            Escale sua operação com <span className="text-gradient">inteligência</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-lg">
            Integre Ads, Leads e Metas em uma única plataforma. Tenha clareza do ROI em tempo real e tome decisões baseadas em dados.
          </p>

          <div className="flex flex-wrap gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" asChild onClick={() => {
                track({ event: "lp_hero_cta_click", label: "assinar_agora" });
              }}>
                <a href={paymentLinkUrl}>
                  Começar Gratuitamente <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-foreground backdrop-blur-sm transition-all duration-300" onClick={() => {
                track({ event: "lp_hero_cta_click", label: "agendar_demo" });
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <Play className="mr-2 w-4 h-4 fill-current" /> Ver como funciona
              </Button>
            </motion.div>
          </div>

          <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p>Junte-se a +500 empresas que crescem com a InsightFy</p>
          </div>
        </motion.div>

        <motion.div
          style={{ y: y1 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block perspective-1000"
        >
          <div className="relative z-10 glass-card rounded-2xl p-2 transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700">
            <img
              src="/placeholder-dashboard.png"
              alt="Dashboard Preview"
              className="rounded-xl w-full h-auto bg-black/20 aspect-[16/10] object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/800x500/0f172a/1e293b?text=Dashboard+Preview";
              }}
            />

            {/* Floating Badge 1 */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-12 top-20 glass-card p-4 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Meta Mensal</div>
                  <div className="font-bold text-lg text-foreground">124%</div>
                </div>
              </div>
            </motion.div>

            {/* Floating Badge 2 */}
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-8 bottom-32 glass-card p-4 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Novos Leads</div>
                  <div className="font-bold text-lg text-foreground">+48 Hoje</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}




