import React, { useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react'
import { useSalesReports } from '@/hooks/useSalesReports'
import { useTeamMembers } from '@/hooks/useTeamMembers'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface SalesReportsProps {
  className?: string
}

export function SalesReports({ className }: SalesReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(new Date())
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  const { data: teamMembers } = useTeamMembers()
  const { data: salesData, isLoading } = useSalesReports({
    startDate: startOfMonth(selectedPeriod),
    endDate: endOfMonth(selectedPeriod),
    assignedTo: selectedMember === 'all' ? undefined : selectedMember
  })

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPeriod(subMonths(selectedPeriod, 1))
    } else {
      setSelectedPeriod(addMonths(selectedPeriod, 1))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const stats = salesData || {
    totalRevenue: 0,
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    averageDealSize: 0,
    averageClosingTime: 0,
    revenueBySource: [],
    revenueByMember: [],
    conversionByMember: [],
    monthlyTrend: []
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabeçalho com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios de Vendas</h2>
          <p className="text-muted-foreground">
            Análise de performance e métricas de conversão
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {teamMembers?.map(member => (
                <SelectItem key={member.id} value={member.profile_id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigatePeriod('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-32 text-center">
              {format(selectedPeriod, 'MMMM yyyy', { locale: ptBR })}
            </span>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigatePeriod('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Receita Total
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5% vs mês anterior
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Conversão
                </p>
                <p className="text-2xl font-bold">
                  {formatPercentage(stats.conversionRate)}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +2.1% vs mês anterior
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ticket Médio
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.averageDealSize)}
                </p>
                <p className="text-xs text-red-600 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -5.2% vs mês anterior
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tempo Médio de Fechamento
                </p>
                <p className="text-2xl font-bold">
                  {stats.averageClosingTime} dias
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  -3 dias vs mês anterior
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e análises */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Conversão por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.conversionByMember}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatPercentage(Number(value)), 'Taxa de Conversão']}
                  />
                  <Bar dataKey="conversionRate" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Fonte de Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.revenueBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.revenueBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.revenueByMember}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Receita']}
                  />
                  <Bar dataKey="revenue" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo detalhado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de Leads</span>
              <Badge variant="secondary">{stats.totalLeads}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Leads Convertidos</span>
              <Badge variant="secondary">{stats.convertedLeads}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
              <Badge variant="secondary">{formatPercentage(stats.conversionRate)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receita Total</span>
              <Badge variant="secondary">{formatCurrency(stats.totalRevenue)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas vs Realizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Meta de Receita</span>
                <span>R$ 50.000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats.totalRevenue / 50000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage((stats.totalRevenue / 50000) * 100)} da meta
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Meta de Conversão</span>
                <span>25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats.conversionRate / 25) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage((stats.conversionRate / 25) * 100)} da meta
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}