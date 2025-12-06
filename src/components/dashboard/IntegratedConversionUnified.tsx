import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from "recharts"
import type { UnifiedMetrics } from "@/hooks/useUnifiedMetrics"
import { Trophy, Users, Settings } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import { useMemo, useState, useEffect } from "react"
// Removido ToggleGroup em favor de configurações unificadas no menu Dropdown
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface IntegratedConversionUnifiedProps {
  metrics: UnifiedMetrics | undefined
  isLoading: boolean
}

// Configuração personalizável do funil
type FunnelConfig = {
  template: "meta_crm_full" | "crm_only" | "meta_only" | "custom"
  funnelType: "full" | "engagement" | "conversion" | "qualification" | "sales"
  showMetaStages: boolean
  hideZeroStages: boolean
  minStageValue: number
  leadUnifyStrategy: "preferCRM" | "preferMeta"
  includeStages: {
    impressions: boolean
    clicks: boolean
    leads_unified: boolean
    qualified: boolean
    proposals: boolean
    negotiations: boolean
    closed_won: boolean
  }
}

type Stage = { id: string; name: string; raw: number }
const has = (v: any) => v !== null && v !== undefined

function computeUnifiedLeads(m: UnifiedMetrics, strategy: FunnelConfig["leadUnifyStrategy"]): number {
  const crm = Number(m.crm_total_leads ?? 0)
  const meta = Number(m.meta_leads ?? 0)
  const crmHas = crm > 0
  const metaHas = meta > 0
  switch (strategy) {
    case "preferCRM":
      // Fallback simétrico: se CRM não tiver (>0), usa Meta; e vice-versa
      return crmHas ? crm : (metaHas ? meta : 0)
    case "preferMeta":
      // Fallback simétrico: se Meta não tiver (>0), usa CRM; e vice-versa
      return metaHas ? meta : (crmHas ? crm : 0)
    default:
      // Comportamento automático: usa fonte disponível, privilegiando CRM
      return crmHas ? crm : (metaHas ? meta : 0)
  }
}

function passStageFilters(value: number, cfg: FunnelConfig): boolean {
  if (cfg.hideZeroStages && value === 0) return false
  if (cfg.minStageValue > 0 && value < cfg.minStageValue) return false
  return true
}

function buildFunnelHierarchy(m: UnifiedMetrics, cfg: FunnelConfig): Stage[] {
  const stages: Stage[] = []

  // Meta Ads
  if (cfg.showMetaStages) {
    if (cfg.includeStages.impressions && has(m.meta_impressions)) {
      const v = m.meta_impressions as number
      if (passStageFilters(v, cfg)) stages.push({ id: "impressions", name: "Impressões", raw: v })
    }
    if (cfg.includeStages.clicks && has(m.meta_clicks)) {
      const v = m.meta_clicks as number
      if (passStageFilters(v, cfg)) stages.push({ id: "clicks", name: "Cliques", raw: v })
    }
  }

  // Leads (com fallback de fonte)
  if (cfg.includeStages.leads_unified && (has(m.crm_total_leads) || has(m.meta_leads))) {
    const unifiedVal = computeUnifiedLeads(m, cfg.leadUnifyStrategy)
    if (passStageFilters(unifiedVal, cfg)) stages.push({ id: "leads_unified", name: "Leads", raw: unifiedVal })
  }

  // CRM
  if (cfg.includeStages.qualified && has(m.crm_qualificados)) {
    const v = m.crm_qualificados as number
    if (passStageFilters(v, cfg)) stages.push({ id: "qualified", name: "Qualificados", raw: v })
  }
  if (cfg.includeStages.proposals && has(m.crm_propostas)) {
    const v = m.crm_propostas as number
    if (passStageFilters(v, cfg)) stages.push({ id: "proposals", name: "Propostas", raw: v })
  }
  if (cfg.includeStages.negotiations && has(m.crm_negociacoes)) {
    const v = m.crm_negociacoes as number
    if (passStageFilters(v, cfg)) stages.push({ id: "negotiations", name: "Negociações", raw: v })
  }
  if (cfg.includeStages.closed_won && has(m.crm_fechados_ganho)) {
    const v = m.crm_fechados_ganho as number
    if (passStageFilters(v, cfg)) stages.push({ id: "closed_won", name: "Fechados (Ganho)", raw: v })
  }

  return stages
}

/**
 * IntegratedConversionUnified
 * Combina a visão simplificada (KPI principal Lead → Fechamento) com
 * o funil completo Meta → CRM → Receita em um único card.
 */
export function IntegratedConversionUnified({ metrics, isLoading }: IntegratedConversionUnifiedProps) {
  const [displayMode, setDisplayMode] = useState<"linear" | "sqrt">("sqrt")
  const [config, setConfig] = useState<FunnelConfig>({
    template: "meta_crm_full",
    funnelType: "full",
    showMetaStages: true,
    hideZeroStages: false,
    minStageValue: 0,
    leadUnifyStrategy: "preferCRM",
    includeStages: {
      impressions: true,
      clicks: true,
      leads_unified: true,
      qualified: true,
      proposals: true,
      negotiations: true,
      closed_won: true,
    },
  })
  // Persistência da preferência de origem dos leads (CRM ↔ Meta)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mf_lead_strategy")
      if (saved === "preferCRM" || saved === "preferMeta") {
        setConfig((c) => ({ ...c, leadUnifyStrategy: saved as any }))
      }
    } catch (error) {
      console.warn("Não foi possível carregar a estratégia de leads salva", error)
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem("mf_lead_strategy", config.leadUnifyStrategy)
    } catch (error) {
      console.warn("Não foi possível salvar a estratégia de leads", error)
    }
  }, [config.leadUnifyStrategy])
  // Hooks precisam ser chamados de forma incondicional em todas as renderizações.
  // Portanto, calculamos os dados do funil com guardas internos e só então decidimos o que renderizar.
  const rawFunnelData = useMemo(() => {
    if (!metrics || !metrics.has_data) return [] as Stage[]
    return buildFunnelHierarchy(metrics, config)
  }, [metrics, config])

  const funnelData = useMemo(() => {
    return rawFunnelData.map((d) => ({
      name: d.name,
      value: displayMode === 'sqrt' ? Math.sqrt(d.raw) : d.raw,
      raw: d.raw,
    }))
  }, [rawFunnelData, displayMode])

  // Valores derivados com tratamento para métricas ausentes
  const totalLeads = metrics?.crm_total_leads ?? 0
  const totalFechamentos = metrics?.crm_fechados_ganho ?? 0
  const receita = metrics?.crm_revenue ?? 0
  const unifiedLeads = metrics ? computeUnifiedLeads(metrics, config.leadUnifyStrategy) : 0
  const closeRate = unifiedLeads > 0 ? (totalFechamentos / unifiedLeads) * 100 : 0
  const crmLeads = Number(metrics?.crm_total_leads ?? 0)
  const metaLeads = Number(metrics?.meta_leads ?? 0)
  const integrationRate = metaLeads > 0 ? (crmLeads / metaLeads) * 100 : null
  let leadSource: 'CRM' | 'Meta' | null = null
  if (config.leadUnifyStrategy === 'preferCRM') {
    leadSource = crmLeads > 0 ? 'CRM' : (metaLeads > 0 ? 'Meta' : null)
  } else {
    // preferMeta
    leadSource = metaLeads > 0 ? 'Meta' : (crmLeads > 0 ? 'CRM' : null)
  }

  const impressions = Number(metrics?.meta_impressions ?? 0)
  const clicks = Number(metrics?.meta_clicks ?? 0)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const clickToLead = clicks > 0 ? (metaLeads / clicks) * 100 : 0

  // Renderizações condicionais depois que todos os hooks foram chamados
  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
          <CardDescription className="text-muted-foreground">Meta Ads → CRM → Fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const noData = !metrics || !metrics.has_data || funnelData.length === 0
  if (noData) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
          <CardDescription className="text-muted-foreground">Meta Ads → CRM → Fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Sem dados disponíveis para o período selecionado.</div>
        </CardContent>
      </Card>
    )
  }

  // (Removido bloco duplicado de cálculo — já foi calculado mais acima com guardas)

  // Dados do funil completo (brutos) e escala visual — já calculados acima de forma segura

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-foreground">Funil de Conversão Integrado</CardTitle>
            <CardDescription className="text-muted-foreground">Meta Ads → CRM → Fechamento</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Menu compacto de configuração */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Configurar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[300px]">
                {/* Grupo: Visualização */}
                <DropdownMenuLabel>Visualização</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={config.funnelType} onValueChange={(v) => {
                  if (!v) return
                  setConfig((c) => {
                    const funnelType = v as any
                    let includeStages = {
                      impressions: false,
                      clicks: false,
                      leads_unified: false,
                      qualified: false,
                      proposals: false,
                      negotiations: false,
                      closed_won: false,
                    }
                    if (funnelType === 'engagement') {
                      includeStages = { impressions: true, clicks: true, leads_unified: false, qualified: false, proposals: false, negotiations: false, closed_won: false }
                    } else if (funnelType === 'conversion') {
                      includeStages = { impressions: false, clicks: true, leads_unified: true, qualified: false, proposals: false, negotiations: false, closed_won: true }
                    } else if (funnelType === 'qualification') {
                      includeStages = { impressions: false, clicks: false, leads_unified: true, qualified: true, proposals: true, negotiations: false, closed_won: false }
                    } else if (funnelType === 'sales') {
                      includeStages = { impressions: false, clicks: false, leads_unified: false, qualified: false, proposals: true, negotiations: true, closed_won: true }
                    } else {
                      includeStages = { impressions: true, clicks: true, leads_unified: true, qualified: true, proposals: true, negotiations: true, closed_won: true }
                    }
                    if (c.template === 'crm_only') {
                      includeStages.impressions = false
                      includeStages.clicks = false
                    }
                    if (c.template === 'meta_only') {
                      includeStages.qualified = false
                      includeStages.proposals = false
                      includeStages.negotiations = false
                      includeStages.closed_won = false
                    }
                    const showMetaStages = includeStages.impressions || includeStages.clicks ? true : c.showMetaStages
                    return { ...c, funnelType, includeStages, showMetaStages }
                  })
                }}>
                  <DropdownMenuRadioItem value="engagement">Engajamento</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="conversion">Conversão</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="qualification">Qualificação</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="sales">Vendas</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="full">Completo</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Escala</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={displayMode} onValueChange={(v) => v && setDisplayMode(v as any)}>
                  <DropdownMenuRadioItem value="linear">Linear</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="sqrt">Raiz</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                {/* Grupo: Origem & estágios */}
                <DropdownMenuLabel>Origem & estágios</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={config.template} onValueChange={(v) => {
                if (!v) return
                setConfig((c) => {
                  const template = v as any
                  let includeStages = c.includeStages
                  let showMetaStages = c.showMetaStages
                  if (template === 'meta_crm_full') {
                    includeStages = { impressions: true, clicks: true, leads_unified: true, qualified: true, proposals: true, negotiations: true, closed_won: true }
                    showMetaStages = true
                  } else if (template === 'crm_only') {
                    includeStages = { impressions: false, clicks: false, leads_unified: true, qualified: true, proposals: true, negotiations: true, closed_won: true }
                    showMetaStages = false
                  } else if (template === 'meta_only') {
                    includeStages = { impressions: true, clicks: true, leads_unified: true, qualified: false, proposals: false, negotiations: false, closed_won: false }
                    showMetaStages = true
                  } else if (template === 'custom') {
                    // mantém seleção atual
                  }
                  return { ...c, template, includeStages, showMetaStages }
                })
              }}>
                <DropdownMenuRadioItem value="meta_only">Meta</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="crm_only">CRM</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="meta_crm_full">Meta+CRM</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="custom">Personalizar</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center justify-between gap-4">
                Mostrar Impressões/Cliques
                <Switch checked={config.showMetaStages} onCheckedChange={(v) => setConfig((c) => ({ ...c, showMetaStages: v }))} />
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center justify-between gap-4">
                Ocultar etapas com zero
                <Switch checked={config.hideZeroStages} onCheckedChange={(v) => setConfig((c) => ({ ...c, hideZeroStages: v }))} />
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Valor mínimo por etapa</span>
                  <input
                    type="number"
                    min={0}
                    value={config.minStageValue}
                    onChange={(e) => setConfig((c) => ({ ...c, minStageValue: Number(e.target.value) }))}
                    className="mt-1 w-24 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                </div>
              </DropdownMenuItem>
              {config.template === 'custom' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Etapas (Custom)</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-2 px-2 py-1">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.impressions} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, impressions: e.target.checked } }))} />
                      Impressões
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.clicks} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, clicks: e.target.checked } }))} />
                      Cliques
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.leads_unified} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, leads_unified: e.target.checked } }))} />
                      Leads
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.qualified} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, qualified: e.target.checked } }))} />
                      Qualificados
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.proposals} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, proposals: e.target.checked } }))} />
                      Propostas
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.negotiations} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, negotiations: e.target.checked } }))} />
                      Negociações
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={config.includeStages.closed_won} onChange={(e) => setConfig((c) => ({ ...c, includeStages: { ...c.includeStages, closed_won: e.target.checked } }))} />
                      Fechados (Ganho)
                    </label>
                  </div>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                // Resetar para padrão simples
                setDisplayMode('sqrt')
                setConfig({
                  template: 'meta_crm_full',
                  funnelType: 'full',
                  showMetaStages: true,
                  hideZeroStages: false,
                  minStageValue: 0,
                  leadUnifyStrategy: 'preferCRM',
                  includeStages: {
                    impressions: true,
                    clicks: true,
                    leads_unified: true,
                    qualified: true,
                    proposals: true,
                    negotiations: true,
                    closed_won: true,
                  }
                })
              }}>
                Resetar para padrão
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Controles extras foram movidos para o menu compacto para simplificar o cabeçalho */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Taxa de Fechamento de Leads</div>
              <div className="text-3xl font-bold text-success">{closeRate.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Indicadores principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Leads</div>
              <div className="text-xl font-semibold text-foreground">{unifiedLeads}</div>
              <div className="text-xs text-muted-foreground">Origem dos Leads: {leadSource ?? '—'} {integrationRate !== null ? `• Integração: ${integrationRate.toFixed(0)}%` : ''}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fechamentos</div>
                <div className="text-xl font-semibold text-foreground">{totalFechamentos}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 p-4">
            <div>
              <div className="text-sm text-muted-foreground">Receita dos fechamentos</div>
              <div className="text-xl font-semibold text-foreground">{formatCurrency(receita)}</div>
            </div>
          </div>
        </div>

        {/* Funil completo */}
        <div className="mt-8">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                {/* Gradiente azul com transparência para todas as etapas */}
                <defs>
                  <linearGradient id="funnelBlueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(val: any, name: any, props: any) => {
                  const raw = props?.payload?.raw
                  const stageName = props?.payload?.name
                  if (stageName === 'Leads') {
                    const crmText = metrics?.crm_total_leads != null ? Number(metrics?.crm_total_leads).toLocaleString('pt-BR') : 'N/A'
                    const metaText = metrics?.meta_leads != null ? Number(metrics?.meta_leads).toLocaleString('pt-BR') : 'N/A'
                    const integ = integrationRate !== null ? ` • Integração: ${integrationRate.toFixed(0)}%` : ''
                    return [`CRM: ${crmText} • Meta: ${metaText}${integ}`, stageName]
                  }
                  return [raw?.toLocaleString('pt-BR'), stageName]
                }} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive fill="url(#funnelBlueGradient)">
                  <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                  <LabelList position="left" fill="#fff" stroke="none" dataKey="raw" formatter={(v: any) => v?.toLocaleString('pt-BR')} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estatísticas resumidas e simples */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">CTR</div>
              <div className="text-xl font-bold text-foreground">{ctr.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Clique → Lead</div>
              <div className="text-xl font-bold text-foreground">{clickToLead.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Lead → Fechamento</div>
              <div className="text-xl font-bold text-success">{closeRate.toFixed(2)}%</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {totalFechamentos} fechamentos de {unifiedLeads} leads. {metrics?.meta_leads != null ? `Meta reportou ${Number(metrics?.meta_leads).toLocaleString('pt-BR')} leads.` : ''}
            {" "}
            {integrationRate !== null ? `Taxa de integração: ${integrationRate.toFixed(0)}%. ` : ''}
            {displayMode === 'sqrt' ? "Largura das barras proporcional à raiz da contagem (valores reais nos rótulos)." : "Largura das barras proporcional à contagem real."}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
