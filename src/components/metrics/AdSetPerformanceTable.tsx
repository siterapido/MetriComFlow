import { useGetMetrics, type GetMetricsResponse } from '@/hooks/useGetMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAds } from '@/hooks/useAdSetsAndAds';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface AdSetPerformanceTableProps {
  adAccountIds: string[];
  campaignIds?: string[];
  // Preferir dateRange; manter since/until para retrocompatibilidade
  dateRange?: DateRange;
  since?: string;
  until?: string;
}

export const AdSetPerformanceTable = ({ adAccountIds, campaignIds, dateRange, since, until }: AdSetPerformanceTableProps) => {
  const computedSince = since ?? (dateRange?.from ? dateRange.from.toISOString().split('T')[0] : '');
  const computedUntil = until ?? (dateRange?.to ? dateRange.to.toISOString().split('T')[0] : '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('spend');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useGetMetrics({
    since: computedSince,
    until: computedUntil,
    ad_account_ids: adAccountIds,
    campaign_ids: campaignIds,
    level: 'adSet',
  });
  const metrics = query.data as GetMetricsResponse | undefined;
  const adsQuery = useAds(expandedId ? { ad_set_id: expandedId } : undefined, { enabled: !!expandedId });
  const processed = useMemo(() => {
    const rows = metrics?.data ?? [];
    let list = rows.filter((r: any) => {
      const okSearch = search ? (String(r.name||'').toLowerCase().includes(search.toLowerCase()) || String(r.id||'').includes(search)) : true;
      const okStatus = status === 'all' ? true : String(r.status||'') === status;
      return okSearch && okStatus;
    });
    list = list.sort((a: any, b: any) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    const start = (page-1)*pageSize;
    const end = start + pageSize;
    return { total: list.length, pageItems: list.slice(start, end) };
  }, [metrics, search, status, sortKey, sortDir, page, pageSize]);

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (query.error) {
    const raw = (query.error as any)?.message ? String((query.error as any).message) : String(query.error);
    const isParam = /Parâmetros obrigatórios|400|invalid/i.test(raw);
    const isAuth = /No Meta access token|401|unauthorized/i.test(raw);
    const isPerm = /permission|forbidden|rls/i.test(raw);
    const message = isParam
      ? 'Parâmetros inválidos para consulta de conjuntos de anúncios. Ajuste período e contas.'
      : isAuth
      ? 'Credenciais do Meta Ads inválidas ou ausentes. Reautentique a conexão.'
      : isPerm
      ? 'Permissões insuficientes para acessar os dados dos conjuntos.'
      : `Falha ao carregar conjuntos de anúncios: ${raw}`;
    return <div className="text-destructive">{message}</div>;
  }

  if (!metrics || metrics.data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum dado de conjunto de anúncios encontrado para o período e filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Buscar por nome ou ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-[240px]" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="PAUSED">PAUSED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Gasto</SelectItem>
            <SelectItem value="impressions">Impressões</SelectItem>
            <SelectItem value="clicks">Cliques</SelectItem>
            <SelectItem value="leads_count">Leads</SelectItem>
            <SelectItem value="ctr">CTR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortDir} onValueChange={(v: any) => setSortDir(v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Direção" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Desc</SelectItem>
            <SelectItem value="asc">Asc</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Por página" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conjunto de Anúncios</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Orçamento Diário</TableHead>
            <TableHead>Orçamento Vitalício</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead className="text-right">Impressões</TableHead>
            <TableHead className="text-right">Cliques</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cliques no Link</TableHead>
            <TableHead className="text-right">Engaj. com a Publicação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processed.pageItems.map((row: any) => (
            <TableRow key={row.id} onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className={expandedId===row.id ? 'bg-muted/40' : ''}>
              <TableCell>
                <span className="font-medium line-clamp-2">{row.name}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.id}</TableCell>
              <TableCell>{row.status || '—'}</TableCell>
              <TableCell>{formatCurrency(row.daily_budget || 0)}</TableCell>
              <TableCell>{formatCurrency(row.lifetime_budget || 0)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.spend)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
              <TableCell className="text-right font-medium">{formatNumber(row.leads_count)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.link_clicks)}</TableCell>
              <TableCell className="text-right">{formatNumber(row.post_engagement)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total: {processed.total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}>Anterior</Button>
          <div className="text-sm">Página {page}</div>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page*pageSize>=processed.total}>Próxima</Button>
        </div>
      </div>
      {expandedId && (
        <div className="rounded-md border p-3">
          <div className="font-semibold mb-2">Anúncios do Conjunto</div>
          {adsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando anúncios...</div>
          ) : (adsQuery.data && adsQuery.data.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {adsQuery.data.map((ad: any) => (
                <div key={ad.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    {ad.thumbnail_url || ad.image_url ? (
                      <img src={ad.thumbnail_url || ad.image_url} alt={ad.name} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                    <div>
                      <div className="text-sm font-medium line-clamp-1">{ad.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{ad.creative_data?.object_story_spec?.link_data?.message || ad.creative_data?.object_story_spec?.video_data?.message || '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nenhum anúncio encontrado para este conjunto.</div>
          )}
        </div>
      )}
    </div>
  );
};
