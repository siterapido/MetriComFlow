import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAdAccounts, useAdCampaigns, getLastNDaysDateRange } from '@/hooks/useMetaMetrics'

export type FilterValues = {
  accountId?: string
  campaignId?: string
  dateRange?: { start: string; end: string }
  period?: string
}

type MetaAdsFiltersProps = {
  filters: FilterValues
  onFiltersChange: (filters: FilterValues) => void
}

const PERIOD_PRESETS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Últimos 12 meses' },
  { value: 'custom', label: 'Personalizado' },
]

export function MetaAdsFilters({ filters, onFiltersChange }: MetaAdsFiltersProps) {
  const { data: accounts, isLoading: accountsLoading } = useAdAccounts()
  const { data: campaigns, isLoading: campaignsLoading } = useAdCampaigns(filters.accountId)

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateRange?.start ? new Date(filters.dateRange.start) : undefined
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateRange?.end ? new Date(filters.dateRange.end) : undefined
  )
  const [showCustomDates, setShowCustomDates] = useState(filters.period === 'custom')

  const handlePeriodChange = (period: string) => {
    if (period === 'custom') {
      setShowCustomDates(true)
      onFiltersChange({ ...filters, period })
    } else {
      setShowCustomDates(false)
      const days = parseInt(period)
      const range = getLastNDaysDateRange(days)
      onFiltersChange({ ...filters, period, dateRange: range })
    }
  }

  const handleAccountChange = (accountId: string) => {
    // Reset campaign when account changes
    onFiltersChange({ ...filters, accountId, campaignId: undefined })
  }

  const handleCampaignChange = (campaignId: string) => {
    onFiltersChange({ ...filters, campaignId })
  }

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date)
    if (date && dateTo) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: format(date, 'yyyy-MM-dd'),
          end: format(dateTo, 'yyyy-MM-dd'),
        },
      })
    }
  }

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date)
    if (dateFrom && date) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: format(dateFrom, 'yyyy-MM-dd'),
          end: format(date, 'yyyy-MM-dd'),
        },
      })
    }
  }

  const handleClearFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setShowCustomDates(false)
    const defaultRange = getLastNDaysDateRange(30)
    onFiltersChange({
      accountId: undefined,
      campaignId: undefined,
      dateRange: defaultRange,
      period: '30',
    })
  }

  const hasActiveFilters = filters.accountId || filters.campaignId || filters.period !== '30'

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
              <p className="text-sm text-muted-foreground">Refine a visualização dos dados</p>
            </div>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Selector */}
          <div className="space-y-2">
            <Label htmlFor="period" className="text-foreground">Período</Label>
            <Select
              value={filters.period || '30'}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger id="period" className="bg-background">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="account" className="text-foreground">Conta Publicitária</Label>
            <Select
              value={filters.accountId || 'all'}
              onValueChange={(value) => handleAccountChange(value === 'all' ? '' : value)}
              disabled={accountsLoading}
            >
              <SelectTrigger id="account" className="bg-background">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.business_name || account.external_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Selector */}
          <div className="space-y-2">
            <Label htmlFor="campaign" className="text-foreground">Campanha</Label>
            <Select
              value={filters.campaignId || 'all'}
              onValueChange={(value) => handleCampaignChange(value === 'all' ? '' : value)}
              disabled={campaignsLoading || !filters.accountId}
            >
              <SelectTrigger id="campaign" className="bg-background">
                <SelectValue placeholder="Todas as campanhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaigns?.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range (only visible when custom period is selected) */}
          {showCustomDates && (
            <>
              <div className="space-y-2">
                <Label className="text-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={handleDateFromChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={handleDateToChange}
                      initialFocus
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {filters.accountId && (
                <div className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Conta: {accounts?.find(a => a.id === filters.accountId)?.business_name || 'Selecionada'}
                </div>
              )}
              {filters.campaignId && (
                <div className="px-3 py-1 bg-secondary/10 text-secondary text-sm rounded-full">
                  Campanha: {campaigns?.find(c => c.id === filters.campaignId)?.name || 'Selecionada'}
                </div>
              )}
              {filters.period && filters.period !== '30' && (
                <div className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full">
                  {PERIOD_PRESETS.find(p => p.value === filters.period)?.label || 'Período personalizado'}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
