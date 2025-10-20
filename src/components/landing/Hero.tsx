import { Rocket, Target, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const highlights = [
  {
    title: "Proposta de valor",
    description: "Centralize Ads, CRM e Metas em uma única visão conectada.",
    icon: Rocket,
  },
  {
    title: "Foco em resultado",
    description: "Mensure CAC, ROI e conversões em tempo real para agir rápido.",
    icon: Target,
  },
  {
    title: "Governança",
    description: "Crie rituais de acompanhamento com metas compartilhadas.",
    icon: Workflow,
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 pt-32 pb-24 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950" />
      <div className="absolute -top-1/2 right-10 h-96 w-96 rounded-full bg-[#E9FB36]/10 blur-3xl" />
      <div className="container relative z-10 flex flex-col items-center text-center">
        <Badge className="mb-6 bg-white/10 text-[#E9FB36]">Lançamento oficial</Badge>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Unifique Ads, Leads e Metas. Cresça com previsibilidade.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-neutral-300">
          Menos retrabalho, mais clareza operacional e foco nos resultados. Um fluxo unificado que conecta mídia paga, CRM e metas para escalar com segurança.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-12 px-8 text-base font-semibold bg-[#E9FB36] text-neutral-900 hover:bg-[#d3eb0f]"
            asChild
          >
            <a href="#lead-capture">Começar grátis</a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/30 px-8 text-base font-semibold text-white hover:border-[#E9FB36] hover:text-[#E9FB36]"
            asChild
          >
            <a href="#dashboards">Ver demo interativa</a>
          </Button>
        </div>

        <div className="mt-16 grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <Card
              key={item.title}
              className="border-white/10 bg-white/5 backdrop-blur-lg transition hover:-translate-y-1 hover:border-[#E9FB36]/60 hover:bg-white/10"
            >
              <CardContent className="flex flex-col gap-4 p-6 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9FB36]/15 text-[#E9FB36]">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-neutral-300">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
