import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetaCampaignOverviewRow } from "@/lib/metaMetrics";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type CampaignOverviewTableProps = {
  data: MetaCampaignOverviewRow[];
  isLoading?: boolean;
};

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

export function CampaignOverviewTable({ data, isLoading }: CampaignOverviewTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-12 w-2/3 rounded" />
      </div>
    );
  }

  if (!data.length) {
    return <p className="text-muted-foreground text-sm">Sem campanhas no período selecionado.</p>;
  }

  const highlightId = data.reduce(
    (max, campaign) => (campaign.impressions > max.value ? { id: campaign.id, value: campaign.impressions } : max),
    { id: data[0]?.id ?? "", value: data[0]?.impressions ?? 0 },
  ).id;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-48 text-muted-foreground">Campanha</TableHead>
          <TableHead className="text-right text-muted-foreground">Impressões</TableHead>
          <TableHead className="text-right text-muted-foreground">Cliques</TableHead>
          <TableHead className="text-right text-muted-foreground">CPC</TableHead>
          <TableHead className="text-right text-muted-foreground">CPM</TableHead>
          <TableHead className="text-right text-muted-foreground">Unique CTR</TableHead>
          <TableHead className="text-right text-muted-foreground">Unique CTR (Rate)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((campaign) => {
          const highlighted = campaign.id === highlightId;
          return (
            <TableRow
              key={campaign.id}
              className={highlighted ? "bg-gradient-to-r from-amber-500/10 to-transparent" : undefined}
            >
              <TableCell className="font-medium text-foreground">{campaign.name}</TableCell>
              <TableCell className="text-right font-semibold">
                <span className={highlighted ? "text-amber-400" : undefined}>
                  {formatNumber(campaign.impressions)}
                </span>
              </TableCell>
              <TableCell className="text-right text-foreground">{formatNumber(campaign.clicks)}</TableCell>
              <TableCell className="text-right text-foreground">
                {formatCurrency(campaign.cpc, { currency: "BRL", locale: "pt-BR" })}
              </TableCell>
              <TableCell className="text-right text-foreground">
                {formatCurrency(campaign.cpm, { currency: "BRL", locale: "pt-BR" })}
              </TableCell>
              <TableCell className="text-right text-foreground">{formatPercentage(campaign.uniqueCtr)}</TableCell>
              <TableCell className="text-right text-foreground">{formatNumber(campaign.uniqueCtrRate)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
