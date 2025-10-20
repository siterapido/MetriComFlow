import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart4,
  Database,
  PlugZap,
  Target,
} from "lucide-react";

const features = [
  {
    id: "produto",
    title: "Integrações com Ads",
    description: "Conexão oficial com Meta Ads, webhooks de leads e sincronização diária de custos e resultados.",
    icon: PlugZap,
    bullets: ["Conexão segura com BM", "Webhooks de Lead Ads", "Sync diário de campanhas"],
    badge: "Novo",
  },
  {
    title: "CRM Essencial",
    description: "Pipeline completo para leads com tarefas, rótulos, comentários e históricos centralizados.",
    icon: Database,
    bullets: ["Gestão de leads e equipes", "Tarefas e lembretes", "Notas colaborativas"],
  },
  {
    title: "Metas e KPIs",
    description: "Sistema unificado com tabelas client_goals e business_kpis para acompanhar o plano e o realizado.",
    icon: Target,
    bullets: ["Metas mensais e semanais", "KPIs customizáveis", "Alertas de risco"],
    badge: "Mais popular",
  },
  {
    title: "Dashboards e Relatórios",
    description: "Métricas consolidadas, visualizações avançadas e exportação automática para squads.",
    icon: BarChart4,
    bullets: ["Visão 360° do funil", "KPIs chave de negócio", "Relatórios inteligentes"],
  },
];

export function FeatureGrid() {
  return (
    <section id="produto" className="bg-neutral-950 py-24 text-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="bg-white/10 text-[#E9FB36]">Produto completo</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Tudo que seu squad precisa para conectar Ads, CRM e Metas.
          </h2>
          <p className="mt-4 text-neutral-400">
            Quatro camadas integradas garantindo governança e velocidade operacional em um fluxo só.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="relative border-white/10 bg-neutral-900/70 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#E9FB36]/50"
            >
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="rounded-full bg-[#E9FB36]/15 p-3 text-[#E9FB36]">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-white">
                    {feature.title}
                  </CardTitle>
                  <p className="mt-2 text-sm text-neutral-300">{feature.description}</p>
                </div>
                {feature.badge ? (
                  <Badge className="absolute right-6 top-6 bg-[#E9FB36] text-neutral-900">
                    {feature.badge}
                  </Badge>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="mt-4 grid gap-2 text-sm text-neutral-300">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#E9FB36]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
