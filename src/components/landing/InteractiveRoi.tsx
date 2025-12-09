import { useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ArrowRight, TrendingUp } from "lucide-react";

const generateData = (leads: number, conversion: number) => {
  const data = [];
  let currentRevenue = 0;
  // Ticket médio assumido: R$ 500
  const ticketMedio = 500;
  
  for (let i = 1; i <= 6; i++) {
    // Crescimento composto simulado
    const monthLeads = leads * (1 + (i * 0.1)); 
    const sales = monthLeads * (conversion / 100);
    const revenue = sales * ticketMedio;
    currentRevenue = revenue;
    
    data.push({
      name: `Mês ${i}`,
      receita: Math.round(revenue),
      leads: Math.round(monthLeads)
    });
  }
  return data;
};

export function InteractiveRoi() {
  const [leads, setLeads] = useState(100);
  const [conversion, setConversion] = useState(5);
  
  const data = generateData(leads, conversion);
  const finalRevenue = data[data.length - 1].receita;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
      
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Simule seu <span className="text-gradient">Crescimento</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-12">
              Veja como pequenas melhorias na gestão de leads e conversão impactam exponencialmente seu faturamento com a InsightFy.
            </p>

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">Leads Mensais Atuais</label>
                  <span className="text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">{leads} leads</span>
                </div>
                <Slider
                  defaultValue={[100]}
                  max={1000}
                  step={10}
                  value={[leads]}
                  onValueChange={(v) => setLeads(v[0])}
                  className="py-4 cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">Taxa de Conversão (%)</label>
                  <span className="text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">{conversion}%</span>
                </div>
                <Slider
                  defaultValue={[5]}
                  max={20}
                  step={0.5}
                  value={[conversion]}
                  onValueChange={(v) => setConversion(v[0])}
                  className="py-4 cursor-pointer"
                />
              </div>

              <div className="bg-gradient-to-r from-card to-card/50 p-6 rounded-2xl border border-white/5 mt-8">
                <div className="text-sm text-muted-foreground mb-2">Potencial de Receita Mensal (6º mês)</div>
                <div className="text-4xl font-bold text-gradient flex items-center gap-3">
                  R$ {finalRevenue.toLocaleString('pt-BR')}
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="h-[400px] w-full glass-card p-6 rounded-3xl relative"
          >
            <div className="absolute top-0 right-0 p-6">
               <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))] animate-pulse" />
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={12}
                  tickFormatter={(value) => `R$${value/1000}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="receita" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </section>
  );
}








