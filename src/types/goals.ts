// =====================================================
// Unified Goals System Types
// =====================================================

export type GoalType =
  // CRM Metrics
  | 'crm_revenue'          // Faturamento do CRM
  | 'crm_leads_generated'  // Leads gerados
  | 'crm_leads_converted'  // Leads convertidos (fechado_ganho)
  | 'crm_conversion_rate'  // Taxa de conversão
  | 'crm_pipeline_value'   // Valor total do pipeline
  | 'crm_avg_deal_size'    // Ticket médio
  // Meta Ads Metrics
  | 'meta_roas'            // Return on Ad Spend
  | 'meta_cpl'             // Custo por Lead
  | 'meta_cpc'             // Custo por Clique
  | 'meta_cpm'             // Custo por Mil Impressões
  | 'meta_investment'      // Investimento total
  | 'meta_leads'           // Leads do Meta Ads
  | 'meta_impressions'     // Impressões
  | 'meta_clicks'          // Cliques
  | 'meta_ctr'             // Click-through rate
  | 'meta_frequency'       // Frequência média
  | 'meta_reach'           // Alcance único
  // Revenue Metrics
  | 'revenue_total'        // Receita total
  | 'revenue_by_category'  // Receita por categoria
  // Custom
  | 'custom'               // Metas customizadas

export type GoalPeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived'

export type ComputedGoalStatus = 'Excelente' | 'Em dia' | 'Atrasado' | 'Crítico'

export interface Goal {
  id: string

  // Basic info
  title: string
  description: string | null
  goal_type: GoalType

  // Target and current values
  target_value: number
  current_value: number
  start_value: number

  // Period
  period_type: GoalPeriodType
  period_start: string // ISO date
  period_end: string   // ISO date

  // Filters (for Meta Ads integration)
  meta_account_id: string | null
  meta_campaign_id: string | null

  // Revenue category filter
  revenue_category: 'new_up' | 'clientes' | 'oportunidades' | null

  // Custom formula for 'custom' type goals
  custom_formula: string | null

  // Status and metadata
  status: GoalStatus
  color: string
  icon: string | null

  // Owner and timestamps
  created_by: string | null
  created_at: string
  updated_at: string

  // Calculated fields (generated in database)
  progress_percentage: number
  computed_status: ComputedGoalStatus
}

export interface GoalProgress {
  id: string
  goal_id: string
  recorded_at: string
  value: number
  data_source: 'crm' | 'meta_ads' | 'revenue' | 'manual' | 'auto' | null
  notes: string | null
  created_at: string
}

// Insert types (without generated/calculated fields)
export type GoalInsert = Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'progress_percentage' | 'computed_status'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type GoalUpdate = Partial<Omit<Goal, 'id' | 'created_at' | 'progress_percentage' | 'computed_status'>>

export type GoalProgressInsert = Omit<GoalProgress, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

// Helper types for goal creation form
export interface GoalFormData {
  title: string
  description?: string
  goal_type: GoalType
  target_value: number
  period_type: GoalPeriodType
  period_start: string
  period_end: string
  meta_account_id?: string
  meta_campaign_id?: string
  revenue_category?: 'new_up' | 'clientes' | 'oportunidades'
  custom_formula?: string
  color?: string
  icon?: string
}

// Goal type metadata for UI
export interface GoalTypeMetadata {
  label: string
  description: string
  icon: string
  category: 'crm' | 'meta' | 'revenue' | 'custom'
  unit: 'currency' | 'number' | 'percentage'
  supportsFilters: {
    metaAccount: boolean
    metaCampaign: boolean
    revenueCategory: boolean
  }
}

export const GOAL_TYPE_METADATA: Record<GoalType, GoalTypeMetadata> = {
  // CRM
  crm_revenue: {
    label: 'Faturamento (CRM)',
    description: 'Receita gerada por leads fechados no CRM',
    icon: 'DollarSign',
    category: 'crm',
    unit: 'currency',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  crm_leads_generated: {
    label: 'Leads Gerados',
    description: 'Total de leads criados no período',
    icon: 'Users',
    category: 'crm',
    unit: 'number',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  crm_leads_converted: {
    label: 'Leads Convertidos',
    description: 'Leads que fecharam negócio (fechado_ganho)',
    icon: 'CheckCircle',
    category: 'crm',
    unit: 'number',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  crm_conversion_rate: {
    label: 'Taxa de Conversão',
    description: 'Percentual de leads convertidos',
    icon: 'TrendingUp',
    category: 'crm',
    unit: 'percentage',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  crm_pipeline_value: {
    label: 'Valor do Pipeline',
    description: 'Valor total de oportunidades ativas',
    icon: 'Layers',
    category: 'crm',
    unit: 'currency',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  crm_avg_deal_size: {
    label: 'Ticket Médio',
    description: 'Valor médio de negócios fechados',
    icon: 'BarChart3',
    category: 'crm',
    unit: 'currency',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  },
  // Meta Ads
  meta_roas: {
    label: 'ROAS (Meta Ads)',
    description: 'Retorno sobre investimento em anúncios',
    icon: 'TrendingUp',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_cpl: {
    label: 'CPL (Custo por Lead)',
    description: 'Custo médio para gerar um lead',
    icon: 'DollarSign',
    category: 'meta',
    unit: 'currency',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_cpc: {
    label: 'CPC (Custo por Clique)',
    description: 'Custo médio por clique no anúncio',
    icon: 'DollarSign',
    category: 'meta',
    unit: 'currency',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_cpm: {
    label: 'CPM (Custo por Mil)',
    description: 'Custo por mil impressões',
    icon: 'DollarSign',
    category: 'meta',
    unit: 'currency',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_investment: {
    label: 'Investimento Total',
    description: 'Valor total investido em anúncios',
    icon: 'Wallet',
    category: 'meta',
    unit: 'currency',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_leads: {
    label: 'Leads (Meta Ads)',
    description: 'Total de leads gerados por anúncios',
    icon: 'Users',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_impressions: {
    label: 'Impressões',
    description: 'Total de visualizações dos anúncios',
    icon: 'Eye',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_clicks: {
    label: 'Cliques',
    description: 'Total de cliques nos anúncios',
    icon: 'MousePointer',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_ctr: {
    label: 'CTR (Taxa de Cliques)',
    description: 'Percentual de cliques sobre impressões',
    icon: 'Target',
    category: 'meta',
    unit: 'percentage',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_frequency: {
    label: 'Frequência',
    description: 'Frequência média de visualização por pessoa',
    icon: 'BarChart3',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  meta_reach: {
    label: 'Alcance',
    description: 'Número de pessoas únicas alcançadas',
    icon: 'Users',
    category: 'meta',
    unit: 'number',
    supportsFilters: { metaAccount: true, metaCampaign: true, revenueCategory: false }
  },
  // Revenue
  revenue_total: {
    label: 'Receita Total',
    description: 'Receita total registrada',
    icon: 'DollarSign',
    category: 'revenue',
    unit: 'currency',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: true }
  },
  revenue_by_category: {
    label: 'Receita por Categoria',
    description: 'Receita de uma categoria específica',
    icon: 'PieChart',
    category: 'revenue',
    unit: 'currency',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: true }
  },
  // Custom
  custom: {
    label: 'Meta Personalizada',
    description: 'Meta com fórmula customizada',
    icon: 'Settings',
    category: 'custom',
    unit: 'number',
    supportsFilters: { metaAccount: false, metaCampaign: false, revenueCategory: false }
  }
}

// Helper function to get goal status color
export function getGoalStatusColor(status: ComputedGoalStatus): string {
  const colors: Record<ComputedGoalStatus, string> = {
    'Excelente': 'bg-success text-success-foreground',
    'Em dia': 'bg-primary text-primary-foreground',
    'Atrasado': 'bg-warning text-warning-foreground',
    'Crítico': 'bg-destructive text-destructive-foreground'
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

// Helper function to format goal value based on unit type
export function formatGoalValue(value: number, unit: 'currency' | 'number' | 'percentage'): string {
  switch (unit) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      return value.toLocaleString('pt-BR')
  }
}
