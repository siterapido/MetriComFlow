import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, TrendingUp, DollarSign, Target } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Mock data
const monthlyData = [
  { month: "Jan", newUp: 120000, clientes: 85000, oportunidades: 65000 },
  { month: "Fev", newUp: 135000, clientes: 92000, oportunidades: 78000 },
  { month: "Mar", newUp: 148000, clientes: 105000, oportunidades: 88000 },
  { month: "Abr", newUp: 162000, clientes: 118000, oportunidades: 95000 },
  { month: "Mai", newUp: 178000, clientes: 125000, oportunidades: 102000 },
  { month: "Jun", newUp: 195000, clientes: 138000, oportunidades: 115000 },
];

const COLORS = ['#2DA7FF', '#0D9DFF', '#1E40AF', '#3B82F6'];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Geral</h1>
          <p className="text-muted-foreground">Visão geral do faturamento e oportunidades</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Filter className="w-4 h-4" />
          Filtrar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-card to-accent/20 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 195.000</div>
            <p className="text-xs text-primary">+12.5% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-secondary/20 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Anual
            </CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 2.1M</div>
            <p className="text-xs text-secondary">Meta: R$ 2.5M</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-accent/10 border-border hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades Ativas
            </CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">47</div>
            <p className="text-xs text-accent">R$ 850.000 em pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* New Up Chart */}
        <Card className="lg:col-span-2 xl:col-span-1 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">New Up</CardTitle>
            <CardDescription className="text-muted-foreground">
              Faturamento da minha empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorNewUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DA7FF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2DA7FF" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newUp"
                  stroke="#2DA7FF"
                  fillOpacity={1}
                  fill="url(#colorNewUp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faturamento Clientes Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Faturamento Clientes</CardTitle>
            <CardDescription className="text-muted-foreground">
              Receita por contratos ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
                <Bar dataKey="clientes" fill="#0D9DFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Oportunidades Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Oportunidades</CardTitle>
            <CardDescription className="text-muted-foreground">
              Pipeline de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="oportunidades"
                  stroke="#0D9DFF"
                  strokeWidth={3}
                  dot={{ fill: "#0D9DFF", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}