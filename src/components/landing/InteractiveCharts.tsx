import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  RadialBar,
  RadialBarChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpiData = [
  { month: "Jan", leads: 420, cac: 190, roi: 2.5 },
  { month: "Fev", leads: 460, cac: 185, roi: 2.9 },
  { month: "Mar", leads: 510, cac: 178, roi: 3.1 },
  { month: "Abr", leads: 560, cac: 172, roi: 3.3 },
  { month: "Mai", leads: 610, cac: 168, roi: 3.5 },
];

const funnelData = [
  { etapa: "Impressões", valor: 125000 },
  { etapa: "Cliques", valor: 32000 },
  { etapa: "Leads", valor: 5800 },
  { etapa: "Oportunidades", valor: 1400 },
  { etapa: "Vendas", valor: 420 },
];

const goalsData = [
  { name: "Metas", value: 82, fill: "var(--color-metas)" },
];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "#E9FB36",
  },
  cac: {
    label: "CAC",
    color: "#F97316",
  },
  roi: {
    label: "ROI",
    color: "#38BDF8",
  },
  metas: {
    label: "Metas",
    color: "#E9FB36",
  },
};

export function InteractiveCharts() {
  return (
    <section id="dashboards" className="bg-neutral-950 py-24 text-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="bg-white/10 text-[#E9FB36]">Dashboards interativos</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Visualize KPIs, funil e metas em tempo real.
          </h2>
          <p className="mt-4 text-neutral-400">
            Alternância rápida entre visões estratégicas, acompanhando o funil completo e a performance por squad.
          </p>
        </div>

        <Card className="mt-16 border-white/10 bg-neutral-900/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">
              Dashboards conectados ao vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kpis" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/5">
                <TabsTrigger value="kpis">KPIs</TabsTrigger>
                <TabsTrigger value="funnel">Funil</TabsTrigger>
                <TabsTrigger value="goals">Metas</TabsTrigger>
              </TabsList>
              <TabsContent value="kpis" className="mt-8">
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <LineChart data={kpiData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="leads" stroke="#E9FB36" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="cac" stroke="#F97316" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="roi" stroke="#38BDF8" strokeWidth={3} dot={false} />
                  </LineChart>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="funnel" className="mt-8">
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <BarChart data={funnelData} barSize={36}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="etapa" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    />
                    <Bar dataKey="valor" radius={[12, 12, 0, 0]} fill="#E9FB36" />
                  </BarChart>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="goals" className="mt-8">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <ChartContainer config={chartConfig} className="h-[320px] w-full max-w-sm">
                    <RadialBarChart innerRadius="60%" outerRadius="100%" data={goalsData} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={12} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="space-y-4 text-left text-neutral-300">
                    <h3 className="text-2xl font-semibold text-white">
                      82% das metas atingidas neste trimestre
                    </h3>
                    <p>
                      Combine metas estratégicas com o acompanhamento diário do time. Alertas automáticos sinalizam risco quando o ritmo desacelera.
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="h-3 w-3 rounded-full bg-[#E9FB36]" />
                      <span className="text-sm text-neutral-400">Progresso consolidado pelo squad de crescimento</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
