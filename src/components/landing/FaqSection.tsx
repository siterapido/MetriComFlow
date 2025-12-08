import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FaqSection() {
  const faqs = [
    {
      q: "Preciso cadastrar cartão de crédito para testar?",
      a: "Não! Nosso plano gratuito permite que você explore todas as funcionalidades básicas sem compromisso financeiro. Apenas quando decidir fazer o upgrade, solicitaremos os dados de pagamento."
    },
    {
      q: "Como funciona a integração com o Meta Ads?",
      a: "É simples e segura. Você conecta sua conta do Facebook Business com apenas alguns cliques através da nossa integração oficial. Nós importamos suas campanhas e leads automaticamente em tempo real."
    },
    {
      q: "Posso cancelar minha assinatura a qualquer momento?",
      a: "Sim. Acreditamos na liberdade. Se você estiver no plano mensal, pode cancelar a qualquer momento sem multas. No plano anual, você tem 7 dias de garantia incondicional."
    },
    {
      q: "Serve para quem está começando agora?",
      a: "Com certeza. A InsightFy foi desenhada para ser intuitiva tanto para iniciantes quanto para experts. Além disso, temos tutoriais passo a passo para te ajudar a configurar tudo."
    },
    {
      q: "Meus dados estão seguros?",
      a: "Segurança é nossa prioridade. Utilizamos criptografia de ponta a ponta (a mesma dos bancos) e seguimos rigorosamente a LGPD. Seus dados são seus e nunca serão compartilhados."
    }
  ];

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Dúvidas Frequentes</h2>
          <p className="text-muted-foreground">Tudo o que você precisa saber antes de começar.</p>
        </div>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem 
              key={idx} 
              value={`item-${idx}`} 
              className="border border-white/5 rounded-xl px-6 bg-card/30 data-[state=open]:bg-card/50 data-[state=open]:border-primary/30 transition-all duration-300"
            >
              <AccordionTrigger className="text-lg hover:text-primary hover:no-underline py-6 text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed text-base">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}






