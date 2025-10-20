import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function LeadCapture() {
  return (
    <section id="lead-capture" className="bg-neutral-950 py-24 text-white">
      <div className="container">
        <Card className="border-white/10 bg-neutral-900/80 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-6 p-10 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-4">
              <h3 className="text-3xl font-semibold">
                Teste grátis e coloque o funil sob controle
              </h3>
              <p className="text-neutral-300">
                Sem cartão de crédito. Integre sua conta Meta em 2 minutos e acompanhe todo o fluxo em um só lugar.
              </p>
            </div>
            <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="seuemail@empresa.com"
                className="h-12 border-white/20 bg-white/5 text-white placeholder:text-neutral-400"
              />
              <Button className="h-12 bg-[#E9FB36] text-neutral-900 hover:bg-[#d3eb0f]">
                Criar conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
