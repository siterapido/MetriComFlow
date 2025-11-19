import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'

export function AdSetWeeklyTrendChart({
  data,
}: {
  data: Array<{ week: string; spend: number; leads_count: number; ctr: number }>
}) {
  const chartData = data.map(d => ({ week: d.week, Investimento: d.spend, Leads: d.leads_count, CTR: Number(d.ctr.toFixed(2)) }))
  return (
    <div className="rounded-md border p-3">
      <div className="font-semibold mb-2">Tendência Semanal (4 semanas)</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="week" stroke="#94a3b8" />
          <YAxis yAxisId="left" stroke="#94a3b8" />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
          <Tooltip />
          <Legend />
          <Line type="monotone" yAxisId="left" dataKey="Investimento" stroke="#f97316" dot={false} />
          <Line type="monotone" yAxisId="left" dataKey="Leads" stroke="#3b82f6" dot={false} />
          <Line type="monotone" yAxisId="right" dataKey="CTR" stroke="#22d3ee" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}