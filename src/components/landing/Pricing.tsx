import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "R$149/mês",
    description: "Ideal para começar e validar o fluxo completo.",
    cta: "Experimentar grátis",
    perks: ["Até 5 usuários", "Integração Meta Ads", "Funil de leads essencial"],
  },
  {
    name: "Growth",
    price: "R$449/mês",
    description: "Foco em escala com squads e metas agressivas.",
    cta: "Começar agora",
    perks: ["Usuários ilimitados", "KPIs avançados", "Playbooks de governança"],
    highlight: "Mais popular",
  },
  {
    name: "Scale",
    price: "R$1.290/mês",
    description: "Governança, squads e inteligência para grandes operações.",
    cta: "Falar com vendas",
    perks: ["Suporte dedicado", "Workflows customizados", "Sync avançado & APIs"],
  },
];

export function Pricing() {
  return (
    <section id="planos" className="bg-neutral-950 py-24 text-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="bg-white/10 text-[#E9FB36]">Planos e preços</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Escalone com planos pensados para cada estágio.
          </h2>
          <p className="mt-4 text-neutral-400">
            Todos os planos incluem integrações com Meta Ads, dashboards conectados e suporte humano de onboarding.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col border-white/10 bg-neutral-900/70 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#E9FB36]/60 ${
                plan.highlight ? "ring-2 ring-[#E9FB36]/60" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-semibold text-white">
                    {plan.name}
                  </CardTitle>
                  {plan.highlight ? (
                    <Badge className="bg-[#E9FB36] text-neutral-900">{plan.highlight}</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-neutral-300">{plan.description}</p>
                <div className="mt-6 text-3xl font-semibold text-[#E9FB36]">{plan.price}</div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="grid gap-3 text-sm text-neutral-300">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#E9FB36]" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-[#E9FB36] text-neutral-900 hover:bg-[#d3eb0f]"
                      : "border-white/30 text-white hover:border-[#E9FB36] hover:text-[#E9FB36]"
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
