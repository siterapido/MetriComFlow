/**
 * Tabela de Performance de Campanhas
 * Exibe métricas consolidadas por campanha
 */

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCampaignFinancialsFiltered } from '@/hooks/useMetaMetrics';

interface CampaignPerformanceTableProps {
  accountId?: string;
  campaignId?: string;
  dateRange?: { start: string; end: string };
}

export function CampaignPerformanceTable({
  accountId,
  campaignId,
  dateRange,
}: CampaignPerformanceTableProps) {
  const { data: campaigns, isLoading } = useCampaignFinancialsFiltered({
    accountId,
    campaignId,
    dateRange,
  });

  const sortedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    // Sort by spend (descending)
    return [...campaigns].sort((a, b) => (b.investimento || 0) - (a.investimento || 0));
  }, [campaigns]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma campanha encontrada para o período selecionado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold">Campanha</TableHead>
            <TableHead className="text-right font-bold">Status</TableHead>
            <TableHead className="text-right font-bold">Gasto</TableHead>
            <TableHead className="text-right font-bold">Leads</TableHead>
            <TableHead className="text-right font-bold">CPL</TableHead>
            <TableHead className="text-right font-bold">CTR</TableHead>
            <TableHead className="text-right font-bold">Impressões</TableHead>
            <TableHead className="text-right font-bold">Cliques</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCampaigns.map((campaign) => {
            const hasLeads = (campaign.leads_gerados || 0) > 0;
            const hasSpend = (campaign.investimento || 0) > 0;
            const cplStatus =
              hasLeads && campaign.cpl
                ? campaign.cpl < 30
                  ? 'good'
                  : campaign.cpl < 60
                  ? 'average'
                  : 'bad'
                : 'none';

            return (
              <TableRow key={campaign.campaign_id} className="hover:bg-muted/30">
                {/* Campaign Name */}
                <TableCell className="font-medium">
                  <div>
                    <p className="text-foreground">{campaign.campaign_name}</p>
                    {campaign.account_name && (
                      <p className="text-xs text-muted-foreground">{campaign.account_name}</p>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="text-right">
                  <Badge
                    variant={campaign.campaign_status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={
                      campaign.campaign_status === 'ACTIVE'
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {campaign.campaign_status || 'UNKNOWN'}
                  </Badge>
                </TableCell>

                {/* Gasto */}
                <TableCell className="text-right">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(campaign.investimento || 0)}
                  </span>
                </TableCell>

                {/* Leads */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-lg text-foreground">
                      {formatNumber(campaign.leads_gerados || 0)}
                    </span>
                    {hasLeads && hasSpend && (
                      <>
                        {cplStatus === 'good' && (
                          <TrendingUp className="w-4 h-4 text-success" />
                        )}
                        {cplStatus === 'bad' && (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </>
                    )}
                  </div>
                </TableCell>

                {/* CPL */}
                <TableCell className="text-right">
                  {hasLeads ? (
                    <span
                      className={`font-semibold ${
                        cplStatus === 'good'
                          ? 'text-success'
                          : cplStatus === 'bad'
                          ? 'text-destructive'
                          : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(campaign.cpl || 0)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* CTR */}
                <TableCell className="text-right">
                  <span className="text-foreground">
                    {campaign.ctr ? `${campaign.ctr.toFixed(2)}%` : '0%'}
                  </span>
                </TableCell>

                {/* Impressões */}
                <TableCell className="text-right">
                  <span className="text-muted-foreground">
                    {formatNumber(campaign.impressions || 0)}
                  </span>
                </TableCell>

                {/* Cliques */}
                <TableCell className="text-right">
                  <span className="text-muted-foreground">
                    {formatNumber(campaign.clicks || 0)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total de Campanhas</p>
            <p className="text-lg font-bold text-foreground">{campaigns.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gasto Total</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(
                campaigns.reduce((sum, c) => sum + (c.investimento || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total de Leads</p>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(
                campaigns.reduce((sum, c) => sum + (c.leads_gerados || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">CPL Médio</p>
            <p className="text-lg font-bold text-foreground">
              {(() => {
                const totalSpend = campaigns.reduce((sum, c) => sum + (c.investimento || 0), 0);
                const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads_gerados || 0), 0);
                const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
                return formatCurrency(avgCpl);
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
