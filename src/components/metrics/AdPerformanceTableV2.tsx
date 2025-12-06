
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
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  const hasDates = !!dateRange.from && !!dateRange.to;
  const hasAccounts = Array.isArray(adAccountIds) && adAccountIds.length > 0;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("spend");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useGetMetrics({
    ad_account_ids: hasAccounts ? adAccountIds : [],
    campaign_ids: campaignIds,
    ad_set_ids: adSetIds,
    since: hasDates && dateRange.from ? dateRange.from.toISOString().split('T')[0] : '',
    until: hasDates && dateRange.to ? dateRange.to.toISOString().split('T')[0] : '',
    level: 'ad',
  });
  const adMetrics = query.data;
  const processed = useMemo(() => {
    const rows = adMetrics?.data ?? [];
    let list = rows.filter((r: any) => {
      const okSearch = search ? (String(r.name || "").toLowerCase().includes(search.toLowerCase()) || String(r.creative_text||"").toLowerCase().includes(search.toLowerCase())) : true;
      const okStatus = status === "all" ? true : String(r.status||"") === status;
      return okSearch && okStatus;
    });
    list = list.sort((a: any, b: any) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    const start = (page-1)*pageSize;
    const end = start + pageSize;
    return { total: list.length, pageItems: list.slice(start, end) };
  }, [adMetrics, search, status, sortKey, sortDir, page, pageSize]);

  if (!hasDates) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Selecione um período válido para visualizar os anúncios.
      </div>
    );
  }
  if (!hasAccounts) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhuma conta publicitária selecionada. Conecte ou selecione contas para carregar os anúncios.
      </div>
    );
  }

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
      ? 'Parâmetros inválidos para consulta de anúncios. Ajuste período e contas.'
      : isAuth
      ? 'Credenciais do Meta Ads inválidas ou ausentes. Reautentique a conexão.'
      : isPerm
      ? 'Permissões insuficientes para acessar os dados dos anúncios.'
      : `Falha ao carregar anúncios: ${raw}`;
    return <div className="text-destructive">{message}</div>;
  }

  if (!adMetrics || adMetrics.data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum dado de anúncio encontrado para o período e filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Buscar por nome ou texto" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-[240px]" />
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
            <TableHead>Anúncio</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Texto</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead className="text-right">Impressões</TableHead>
            <TableHead className="text-right">Cliques</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cliques no Link</TableHead>
            <TableHead className="text-right">Engaj. com a Publicação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processed.pageItems.map((ad: any) => (
            <TableRow key={ad.id}>
              <TableCell>
                 <span className="font-medium line-clamp-2">{ad.name}</span>
              </TableCell>
              <TableCell>{ad.status || '—'}</TableCell>
              <TableCell>
                {ad.thumbnail_url || ad.image_url ? (
                  <img src={ad.thumbnail_url || ad.image_url} alt={ad.creative_title || ad.name} className="h-10 w-10 object-cover rounded" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted" />
                )}
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground line-clamp-2">{ad.creative_text || '—'}</span>
              </TableCell>
              <TableCell>
                {ad.creative_link_url ? (
                  <a href={ad.creative_link_url} target="_blank" rel="noreferrer" className="text-primary underline">
                    {ad.creative_link_url}
                  </a>
                ) : '—'}
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total: {processed.total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}>Anterior</Button>
          <div className="text-sm">Página {page}</div>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page*pageSize>=processed.total}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
