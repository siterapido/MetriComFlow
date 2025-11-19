import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/formatters'

export function AdSetWeeklyComparisonTable({
  rows,
}: {
  rows: Array<{
    ad_set_id: string
    ad_set_name: string
    current: { spend: number; leads_count: number; cpl: number; ctr: number }
    previous?: { spend: number; leads_count: number; cpl: number; ctr: number }
  }>
}) {
  const pct = (c?: number, p?: number) => (p && p !== 0 ? ((Number(c ?? 0) - Number(p ?? 0)) / p) * 100 : undefined)
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conjunto</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Δ WoW</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const dSpend = pct(r.current.spend, r.previous?.spend)
            const dLeads = pct(r.current.leads_count, r.previous?.leads_count)
            const dCpl = r.previous?.cpl && r.previous.cpl !== 0 ? ((r.current.cpl - r.previous.cpl) / r.previous.cpl) * 100 : undefined
            const dCtr = pct(r.current.ctr, r.previous?.ctr)
            const wow = [dSpend, dLeads, dCpl, dCtr].filter((v) => typeof v === 'number').map(v => (v as number))
            const wowText = wow.length > 0 ? `${wow.map(v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`).join(' / ')}` : '—'
            return (
              <TableRow key={r.ad_set_id}>
                <TableCell className="font-medium">{r.ad_set_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.current.spend)}</TableCell>
                <TableCell className="text-right">{formatNumber(r.current.leads_count)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.current.cpl)}</TableCell>
                <TableCell className="text-right">{Number(r.current.ctr).toFixed(2)}%</TableCell>
                <TableCell className="text-right">{wowText}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}