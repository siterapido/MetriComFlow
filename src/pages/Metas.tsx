import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Mock data
const clientGoals = [
  {
    id: "1",
    company: "Empresa Alpha",
    goal: 150000,
    achieved: 125000,
    percentage: 83,
    status: "Em dia"
  },
  {
    id: "2",
    company: "Beta Solutions",
    goal: 200000,
    achieved: 180000,
    percentage: 90,
    status: "Em dia"
  },
  {
    id: "3",
    company: "Gamma Corp",
    goal: 100000,
    achieved: 65000,
    percentage: 65,
    status: "Atrasado"
  },
  {
    id: "4",
    company: "Delta Ltda",
    goal: 300000,
    achieved: 285000,
    percentage: 95,
    status: "Excelente"
  },
  {
    id: "5",
    company: "Epsilon Inc",
    goal: 120000,
    achieved: 48000,
    percentage: 40,
    status: "Crítico"
  },
  {
    id: "6",
    company: "Zeta Group",
    goal: 250000,
    achieved: 220000,
    percentage: 88,
    status: "Em dia"
  }
];

const monthlyEvolution = [
  { month: "Jan", faturamento: 80000 },
  { month: "Fev", faturamento: 95000 },
  { month: "Mar", faturamento: 120000 },
  { month: "Abr", faturamento: 135000 },
  { month: "Mai", faturamento: 145000 },
  { month: "Jun", faturamento: 160000 },
];

const goalAchievement = [
  { name: "Meta Atingida", value: 70, color: "#2DA7FF" },
  { name: "Pendente", value: 30, color: "#0D9DFF" }
];

const stoppedSales = [
  { cliente: "Alpha", valor: 25000, dias: 15 },
  { cliente: "Beta", valor: 40000, dias: 8 },
  { cliente: "Gamma", valor: 15000, dias: 22 },
  { cliente: "Delta", valor: 60000, dias: 5 },
];

const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    "Excelente": "bg-success text-success-foreground",
    "Em dia": "bg-primary text-primary-foreground",
    "Atrasado": "bg-warning text-warning-foreground",
    "Crítico": "bg-destructive text-destructive-foreground"
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 90) return "bg-success";
  if (percentage >= 70) return "bg-primary";
  if (percentage >= 50) return "bg-warning";
  return "bg-destructive";
};

export default function Metas() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metas dos Clientes</h1>
          <p className="text-muted-foreground">Acompanhamento de metas e performance</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </div>

      {/* Cliente Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientGoals.map((client) => (
          <Card key={client.id} className="border-border bg-card hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {client.company}
                </CardTitle>
                <Badge className={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Values */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta:</span>
                  <span className="font-medium text-foreground">
                    R$ {client.goal.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Atingido:</span>
                  <span className="font-medium text-primary">
                    R$ {client.achieved.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-foreground">{client.percentage}%</span>
                </div>
                <Progress 
                  value={client.percentage} 
                  className="h-2"
                />
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-xs">
                {client.percentage >= 90 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : client.percentage >= 50 ? (
                  <TrendingUp className="w-4 h-4 text-primary" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="text-muted-foreground">
                  {client.percentage >= 90 
                    ? "Performance excelente" 
                    : client.percentage >= 50 
                      ? "No caminho certo" 
                      : "Precisa de atenção"
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <Card className="lg:col-span-2 xl:col-span-1 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Evolução do Faturamento</CardTitle>
            <CardDescription className="text-muted-foreground">
              Faturamento mensal dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyEvolution}>
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
                  dataKey="faturamento"
                  stroke="#2DA7FF"
                  strokeWidth={3}
                  dot={{ fill: "#2DA7FF", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goal Achievement Pie Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Metas Atingidas</CardTitle>
            <CardDescription className="text-muted-foreground">
              Porcentagem de metas cumpridas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={goalAchievement}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {goalAchievement.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {goalAchievement.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stopped Sales Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Vendas Paradas</CardTitle>
            <CardDescription className="text-muted-foreground">
              Leads sem avanço nos últimos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stoppedSales} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="cliente" type="category" stroke="#9CA3AF" width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F9FAFB"
                  }}
                />
                <Bar dataKey="dias" fill="#0D9DFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}