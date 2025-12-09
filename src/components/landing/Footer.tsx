import { motion } from "framer-motion";

export function Footer() {
  const commit = (window as any).__LATEST_COMMIT__ || {};
  const hasCommit = Boolean(commit?.hash && commit?.message);

  return (
    <footer className="bg-background border-t border-white/10 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-10 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                <img src="/favicon.ico" alt="InsightFy" className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-foreground tracking-tight">InsightFy</span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              A plataforma completa para escalar suas vendas com inteligência de dados e automação.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-foreground">Produto</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
              <li><a href="#planos" className="hover:text-primary transition-colors">Preços</a></li>
              <li><a href="/login" className="hover:text-primary transition-colors">Login</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-foreground">Legal</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="/privacy-policy" className="hover:text-primary transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} InsightFy. Todos os direitos reservados.</p>
          {hasCommit && (
            <div className="text-xs opacity-50">
              <span>v.{commit.shortHash}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export function Header() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-md border-b border-white/10 py-3" : "bg-transparent py-5"}`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/50 shadow-[0_0_10px_hsl(var(--primary)/0.3)]">
                        <img src="/favicon.ico" alt="InsightFy" className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-foreground">InsightFy</span>
                </div>
                
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <a href="#features" className="hover:text-primary transition-colors">Recursos</a>
                    <a href="#planos" className="hover:text-primary transition-colors">Planos</a>
                </nav>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" className="hidden sm:inline-flex hover:bg-white/5 text-foreground" asChild>
                        <a href="/login">Entrar</a>
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all duration-300 rounded-full px-6 font-semibold" onClick={() => {
                        document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
                    }}>
                        Começar agora
                    </Button>
                </div>
            </div>
        </motion.header>
    );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";








