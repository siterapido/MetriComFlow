import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { PlanCard } from "@/components/subscription/PlanCard";
import type { SubscriptionPlan, BillingPeriod } from "@/hooks/useSubscription";
import { useSubscriptionPlans } from "@/hooks/useSubscription";
import { resolveStripeProductId } from "@/lib/stripePlanProducts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Landing page sem formulário: removido schema e validação

type DataLayerEvent = { event: string; [key: string]: any };

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

function HeaderLanding() {
  const track = useTracker();
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="InsightFy" className="w-6 h-6" />
          <span className="font-semibold">InsightFy</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#recursos" className="hover:text-foreground">Recursos</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => track({ event: "lp_header_cta_click", label: "login" })} asChild>
            <a href="/login">Entrar</a>
          </Button>
          <Button onClick={() => {
            track({ event: "lp_header_cta_click", label: "ver_planos" });
            document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
          }}>Ver planos</Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const track = useTracker();
  const heroChartData = [
    { name: "Jan", leads: 24, mql: 10 },
    { name: "Fev", leads: 30, mql: 14 },
    { name: "Mar", leads: 45, mql: 20 },
    { name: "Abr", leads: 42, mql: 21 },
    { name: "Mai", leads: 58, mql: 28 },
    { name: "Jun", leads: 66, mql: 31 },
  ];
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-60" />
      <div className="absolute inset-0 -z-10 bg-grid opacity-20" />
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-muted/40 border">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Nova geração de CRM + Ads
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">
              Unifique <span className="gradient-text">Ads, Leads e Metas</span>.
              <br /> Cresça com previsibilidade.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Dashboard e CRM integrados com Meta Lead Ads, metas da equipe e relatórios prontos em um único fluxo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="accent-ring" size="lg" onClick={() => {
                track({ event: "lp_hero_cta_click", label: "comece_gratis" });
                document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
              }}>Ver planos</Button>
              <Button className="accent-ring" size="lg" variant="outline" onClick={() => {
                track({ event: "lp_hero_cta_click", label: "agendar_demo" });
                document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
              }}>Agendar demo</Button>
            </div>
            <div className="mt-6 text-sm text-muted-foreground">Escolha seu plano e comece em 5 minutos.</div>
          </div>
          <div className="relative">
            <div className="gradient-card rounded-lg border p-4 glow">
              <div className="text-sm text-muted-foreground mb-2">Leads vs MQLs (exemplo)</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={heroChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border) / 0.4)" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="mql" stroke="hsl(var(--secondary))" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="container mx-auto px-4 py-10">
      <div className="text-center text-muted-foreground">Confiado por equipes de marketing e vendas</div>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 items-center opacity-80">
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    </section>
  );
}

function PAS() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-semibold">O problema</h3>
          <p className="mt-2 text-muted-foreground">Relatórios dispersos, leads sem qualificação e metas desconectadas.</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold">A agitação</h3>
          <p className="mt-2 text-muted-foreground">Retrabalho, baixa previsibilidade e decisões tardias que custam caro.</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold">A solução</h3>
          <p className="mt-2 text-muted-foreground">MetriCom Flow centraliza Ads, Leads e Metas, trazendo clareza e velocidade.</p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center">Como funciona</h2>
      <div className="mt-8 grid md:grid-cols-3 gap-8">
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">1) Conecte sua conta de anúncios</div>
          <p className="text-muted-foreground mt-2">Integração nativa com Meta Lead Ads e sincronização diária.</p>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">2) Capture e qualifique leads</div>
          <p className="text-muted-foreground mt-2">Fluxo automático do lead ao CRM com etapas e prioridades.</p>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">3) Acompanhe metas e KPIs</div>
          <p className="text-muted-foreground mt-2">Selecione KPIs e visualize relatórios consolidados por origem.</p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="recursos" className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center">Recursos principais</h2>
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">Dashboard unificada</div>
          <p className="text-muted-foreground mt-2">KPIs, metas e origens em uma única visão.</p>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">Metas integradas</div>
          <p className="text-muted-foreground mt-2">Atribua metas por time e acompanhe a execução.</p>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="font-semibold">Relatórios automáticos</div>
          <p className="text-muted-foreground mt-2">Economize horas com relatórios prontos para decisão.</p>
        </div>
      </div>
    </section>
  );
}

function DataVizShowcase() {
  const visitsLeads = [
    { name: "Jan", visits: 1200, leads: 120 },
    { name: "Fev", visits: 1500, leads: 180 },
    { name: "Mar", visits: 1600, leads: 210 },
    { name: "Abr", visits: 1400, leads: 190 },
    { name: "Mai", visits: 2000, leads: 260 },
    { name: "Jun", visits: 2200, leads: 300 },
  ];
  const mqlGrowth = [
    { name: "Jan", mql: 10 },
    { name: "Fev", mql: 14 },
    { name: "Mar", mql: 20 },
    { name: "Abr", mql: 21 },
    { name: "Mai", mql: 28 },
    { name: "Jun", mql: 31 },
  ];
  return (
    <section className="relative overflow-hidden container mx-auto px-4 py-16">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-30" />
      <h2 className="text-3xl font-bold text-center">Inteligência visual que acelera decisões</h2>
      <p className="text-center text-muted-foreground mt-2">Painéis claros para acompanhar funil e eficiência de mídia.</p>
      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <div className="gradient-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-2">Visitas x Leads (exemplo)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitsLeads} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Legend />
                <Bar dataKey="visits" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="leads" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="gradient-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-2">Crescimento de MQLs (exemplo)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mqlGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Legend />
                <Line type="monotone" dataKey="mql" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function CRMDemoShowcase() {
  const columns = [
    {
      title: "Qualificar",
      items: [
        { name: "Maria Souza", company: "Acme Co.", score: 62 },
        { name: "João Lima", company: "Beta Ltda", score: 55 },
      ],
    },
    {
      title: "Negociação",
      items: [
        { name: "Ana Silva", company: "Omega SA", score: 78 },
        { name: "Carlos Santos", company: "Delta Tech", score: 70 },
      ],
    },
    {
      title: "Fechado",
      items: [
        { name: "Bruno Alves", company: "Epsilon", score: 88 },
        { name: "Paula Nunes", company: "Gamma", score: 92 },
      ],
    },
  ];
  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center">Prévia do CRM em colunas</h2>
      <p className="text-center text-muted-foreground mt-2">Organize leads com prioridades, etapas e follow-ups.</p>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.title} className="rounded-lg border p-4 bg-card">
            <div className="font-semibold mb-3">{col.title}</div>
            <div className="space-y-3">
              {col.items.map((it, idx) => (
                <div key={idx} className="gradient-card rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.name}</div>
                    <span className="text-xs text-muted-foreground">{it.score} pts</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{it.company}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline">Detalhes</Button>
                    <Button size="sm">Avançar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-6">
        <blockquote className="p-6 border rounded-lg">
          <p className="text-lg">“Ganhamos clareza e previsibilidade em poucas semanas.”</p>
          <footer className="mt-2 text-sm text-muted-foreground">Head de Marketing, PME</footer>
        </blockquote>
        <blockquote className="p-6 border rounded-lg">
          <p className="text-lg">“Integração de leads e metas sem esforço. Recomendo.”</p>
          <footer className="mt-2 text-sm text-muted-foreground">Diretor de Agência</footer>
        </blockquote>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const track = useTracker();
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="p-8 border rounded-lg text-center">
        <h3 className="text-2xl font-semibold">Planos simples e transparentes</h3>
        <p className="mt-2 text-muted-foreground">Escolha seu plano e evolua conforme seu time cresce.</p>
        <div className="mt-6">
          <Button size="lg" onClick={() => {
            track({ event: "lp_pricing_cta_click" });
            document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
          }}>Ver opções</Button>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center">Perguntas frequentes</h2>
      <div className="mt-6 max-w-3xl mx-auto">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Preciso de cartão para começar?</AccordionTrigger>
            <AccordionContent>Não. Você pode iniciar sem cartão e evoluir depois.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Como funcionam as integrações?</AccordionTrigger>
            <AccordionContent>Integração nativa com Meta Lead Ads e sincronização diária.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Vocês são compatíveis com LGPD?</AccordionTrigger>
            <AccordionContent>Sim. Temos política de privacidade e controle de consentimento.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}

function PricingPlansSection() {
  const track = useTracker();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  // Buscar planos oficiais diretamente do Supabase para manter sincronização com /planos
  const { data: allPlans, isLoading, error } = useSubscriptionPlans();

  const monthlyPlans = (allPlans || [])
    .filter((p) => p.billing_period === "monthly")
    .sort((a, b) => a.display_order - b.display_order);
  const yearlyPlans = (allPlans || [])
    .filter((p) => p.billing_period === "yearly")
    .sort((a, b) => a.display_order - b.display_order);

  // Se o período selecionado não tiver planos disponíveis, mostramos mensagem amigável
  const plans = period === "monthly" ? monthlyPlans : yearlyPlans;

  const handleSelect = (planId: string) => {
    track({ event: "lp_plan_select", planId, period });
    const plan = plans.find((p) => p.id === planId);
    const fallbackProductId = plan ? resolveStripeProductId(plan) : null;
    const productId = plan?.stripe_product_id?.trim() || fallbackProductId || undefined;
    const planSlugOrId = plan?.slug || planId;
    // Prioriza redirecionar pelo produto configurado na Stripe, com fallback para slug/id
    const next = productId
      ? `/checkout?product=${encodeURIComponent(productId)}`
      : `/checkout?plan=${encodeURIComponent(planSlugOrId)}`;
    window.location.href = next;
  };

  return (
    <section id="planos" className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold">Escolha o plano ideal</h2>
          <p className="mt-2 text-muted-foreground">
            Planos organizados por necessidade: básico, intermediário e premium.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Preços mensais e anuais com desconto</li>
            <li>Recursos claros e limites por plano</li>
            <li>Contratação simples e rápida</li>
          </ul>
        </div>
        <div className="flex md:justify-end">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as BillingPeriod)} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-2 w-full md:w-auto">
              <TabsTrigger value="monthly" className="transition-all duration-200" disabled={!monthlyPlans.length}>Mensal</TabsTrigger>
              <TabsTrigger value="yearly" className="transition-all duration-200" disabled={!yearlyPlans.length}>Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Cards dos planos */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-8 w-24 mb-6" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <Skeleton className="h-10 w-full mt-6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 border rounded-lg text-sm text-destructive">Não foi possível carregar os planos. Tente novamente mais tarde.</div>
      ) : !plans.length ? (
        <div className="p-4 border rounded-lg text-sm text-muted-foreground">Nenhum plano disponível para o período selecionado.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {/* Comparação opcional */}
      <div className="mt-10 p-6 border rounded-lg">
        <h3 className="text-xl font-semibold">Comparação rápida</h3>
        {plans.length ? (
          <div className="mt-4 grid gap-4 text-sm"
            style={{ gridTemplateColumns: `repeat(${Math.min(4, plans.length + 1)}, minmax(0, 1fr))`, display: 'grid' }}>
            <div className="font-semibold text-muted-foreground">Recurso</div>
            {plans.map((p) => (
              <div key={p.id} className="font-semibold">{p.name}</div>
            ))}

            <div className="text-muted-foreground">Contas de anúncio</div>
            {plans.map((p) => (
              <div key={`ad-${p.id}`}>{p.max_ad_accounts}</div>
            ))}

            <div className="text-muted-foreground">Usuários</div>
            {plans.map((p) => (
              <div key={`users-${p.id}`}>{p.max_users}</div>
            ))}

            <div className="text-muted-foreground">CRM</div>
            {plans.map((p) => (
              <div key={`crm-${p.id}`}>{p.has_crm_access ? "Incluso" : "—"}</div>
            ))}

            <div className="text-muted-foreground">Suporte prioritário</div>
            {plans.map((p) => (
              <div key={`sup-prio-${p.id}`}>{(p.features || []).some((f) => /priorit/i.test(f)) ? "Sim" : "—"}</div>
            ))}

            <div className="text-muted-foreground">Suporte dedicado</div>
            {plans.map((p) => (
              <div key={`sup-ded-${p.id}`}>{(p.features || []).some((f) => /dedicad/i.test(f)) ? "Sim" : "—"}</div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Carregue os planos para ver a comparação.</p>
        )}
      </div>

      <div className="mt-8 text-center">
        <Button size="lg" className="accent-ring" onClick={() => {
          track({ event: "lp_pricing_bottom_cta_click", period });
          const next = `/planos${plans.length ? `?plan=${encodeURIComponent(plans[0].slug || plans[0].id)}` : ""}`;
          window.location.href = `/login?next=${encodeURIComponent(next)}&mode=register`;
        }}>
          Contratar agora
        </Button>
        <div className="mt-2 text-xs text-muted-foreground">Sem cartão de crédito para começar</div>
      </div>
    </section>
  );
}

function FooterLanding() {
  const commit = __LATEST_COMMIT__;
  const hasCommit = Boolean(commit?.hash && commit?.message);
  const commitDate = hasCommit && commit.date ? new Date(commit.date) : null;
  const formattedDate = commitDate && !Number.isNaN(commitDate.getTime())
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(commitDate)
    : "";

  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} MetriCom Flow</div>
        {hasCommit && (
          <div className="text-center text-xs sm:text-sm sm:text-right">
            <span className="text-muted-foreground">Último commit: </span>
            {commit.url ? (
              <a href={commit.url} target="_blank" rel="noreferrer" className="font-mono text-foreground hover:underline">
                {commit.shortHash}
              </a>
            ) : (
              <span className="font-mono text-foreground">{commit.shortHash}</span>
            )}
            <span className="text-muted-foreground"> — {commit.message}</span>
            {formattedDate && <span className="text-muted-foreground"> · {formattedDate}</span>}
            {commit.author && <span className="text-muted-foreground"> · {commit.author}</span>}
          </div>
        )}
        <div className="flex items-center justify-center gap-4 sm:justify-end">
          <a href="/privacy-policy" className="hover:text-foreground">Privacidade</a>
          <a href="#" className="hover:text-foreground">Termos</a>
        </div>
      </div>
    </footer>
  );
}

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderLanding />
      <Hero />
      <SocialProof />
      <PAS />
      <HowItWorks />
      <Features />
      <DataVizShowcase />
      <CRMDemoShowcase />
      <Testimonials />
      <PricingTeaser />
      <FAQ />
      <PricingPlansSection />
      <FooterLanding />
    </div>
  );
};

export default Index;
