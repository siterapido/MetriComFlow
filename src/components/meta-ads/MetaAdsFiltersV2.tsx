import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'
import { useAdAccounts, useAdCampaigns } from '@/hooks/useMetaMetrics'
import { DateRangeFilter } from './DateRangeFilter'

export type FilterValues = {
  accountId?: string
  campaignId?: string
  dateRange?: { start: string; end: string }
}

type MetaAdsFiltersProps = {
  filters: FilterValues
  onFiltersChange: (filters: FilterValues) => void
}

export function MetaAdsFilters({ filters, onFiltersChange }: MetaAdsFiltersProps) {
  const { data: accounts, isLoading: accountsLoading } = useAdAccounts()
  const { data: campaigns, isLoading: campaignsLoading } = useAdCampaigns(filters.accountId)

  const handleAccountChange = (accountId: string) => {
    // Reset campaign when account changes
    onFiltersChange({ ...filters, accountId: accountId === 'all' ? undefined : accountId, campaignId: undefined })
  }

  const handleCampaignChange = (campaignId: string) => {
    onFiltersChange({ ...filters, campaignId: campaignId === 'all' ? undefined : campaignId })
  }

  const handleDateRangeChange = (dateRange: { start: string; end: string }) => {
    onFiltersChange({ ...filters, dateRange })
  }

  const handleClearFilters = () => {
    const today = new Date()
    const last90Days = new Date()
    last90Days.setDate(last90Days.getDate() - 90)

    onFiltersChange({
      accountId: undefined,
      campaignId: undefined,
      dateRange: {
        start: last90Days.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      },
    })
  }

  const hasActiveFilters = filters.accountId || filters.campaignId

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period Selector */}
          <div className="space-y-2">
            <Label htmlFor="period" className="text-foreground">Período</Label>
            <DateRangeFilter
              value={filters.dateRange}
              onChange={handleDateRangeChange}
            />
          </div>

          {/* Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="account" className="text-foreground">Conta Publicitária</Label>
            <Select
              value={filters.accountId || 'all'}
              onValueChange={handleAccountChange}
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
              onValueChange={handleCampaignChange}
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
