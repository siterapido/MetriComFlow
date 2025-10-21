import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  company: z.string().optional(),
  role: z.string().optional(),
  team_size: z.string().optional(),
  objective: z.string().optional(),
  message: z.string().optional(),
  consent: z.boolean().refine((v) => v === true, { message: "É necessário aceitar a Política de Privacidade (LGPD)" }),
});

type FormValues = z.infer<typeof schema>;

type DataLayerEvent = { event: string; [key: string]: any };

function useTracker() {
  useEffect(() => {
    (window as any).dataLayer = (window as any).dataLayer || [];
  }, []);
  return (event: DataLayerEvent) => {
    try {
      (window as any).dataLayer.push(event);
    } catch (_) {}
  };
}

function HeaderLanding() {
  const track = useTracker();
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="MetriCom Flow" className="w-6 h-6" />
          <span className="font-semibold">MetriCom Flow</span>
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
            track({ event: "lp_header_cta_click", label: "comece_gratis" });
            document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
          }}>Comece grátis</Button>
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
                document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
              }}>Comece grátis</Button>
              <Button className="accent-ring" size="lg" variant="outline" onClick={() => {
                track({ event: "lp_hero_cta_click", label: "agendar_demo" });
                document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
              }}>Agendar demo</Button>
            </div>
            <div className="mt-6 text-sm text-muted-foreground">Sem cartão de crédito. 5 minutos para começar.</div>
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
        <p className="mt-2 text-muted-foreground">Comece grátis e evolua conforme seu time cresce.</p>
        <div className="mt-6">
          <Button size="lg" onClick={() => {
            track({ event: "lp_pricing_cta_click" });
            document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
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

function DemoForm() {
  const { toast } = useToast();
  const track = useTracker();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false },
  });

  const utms = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_term: params.get("utm_term") || undefined,
      utm_content: params.get("utm_content") || undefined,
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    track({ event: "lp_form_submit_attempt" });
    const payload = {
      name: values.name,
      email: values.email,
      company: values.company,
      role: values.role,
      team_size: values.team_size,
      objective: values.objective || values.message,
      source: "landing",
      ...utms,
      consent: true,
      user_agent: navigator.userAgent,
    };

    const { error } = await supabase.from("site_requests" as any).insert(payload);
    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      track({ event: "lp_form_submit", status: "error", message: error.message });
      return;
    }

    toast({ title: "Recebido!", description: "Entraremos em contato em breve." });
    track({ event: "lp_form_submit", status: "success" });
    reset();
  };

  return (
    <section id="cta" className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="mt-2 text-muted-foreground">Solicite um acesso gratuito ou agende uma demo guiada.</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Sem cartão de crédito</li>
            <li>Integração rápida com Meta Ads</li>
            <li>Suporte humano quando precisar</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 border rounded-lg space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Seu nome" {...register("name")} />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" placeholder="Nome da empresa" {...register("company")} />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input id="role" placeholder="Seu cargo" {...register("role")} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team_size">Tamanho da equipe</Label>
              <Input id="team_size" placeholder="Ex.: 5-10" {...register("team_size")} />
            </div>
            <div>
              <Label htmlFor="objective">Objetivo</Label>
              <Input id="objective" placeholder="Ex.: unificar leads e metas" {...register("objective")} />
            </div>
          </div>
          <div>
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea id="message" placeholder="Conte em poucas palavras seu contexto" {...register("message")} />
          </div>
          <div className="flex items-start gap-2">
            <input id="consent" type="checkbox" className="mt-1" {...register("consent")}/>
            <Label htmlFor="consent" className="text-sm text-muted-foreground">Concordo com a <a href="/privacy-policy" className="underline">Política de Privacidade</a> (LGPD).</Label>
          </div>
          {errors.consent && <p className="text-sm text-red-600 -mt-2">{errors.consent.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar"}</Button>
        </form>
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
      <DemoForm />
      <FooterLanding />
    </div>
  );
};

export default Index;
