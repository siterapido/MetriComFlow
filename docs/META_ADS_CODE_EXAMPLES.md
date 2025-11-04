# Meta Ads - Exemplos de Código

## 1. Conectar com Meta Business Manager

```typescript
// Página de configuração
import { useMetaAuth } from '@/hooks/useMetaAuth'

export function MetaAdsConfigPage() {
  const { 
    connectMetaBusiness, 
    connections, 
    loading, 
    connecting 
  } = useMetaAuth()

  const handleConnect = async () => {
    try {
      await connectMetaBusiness()
      // Redireciona para Meta OAuth
    } catch (error) {
      console.error('Erro ao conectar:', error)
      // Mostrar toast de erro
    }
  }

  return (
    <div>
      <h1>Integração Meta Ads</h1>
      
      {connections.length === 0 ? (
        <button onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Conectando...' : 'Conectar Meta Business'}
        </button>
      ) : (
        <div>
          <p>✅ Conectado como: {connections[0].meta_user_name}</p>
          <p>Email: {connections[0].meta_user_email}</p>
        </div>
      )}
    </div>
  )
}
```

## 2. Adicionar Conta Publicitária

```typescript
import { useMetaAuth } from '@/hooks/useMetaAuth'
import { useState } from 'react'

export function AddAdAccountForm() {
  const { addAdAccount, syncCampaigns, loading } = useMetaAuth()
  const [externalId, setExternalId] = useState('')
  const [businessName, setBusinessName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validar ID (deve ser número com 15-16 dígitos)
      if (!/^\d{15,}$/.test(externalId)) {
        throw new Error('ID da conta deve conter apenas números')
      }

      // Adicionar conta
      await addAdAccount({
        external_id: externalId,
        business_name: businessName
      })

      // Sincronizar campanhas
      await syncCampaigns(externalId)

      // Limpar form
      setExternalId('')
      setBusinessName('')
      
      // Toast de sucesso
      console.log('Conta adicionada com sucesso!')
    } catch (error) {
      console.error('Erro ao adicionar conta:', error)
      // Toast de erro
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>ID da Conta Meta (ex: 1558732224693082)</label>
        <input
          type="text"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder="15-16 dígitos"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label>Nome da Conta</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="ex: Minha Agência"
          disabled={loading}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Adicionando...' : 'Adicionar Conta'}
      </button>
    </form>
  )
}
```

## 3. Sincronizar Insights Diários

```typescript
import { useMetaAuth } from '@/hooks/useMetaAuth'
import { useState } from 'react'

export function SyncInsightsForm() {
  const { syncDailyInsights, loading } = useMetaAuth()
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')

  const handleSync = async () => {
    try {
      const result = await syncDailyInsights({
        since,  // '2025-10-01'
        until   // '2025-10-31'
      })

      console.log(`✅ Sincronizados ${result.recordsProcessed} registros`)
      
      // Toast de sucesso
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      // Toast de erro
    }
  }

  const syncLast30Days = async () => {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    setSince(thirtyDaysAgo)
    setUntil(today)

    await handleSync()
  }

  return (
    <div>
      <h2>Sincronizar Insights de Campanhas</h2>
      
      <div>
        <label>De (YYYY-MM-DD)</label>
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label>Até (YYYY-MM-DD)</label>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          disabled={loading}
        />
      </div>

      <button onClick={handleSync} disabled={loading || !since || !until}>
        {loading ? 'Sincronizando...' : 'Sincronizar'}
      </button>

      <button onClick={syncLast30Days} disabled={loading}>
        Últimos 30 dias
      </button>
    </div>
  )
}
```

## 4. Listar Campanhas com Financeiros

```typescript
import { useAdCampaigns } from '@/hooks/useMetaMetrics'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export function CampaignsTable() {
  const { data: org } = useActiveOrganization()
  const { data: campaigns, isLoading } = useAdCampaigns()

  if (isLoading) return <div>Carregando...</div>
  if (!campaigns?.length) return <div>Nenhuma campanha encontrada</div>

  return (
    <table>
      <thead>
        <tr>
          <th>Campanha</th>
          <th>Status</th>
          <th>Objetivo</th>
          <th>Gasto</th>
          <th>Leads</th>
          <th>CPL</th>
          <th>ROAS</th>
          <th>Taxa Conversão</th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map((campaign) => (
          <tr key={campaign.campaign_id}>
            <td>{campaign.campaign_name}</td>
            <td>{campaign.campaign_status}</td>
            <td>{campaign.campaign_objective}</td>
            <td>R$ {campaign.investimento.toFixed(2)}</td>
            <td>{campaign.leads_gerados}</td>
            <td>{campaign.cpl ? `R$ ${campaign.cpl.toFixed(2)}` : '-'}</td>
            <td>{campaign.roas ? campaign.roas.toFixed(2) : '-'}</td>
            <td>{campaign.taxa_conversao.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## 5. Listar Ad Sets com Targeting

```typescript
import { useAdSets } from '@/hooks/useAdSetsAndAds'

interface AdSetRowProps {
  campaignId: string
}

export function AdSetsTable({ campaignId }: AdSetRowProps) {
  const { data: adSets, isLoading } = useAdSets(campaignId)

  if (isLoading) return <div>Carregando ad sets...</div>
  if (!adSets?.length) return <div>Nenhum ad set encontrado</div>

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Status</th>
          <th>Objetivo</th>
          <th>Budget Diário</th>
          <th>Targeting</th>
        </tr>
      </thead>
      <tbody>
        {adSets.map((adSet) => (
          <tr key={adSet.id}>
            <td>{adSet.name}</td>
            <td>{adSet.status}</td>
            <td>{adSet.optimization_goal}</td>
            <td>
              {adSet.daily_budget 
                ? `R$ ${adSet.daily_budget.toFixed(2)}` 
                : 'Sem limite'}
            </td>
            <td>
              {adSet.targeting ? (
                <details>
                  <summary>Ver targeting</summary>
                  <pre>
                    {JSON.stringify(adSet.targeting, null, 2)}
                  </pre>
                </details>
              ) : (
                'N/A'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## 6. Exibir Criativos com Imagens

```typescript
import { useAds } from '@/hooks/useAdSetsAndAds'

interface AdCardProps {
  adSetId: string
}

export function AdCreativesGrid({ adSetId }: AdCardProps) {
  const { data: ads, isLoading } = useAds(adSetId)

  if (isLoading) return <div>Carregando criativos...</div>
  if (!ads?.length) return <div>Nenhum criativo encontrado</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
      {ads.map((ad) => (
        <div 
          key={ad.id} 
          style={{ 
            border: '1px solid #ddd', 
            padding: '10px', 
            borderRadius: '8px' 
          }}
        >
          {ad.creative_type === 'IMAGE' && ad.image_url && (
            <img 
              src={ad.image_url} 
              alt={ad.name} 
              style={{ width: '100%', height: 'auto' }}
            />
          )}

          {ad.creative_type === 'VIDEO' && ad.thumbnail_url && (
            <img 
              src={ad.thumbnail_url} 
              alt={ad.name} 
              style={{ width: '100%', height: 'auto' }}
            />
          )}

          <h4>{ad.name}</h4>
          <p><strong>Tipo:</strong> {ad.creative_type}</p>
          
          {ad.title && <p><strong>Título:</strong> {ad.title}</p>}
          {ad.body && <p><strong>Texto:</strong> {ad.body}</p>}
          {ad.call_to_action && <p><strong>CTA:</strong> {ad.call_to_action}</p>}
          
          <p style={{ fontSize: '12px', color: '#999' }}>
            Status: {ad.status}
          </p>
        </div>
      ))}
    </div>
  )
}
```

## 7. Dashboard de Performance de Criativo

```typescript
import { useAdMetrics } from '@/hooks/useAdSetsAndAds'
import { useState } from 'react'

interface CreativePerformanceProps {
  adId: string
  campaignId: string
}

export function CreativePerformanceDashboard({ 
  adId, 
  campaignId 
}: CreativePerformanceProps) {
  const [dateRange, setDateRange] = useState({
    start: '2025-10-01',
    end: '2025-10-31'
  })

  const { data: metrics, isLoading } = useAdMetrics(adId, dateRange)

  if (isLoading) return <div>Carregando métricas...</div>
  if (!metrics) return <div>Nenhuma métrica disponível</div>

  return (
    <div>
      <h2>Performance do Criativo</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* Gasto */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Gasto Total</p>
          <h3 style={{ margin: '10px 0 0 0' }}>R$ {metrics.spend.toFixed(2)}</h3>
        </div>

        {/* Impressões */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Impressões</p>
          <h3 style={{ margin: '10px 0 0 0' }}>{metrics.impressions.toLocaleString()}</h3>
        </div>

        {/* Cliques */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Cliques</p>
          <h3 style={{ margin: '10px 0 0 0' }}>{metrics.clicks.toLocaleString()}</h3>
        </div>

        {/* Leads */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Leads Gerados</p>
          <h3 style={{ margin: '10px 0 0 0' }}>{metrics.leads_count.toLocaleString()}</h3>
        </div>

        {/* CPM */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>CPM (R$ por mil impressões)</p>
          <h3 style={{ margin: '10px 0 0 0' }}>R$ {metrics.cpm.toFixed(2)}</h3>
        </div>

        {/* CPC */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>CPC (R$ por clique)</p>
          <h3 style={{ margin: '10px 0 0 0' }}>R$ {metrics.cpc.toFixed(2)}</h3>
        </div>

        {/* CPL */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>CPL (R$ por lead)</p>
          <h3 style={{ margin: '10px 0 0 0' }}>R$ {metrics.cpl.toFixed(2)}</h3>
        </div>

        {/* Quality Ranking */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Meta Quality Ranking</p>
          <h3 style={{ margin: '10px 0 0 0', color: getQualityColor(metrics.quality_ranking) }}>
            {metrics.quality_ranking || 'N/A'}
          </h3>
        </div>

        {/* Engagement Ranking */}
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <p style={{ color: '#999', margin: 0 }}>Engagement Ranking</p>
          <h3 style={{ margin: '10px 0 0 0', color: getEngagementColor(metrics.engagement_ranking) }}>
            {metrics.engagement_ranking || 'N/A'}
          </h3>
        </div>
      </div>

      {/* Meta Rankings Explanation */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h4>Meta Quality Rankings</h4>
        <ul>
          <li><strong>ABOVE_AVERAGE:</strong> Criativo está com desempenho acima da média</li>
          <li><strong>AVERAGE:</strong> Criativo está com desempenho na média</li>
          <li><strong>BELOW_AVERAGE:</strong> Criativo está com desempenho abaixo da média (considere testar novo criativo)</li>
        </ul>
      </div>
    </div>
  )
}

function getQualityColor(ranking: string | undefined): string {
  switch (ranking) {
    case 'ABOVE_AVERAGE':
      return '#22c55e' // green
    case 'AVERAGE':
      return '#f59e0b' // yellow
    case 'BELOW_AVERAGE':
      return '#ef4444' // red
    default:
      return '#666'
  }
}

function getEngagementColor(ranking: string | undefined): string {
  return getQualityColor(ranking)
}
```

## 8. Query Direta ao Banco de Dados

```typescript
import { supabase } from '@/lib/supabase'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export async function getCreativePerformance() {
  const { data: org } = useActiveOrganization()

  // Buscar top 10 criativos por spend
  const { data, error } = await supabase
    .from('ad_daily_insights')
    .select(`
      id,
      ad_id,
      date,
      spend,
      impressions,
      clicks,
      leads_count,
      quality_ranking,
      engagement_ranking,
      conversion_ranking,
      ads(
        name,
        creative_type,
        title,
        image_url,
        video_url
      )
    `)
    .eq('campaign_id', org?.id) // Filtra por organização
    .gte('date', '2025-10-01')
    .lte('date', '2025-10-31')
    .order('spend', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Erro ao buscar performance:', error)
    return []
  }

  // Agregar por criativo (somar métricas)
  const aggregated = Object.values(
    (data || []).reduce((acc: Record<string, any>, row: any) => {
      const adId = row.ad_id
      if (!acc[adId]) {
        acc[adId] = {
          ad_id: adId,
          ad_name: row.ads?.name,
          creative_type: row.ads?.creative_type,
          spend: 0,
          impressions: 0,
          clicks: 0,
          leads_count: 0,
          quality_ranking: row.quality_ranking
        }
      }
      acc[adId].spend += row.spend
      acc[adId].impressions += row.impressions
      acc[adId].clicks += row.clicks
      acc[adId].leads_count += row.leads_count
      return acc
    }, {})
  )

  // Calcular CPL para cada criativo
  return aggregated.map((ad: any) => ({
    ...ad,
    cpl: ad.leads_count > 0 ? ad.spend / ad.leads_count : 0,
    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions * 100) : 0
  }))
}
```

## 9. Integração com Dashboard

```typescript
import { useQuery } from '@tanstack/react-query'
import { useActiveOrganization } from '@/hooks/useActiveOrganization'

export function MetaAdsDashboard() {
  const { data: org } = useActiveOrganization()

  // KPI consolidado
  const { data: kpis } = useQuery({
    queryKey: ['meta-kpis', org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_kpis')
        .select('*')
        .single()
      return data
    },
    enabled: !!org?.id
  })

  // Financeiros por campanha
  const { data: campaigns } = useQuery({
    queryKey: ['campaign-financials', org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaign_financials')
        .select('*')
        .eq('organization_id', org?.id)
      return data
    },
    enabled: !!org?.id
  })

  return (
    <div>
      <h1>Dashboard Meta Ads</h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <KpiCard 
          title="Investimento" 
          value={`R$ ${kpis?.investimento_total.toFixed(2)}`}
        />
        <KpiCard 
          title="Leads Gerados" 
          value={kpis?.leads_gerados}
        />
        <KpiCard 
          title="CPL" 
          value={`R$ ${kpis?.cpl?.toFixed(2)}`}
        />
        <KpiCard 
          title="ROAS" 
          value={kpis?.roas?.toFixed(2)}
        />
      </div>

      {/* Tabela de Campanhas */}
      <CampaignsTable />
    </div>
  )
}

function KpiCard({ title, value }: { title: string; value: any }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <p style={{ color: '#999', margin: '0 0 10px 0' }}>{title}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  )
}
```

---

## Boas Práticas

1. **Sempre filtrar por organization_id** para manter isolamento de dados
2. **Usar useActive Organization** para pegar a organização atual
3. **Implementar error handling** com try/catch
4. **Mostrar loading states** durante sincronização
5. **Usar toast notifications** para feedback do usuário
6. **Limitar sincronizações** para evitar rate limits do Meta
7. **Cachear dados** com TanStack Query
8. **Validar external_id** (deve ser número com 15+ dígitos)
