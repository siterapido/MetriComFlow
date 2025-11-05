
import { useGetMetrics } from '@/hooks/useGetMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface AdSetPerformanceTableProps {
  since: string;
  until: string;
  adAccountIds: string[];
  campaignIds?: string[];
}

export const AdSetPerformanceTable = ({ since, until, adAccountIds, campaignIds }: AdSetPerformanceTableProps) => {
  const { data, isLoading, error } = useGetMetrics({
    since,
    until,
    ad_account_ids: adAccountIds,
    campaign_ids: campaignIds,
    level: 'adSet',
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading data</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ad Set</TableHead>
          <TableHead>Spend</TableHead>
          <TableHead>Impressions</TableHead>
          <TableHead>Clicks</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Link Clicks</TableHead>
          <TableHead>Post Engagement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.data.map((row: any) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.spend}</TableCell>
            <TableCell>{row.impressions}</TableCell>
            <TableCell>{row.clicks}</TableCell>
            <TableCell>{row.leads_count}</TableCell>
            <TableCell>{row.link_clicks}</TableCell>
            <TableCell>{row.post_engagement}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
