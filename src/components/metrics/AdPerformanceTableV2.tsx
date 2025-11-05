
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMetrics } from "@/hooks/useGetMetrics";
import { DateRange } from "react-day-picker";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type AdPerformanceTableV2Props = {
  adAccountIds: string[];
  campaignIds?: string[];
  adSetIds?: string[];
  dateRange: DateRange;
};

export function AdPerformanceTableV2({
  adAccountIds,
  campaignIds,
  adSetIds,
  dateRange,
}: AdPerformanceTableV2Props) {
  const { data: adMetrics, isLoading } = useGetMetrics({
    ad_account_ids: adAccountIds,
    campaign_ids: campaignIds,
    ad_set_ids: adSetIds,
    since: dateRange.from?.toISOString().split('T')[0] || '',
    until: dateRange.to?.toISOString().split('T')[0] || '',
    level: 'ad',
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!adMetrics || adMetrics.data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum dado de anúncio encontrado para o período e filtros selecionados.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Anúncio</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead className="text-right">Impressões</TableHead>
            <TableHead className="text-right">Cliques</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cliques no Link</TableHead>
            <TableHead className="text-right">Engaj. com a Publicação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adMetrics.data.map((ad: any) => (
            <TableRow key={ad.id}>
              <TableCell>
                 <span className="font-medium line-clamp-2">{ad.name}</span>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(ad.spend)}</TableCell>
              <TableCell className="text-right">{formatNumber(ad.impressions)}</TableCell>
              <TableCell className="text-right">{formatNumber(ad.clicks)}</TableCell>
              <TableCell className="text-right font-medium">{formatNumber(ad.leads_count)}</TableCell>
              <TableCell className="text-right">{formatNumber(ad.link_clicks)}</TableCell>
              <TableCell className="text-right">{formatNumber(ad.post_engagement)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
