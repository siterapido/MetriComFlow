import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { CampaignFinancials } from "@/hooks/useMetaMetrics";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export interface CampaignTableProps {
  campaigns: CampaignFinancials[];
  loading?: boolean;
}

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma campanha encontrada</p>
      </div>
    );
  }

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Ativa', className: 'bg-success text-success-foreground' },
      PAUSED: { label: 'Pausada', className: 'bg-warning text-warning-foreground' },
      ARCHIVED: { label: 'Arquivada', className: 'bg-muted text-muted-foreground' },
    };

    const config = statusMap[status || ''] || { label: status || '-', className: 'bg-muted' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getROASIndicator = (roas: number | null) => {
    if (!roas) return null;

    if (roas >= 3) {
      return <TrendingUp className="w-4 h-4 text-success inline ml-1" />;
    } else if (roas >= 1) {
      return <TrendingUp className="w-4 h-4 text-warning inline ml-1" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-destructive inline ml-1" />;
    }
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Campanha</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Investimento</TableHead>
            <TableHead className="font-semibold text-right">Impressões</TableHead>
            <TableHead className="font-semibold text-right">Clicks</TableHead>
            <TableHead className="font-semibold text-right">CTR</TableHead>
            <TableHead className="font-semibold text-right">Leads</TableHead>
            <TableHead className="font-semibold text-right">CPL</TableHead>
            <TableHead className="font-semibold text-right">Vendas</TableHead>
            <TableHead className="font-semibold text-right">Faturamento</TableHead>
            <TableHead className="font-semibold text-right">ROAS</TableHead>
            <TableHead className="font-semibold text-right">Conv. %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.campaign_id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <div>
                  <div className="text-sm">{campaign.campaign_name}</div>
                  {campaign.account_name && (
                    <div className="text-xs text-muted-foreground">
                      {campaign.account_name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(campaign.campaign_status)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(campaign.investimento)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(campaign.impressions)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(campaign.clicks)}
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  campaign.ctr >= 1 ? 'text-success' : 'text-muted-foreground'
                )}>
                  {formatPercentage(campaign.ctr)}
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(campaign.leads_gerados)}
              </TableCell>
              <TableCell className="text-right">
                {campaign.cpl ? formatCurrency(campaign.cpl) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-success font-medium">
                    {formatNumber(campaign.vendas_fechadas)}
                  </span>
                  {campaign.em_negociacao > 0 && (
                    <span className="text-xs text-warning">
                      (+{formatNumber(campaign.em_negociacao)})
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(campaign.faturamento)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end">
                  <span className={cn(
                    'font-medium',
                    campaign.roas && campaign.roas >= 3
                      ? 'text-success'
                      : campaign.roas && campaign.roas >= 1
                        ? 'text-warning'
                        : 'text-destructive'
                  )}>
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : '-'}
                  </span>
                  {getROASIndicator(campaign.roas)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  campaign.taxa_conversao >= 5 ? 'text-success' :
                  campaign.taxa_conversao >= 2 ? 'text-primary' :
                  'text-muted-foreground'
                )}>
                  {formatPercentage(campaign.taxa_conversao)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
