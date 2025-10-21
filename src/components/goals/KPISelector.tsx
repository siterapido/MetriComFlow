import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  DollarSign, Users, CheckCircle, TrendingUp, Layers, BarChart3,
  Wallet, Eye, MousePointer, Target, PieChart, Settings, Search
} from 'lucide-react'
import type { GoalType } from '@/types/goals'
import { GOAL_TYPE_METADATA } from '@/types/goals'

interface KPISelectorProps {
  value: GoalType
  onChange: (value: GoalType) => void
  allowedCategories?: Array<'crm' | 'meta' | 'revenue' | 'custom'>
  className?: string
}

const ICON_MAP: Record<string, any> = {
  DollarSign,
  Users,
  CheckCircle,
  TrendingUp,
  Layers,
  BarChart3,
  Wallet,
  Eye,
  MousePointer,
  Target,
  PieChart,
  Settings,
}

export function KPISelector({ value, onChange, allowedCategories, className }: KPISelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crm' | 'meta' | 'revenue' | 'custom'>('all')

  const allowedCategorySet = new Set(allowedCategories ?? ['crm', 'meta', 'revenue', 'custom'])

  // Filter KPIs by search term and category
  const filteredKPIs = Object.entries(GOAL_TYPE_METADATA).filter(([key, metadata]) => {
    if (!allowedCategorySet.has(metadata.category)) {
      return false
    }

    const matchesSearch =
      metadata.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metadata.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || metadata.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const categories = [
    { id: 'all', label: 'Todos', color: 'bg-muted' },
    { id: 'crm', label: 'CRM', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'meta', label: 'Meta Ads', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { id: 'revenue', label: 'Receita', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'custom', label: 'Custom', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  ].filter((category) => category.id === 'all' || allowedCategorySet.has(category.id as any))

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="kpi-search" className="text-foreground">Buscar KPI</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="kpi-search"
            type="text"
            placeholder="Ex: faturamento, leads, ROAS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge
            key={category.id}
            className={`cursor-pointer transition-all ${
              selectedCategory === category.id
                ? category.color
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setSelectedCategory(category.id as any)}
          >
            {category.label}
          </Badge>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] lg:max-h-[520px] overflow-y-auto pr-2">
        {filteredKPIs.map(([key, metadata]) => {
          const Icon = ICON_MAP[metadata.icon] || Target
          const isSelected = value === key

          return (
            <Card
              key={key}
              className={`
                cursor-pointer transition-all p-4 hover:shadow-md
                ${isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary'
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
              onClick={() => onChange(key as GoalType)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-primary' : 'bg-gradient-to-br from-primary to-secondary'}
                  `}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {metadata.label}
                    </h4>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {metadata.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {metadata.category === 'crm' && 'CRM'}
                      {metadata.category === 'meta' && 'Meta Ads'}
                      {metadata.category === 'revenue' && 'Receita'}
                      {metadata.category === 'custom' && 'Custom'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {metadata.unit === 'currency' && 'R$'}
                      {metadata.unit === 'percentage' && '%'}
                      {metadata.unit === 'number' && '#'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredKPIs.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhum KPI encontrado para "{searchTerm}"
          </p>
        </div>
      )}

      {/* Selected KPI Info */}
      {value && (
        <Card className="border-primary/50 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              {(() => {
                const Icon = ICON_MAP[GOAL_TYPE_METADATA[value].icon] || Target
                return <Icon className="w-5 h-5 text-white" />
              })()}
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                KPI Selecionado: {GOAL_TYPE_METADATA[value].label}
              </h4>
              <p className="text-sm text-muted-foreground">
                {GOAL_TYPE_METADATA[value].description}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
