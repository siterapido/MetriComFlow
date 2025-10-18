import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClientGoals, useDeleteClientGoal } from "@/hooks/useClientGoals";
import { useRevenueRecords } from "@/hooks/useDashboard";
import { NewGoalModal } from "@/components/goals/NewGoalModal";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";

type ClientGoal = Database['public']['Tables']['client_goals']['Row'];

const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    "Excelente": "bg-success text-success-foreground",
    "Em dia": "bg-primary text-primary-foreground",
    "Atrasado": "bg-warning text-warning-foreground",
    "Crítico": "bg-destructive text-destructive-foreground"
  };
  return colors[status] || "bg-muted text-muted-foreground";
};

export default function Metas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ClientGoal | null>(null);

  const { data: clientGoals, isLoading: goalsLoading } = useClientGoals();
  const { data: revenueRecords, isLoading: revenueLoading } = useRevenueRecords('new_up', new Date().getFullYear());
  const deleteGoal = useDeleteClientGoal();

  const handleEdit = (goal: ClientGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a meta de "${companyName}"?`)) {
      try {
        await deleteGoal.mutateAsync(id);
        toast.success("Meta excluída com sucesso!");
      } catch (error) {
        toast.error("Erro ao excluir meta. Tente novamente.");
      }
    }
  };

  const handleNewGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  // Transform revenue into monthly evolution
  const monthlyEvolution = useMemo(() => {
    if (!revenueRecords) return [];

    const monthOrder = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const grouped = revenueRecords.reduce((acc, record) => {
      if (!acc[record.month]) {
        acc[record.month] = {
          month: record.month,
          faturamento: 0
        };
      }
      acc[record.month].faturamento += record.amount;
      return acc;
    }, {} as Record<string, any>);

    return monthOrder
      .filter(month => grouped[month])
      .map(month => grouped[month]);
  }, [revenueRecords]);

  // Calculate goal achievement
  const goalAchievement = useMemo(() => {
    if (!clientGoals || clientGoals.length === 0) return [];

    const totalGoal = clientGoals.reduce((sum, goal) => sum + goal.goal_amount, 0);
    const totalAchieved = clientGoals.reduce((sum, goal) => sum + goal.achieved_amount, 0);
    const achievedPercentage = totalGoal > 0 ? (totalAchieved / totalGoal * 100) : 0;

    return [
      { name: "Meta Atingida", value: Math.min(achievedPercentage, 100), color: "#2DA7FF" },
      { name: "Pendente", value: Math.max(100 - achievedPercentage, 0), color: "#0D9DFF" }
    ];
  }, [clientGoals]);

  const isLoading = goalsLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metas dos Clientes</h1>
          <p className="text-muted-foreground">Acompanhamento de metas e performance</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleNewGoal}>
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </div>

      {/* Cliente Goals Grid */}
      {clientGoals && clientGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientGoals.map((client) => (
            <Card key={client.id} className="border-border bg-card hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {client.company_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(client.status)}>
                      {client.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(client.id, client.company_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Values */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta:</span>
                    <span className="font-medium text-foreground">
                      R$ {client.goal_amount.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atingido:</span>
                    <span className="font-medium text-primary">
                      R$ {client.achieved_amount.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium text-foreground">{client.percentage.toFixed(0)}%</span>
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

                {/* Period */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Período: {new Date(client.period_start).toLocaleDateString('pt-BR')} - {new Date(client.period_end).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma meta cadastrada ainda.
              </p>
              <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleNewGoal}>
                <Plus className="w-4 h-4" />
                Criar Primeira Meta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        {monthlyEvolution.length > 0 && (
          <Card className="lg:col-span-2 xl:col-span-1 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Evolução do Faturamento</CardTitle>
              <CardDescription className="text-muted-foreground">
                Faturamento mensal dos últimos meses
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
        )}

        {/* Goal Achievement Pie Chart */}
        {goalAchievement.length > 0 && goalAchievement[0].value > 0 && (
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
                    <span className="text-sm text-muted-foreground">
                      {entry.name}: {entry.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Goal Modal */}
      <NewGoalModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        goal={editingGoal}
        onSuccess={handleModalClose}
      />
    </div>
  );
}
