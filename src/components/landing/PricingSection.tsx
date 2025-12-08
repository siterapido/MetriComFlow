import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptionPlans } from "@/hooks/useSubscription";
import { normalizePlanSlug, getPaymentLink } from "@/config/paymentLinks";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type BillingPeriod = "monthly" | "yearly";

export function PricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const { data: allPlans, isLoading } = useSubscriptionPlans();
  const { user } = useAuth();
  const navigate = useNavigate();

  const monthlyPlans = (allPlans || [])
    .filter((p) => p.billing_period === "monthly")
    .sort((a, b) => a.display_order - b.display_order);
  const yearlyPlans = (allPlans || [])
    .filter((p) => p.billing_period === "yearly")
    .sort((a, b) => a.display_order - b.display_order);

  const plans = period === "monthly" ? monthlyPlans : yearlyPlans;

  const handleSelect = (planId: string, slug: string) => {
    // Logic copied from original component
    const normalizedSlug = normalizePlanSlug(slug ?? null);
    const paymentLink = getPaymentLink(normalizedSlug);

    if (paymentLink) {
      window.location.href = paymentLink;
      return;
    }

    const encodedPlan = encodeURIComponent(slug || planId);
    if (user) {
      navigate(`/planos?plan=${encodedPlan}`);
    } else {
      window.location.href = `/login?mode=register&next=${encodeURIComponent(`/planos?plan=${encodedPlan}`)}`;
    }
  };

  return (
    <section id="planos" className="py-24 relative overflow-hidden bg-background">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Planos Transparentes</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Escolha o plano ideal para escalar sua operação.
          </p>

          <div className="inline-flex bg-white/5 p-1 rounded-full backdrop-blur-sm border border-white/10">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as BillingPeriod)} className="w-full">
              <TabsList className="grid grid-cols-2 w-[300px] bg-transparent">
                <TabsTrigger 
                  value="monthly" 
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  Mensal
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  Anual (-20%)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-3">
             {[1,2,3].map(i => <div key={i} className="h-[500px] rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const isPro = plan.slug?.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("pro");
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  {isPro && (
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-cyan-400 rounded-2xl opacity-70 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-pulse-glow" />
                  )}
                  
                  <div className={`relative h-full flex flex-col p-8 rounded-2xl transition-all duration-300 ${
                    isPro 
                      ? "bg-card border-transparent" 
                      : "glass-card hover:border-primary/30"
                  }`}>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold mb-2 text-foreground">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">R$ {plan.price.toLocaleString('pt-BR')}</span>
                        <span className="text-muted-foreground">/{period === 'monthly' ? 'mês' : 'ano'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">{plan.description}</p>
                    </div>

                    <div className="space-y-4 mb-8 flex-1">
                      {plan.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isPro ? "text-primary" : "text-primary/70"}`} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`w-full h-12 rounded-xl font-bold tracking-wide ${
                        isPro 
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]" 
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      onClick={() => handleSelect(plan.id, plan.slug || "")}
                    >
                      Começar com {plan.name}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}






