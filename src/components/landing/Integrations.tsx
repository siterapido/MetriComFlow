import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlugZap, Workflow, ShieldCheck } from "lucide-react";

const integrations = [
  {
    title: "Meta Ads",
    description: "sync-daily-insights com campanhas, conjuntos e anúncios.",
    icon: PlugZap,
    badge: "Integração oficial",
  },
  {
    title: "Webhook Lead Ads",
    description: "CRM automático com leads entrando em segundos e dedup automático.",
    icon: Workflow,
    badge: "Novo recurso",
  },
  {
    title: "Regras & Dedup",
    description: "Qualificação automática com regras inteligentes e score de prioridade.",
    icon: ShieldCheck,
  },
];

export function Integrations() {
  return (
    <section className="bg-neutral-950 py-24 text-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="bg-white/10 text-[#E9FB36]">Integrações</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Conectado ao que importa desde o primeiro login.
          </h2>
          <p className="mt-4 text-neutral-400">
            APIs oficiais, webhooks automáticos e workflows inteligentes para manter seus dados atualizados.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {integrations.map((integration) => (
            <Card
              key={integration.title}
              className="relative border-white/10 bg-neutral-900/70 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#E9FB36]/50"
            >
              <CardHeader className="flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9FB36]/15 text-[#E9FB36]">
                  <integration.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl font-semibold text-white">
                    {integration.title}
                  </CardTitle>
                  {integration.badge ? (
                    <Badge className="bg-[#E9FB36] text-neutral-900">{integration.badge}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-300">{integration.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
