/**
 * Tipos de Dashboards - Meta Ads e CRM
 * 
 * Baseado nas práticas mais comuns do mercado para análise de campanhas
 * e gestão de vendas.
 */

export type DashboardCategory = 'meta-ads' | 'crm';

export interface DashboardType {
  id: string;
  name: string;
  description: string;
  category: DashboardCategory;
  icon: string; // Nome do ícone do lucide-react
  popular?: boolean; // Se é um dos mais usados no mercado
}

/**
 * Dashboards Meta Ads - Baseados nas melhores práticas do mercado
 */
export const META_ADS_DASHBOARDS: DashboardType[] = [
  {
    id: 'performance-overview',
    name: 'Visão Geral de Performance',
    description: 'KPIs principais: ROAS, CPL, CPC, CTR, investimento e leads gerados',
    category: 'meta-ads',
    icon: 'TrendingUp',
    popular: true,
  },
  {
    id: 'campaign-analysis',
    name: 'Análise de Campanhas',
    description: 'Comparação detalhada de campanhas, conjuntos de anúncios e anúncios individuais',
    category: 'meta-ads',
    icon: 'BarChart3',
    popular: true,
  },
  {
    id: 'creative-performance',
    name: 'Performance de Criativos',
    description: 'Análise de headlines, CTAs, imagens e vídeos que mais convertem',
    category: 'meta-ads',
    icon: 'Image',
    popular: true,
  },
  {
    id: 'budget-spend',
    name: 'Orçamento e Gastos',
    description: 'Distribuição de investimento, controle de budget e projeções',
    category: 'meta-ads',
    icon: 'DollarSign',
    popular: false,
  },
  {
    id: 'conversion-funnel',
    name: 'Funil de Conversão',
    description: 'Jornada completa: impressões → cliques → leads → conversões',
    category: 'meta-ads',
    icon: 'Filter',
    popular: true,
  },
  {
    id: 'roas-roi',
    name: 'ROAS e ROI',
    description: 'Retorno sobre investimento detalhado com análise de receita vs custos',
    category: 'meta-ads',
    icon: 'Target',
    popular: true,
  },
  {
    id: 'ad-set-performance',
    name: 'Performance de Conjuntos',
    description: 'Análise semanal e comparativa de conjuntos de anúncios (Ad Sets)',
    category: 'meta-ads',
    icon: 'Layers',
    popular: false,
  },
  {
    id: 'audience-insights',
    name: 'Insights de Audiência',
    description: 'Análise demográfica, geográfica e comportamental do público alcançado',
    category: 'meta-ads',
    icon: 'Users',
    popular: false,
  },
];

/**
 * Dashboards CRM - Baseados nas melhores práticas do mercado
 */
export const CRM_DASHBOARDS: DashboardType[] = [
  {
    id: 'sales-pipeline',
    name: 'Pipeline de Vendas',
    description: 'Funil completo: novos leads → qualificação → proposta → negociação → fechamento',
    category: 'crm',
    icon: 'Workflow',
    popular: true,
  },
  {
    id: 'revenue-dashboard',
    name: 'Dashboard de Receita',
    description: 'Faturamento mensal/anual, ticket médio, receita recorrente e projeções',
    category: 'crm',
    icon: 'DollarSign',
    popular: true,
  },
  {
    id: 'lead-management',
    name: 'Gestão de Leads',
    description: 'Volume de leads, origem, qualidade, taxa de conversão e tempo médio',
    category: 'crm',
    icon: 'UserPlus',
    popular: true,
  },
  {
    id: 'sales-performance',
    name: 'Performance de Vendas',
    description: 'Métricas por vendedor, taxa de fechamento, ciclo de vendas e atividades',
    category: 'crm',
    icon: 'TrendingUp',
    popular: true,
  },
  {
    id: 'conversion-rates',
    name: 'Taxas de Conversão',
    description: 'Taxa de conversão por etapa do funil, origem de leads e período',
    category: 'crm',
    icon: 'Percent',
    popular: false,
  },
  {
    id: 'activity-tracking',
    name: 'Rastreamento de Atividades',
    description: 'Ligações, e-mails, reuniões e interações com leads e clientes',
    category: 'crm',
    icon: 'Activity',
    popular: false,
  },
  {
    id: 'forecast-goals',
    name: 'Previsões e Metas',
    description: 'Previsão de receita, metas vs realizado e probabilidade de fechamento',
    category: 'crm',
    icon: 'Target',
    popular: true,
  },
  {
    id: 'customer-journey',
    name: 'Jornada do Cliente',
    description: 'Análise completa do ciclo de vida: primeiro contato até pós-venda',
    category: 'crm',
    icon: 'Route',
    popular: false,
  },
];

/**
 * Todos os dashboards disponíveis
 */
export const ALL_DASHBOARDS: DashboardType[] = [
  ...META_ADS_DASHBOARDS,
  ...CRM_DASHBOARDS,
];

/**
 * Buscar dashboard por ID
 */
export function getDashboardById(id: string): DashboardType | undefined {
  return ALL_DASHBOARDS.find((d) => d.id === id);
}

/**
 * Buscar dashboards por categoria
 */
export function getDashboardsByCategory(category: DashboardCategory): DashboardType[] {
  return ALL_DASHBOARDS.filter((d) => d.category === category);
}

/**
 * Buscar dashboards populares
 */
export function getPopularDashboards(): DashboardType[] {
  return ALL_DASHBOARDS.filter((d) => d.popular === true);
}







