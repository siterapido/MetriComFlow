import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "Como funciona a integração com Meta Ads?",
    answer:
      "Conectamos diretamente ao Business Manager, puxando insights diários de campanhas, conjuntos e anúncios, além de custos e métricas de conversão.",
  },
  {
    question: "O CRM é personalizável?",
    answer:
      "Sim. Configure fases, rótulos e tarefas por squad. Comentários e menções ajudam a manter o contexto do time em um só lugar.",
  },
  {
    question: "Consigo definir metas para squads diferentes?",
    answer:
      "As tabelas client_goals e business_kpis permitem criar metas por cliente, squad e período, com alertas automáticos de desvio.",
  },
  {
    question: "Quais relatórios posso exportar?",
    answer:
      "Dashboards consolidados exportam KPIs chave, funil completo e relatório de desempenho semanal em poucos cliques.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-neutral-950 py-24 text-white">
      <div className="container max-w-3xl">
        <div className="text-center">
          <Badge className="bg-white/10 text-[#E9FB36]">FAQ</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-neutral-400">
            Tudo que você precisa saber para adotar um funil unificado com governança.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index}`}
              className="rounded-xl border border-white/10 bg-neutral-900/70 px-6"
            >
              <AccordionTrigger className="text-left text-lg font-medium text-white">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-neutral-300">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
