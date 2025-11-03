# 🗺️ Roadmap: Integração Meta Ads ↔ CRM

## 📊 Status Atual da Integração

### ✅ O Que JÁ ESTÁ INTEGRADO (Implementado)

#### 1. **OAuth & Conexão de Contas** ✅
- [x] Autenticação via Meta Business OAuth
- [x] Gerenciamento de múltiplos ad accounts
- [x] Conexão/desconexão de contas
- [x] Listagem de contas disponíveis
- [x] Renovação automática de tokens

**Arquivos**:
- `useMetaAuth.ts` - Hook principal
- `meta-auth/index.ts` - Edge Function OAuth
- `MetaAdsConfig.tsx` - UI de gerenciamento

---

#### 2. **Sincronização de Dados de Campanhas** ✅
- [x] Fetch de campanhas ativas do Meta Ads
- [x] Armazenamento em `ad_campaigns` table
- [x] Sincronização de métricas diárias (spend, impressions, clicks, leads)
- [x] Histórico de insights em `campaign_daily_insights`
- [x] Atualização manual via botão "Sync"

**Arquivos**:
- `sync-daily-insights/index.ts` - Edge Function
- `connect-ad-account/index.ts` - Edge Function
- `useMetaMetrics.ts` - Hooks de consulta

**Métricas Capturadas**:
- ✅ Spend (investimento)
- ✅ Impressions (impressões)
- ✅ Clicks (cliques)
- ✅ Leads count (do Meta, não do CRM)
- ✅ CTR, CPM, CPC (calculados)

---

#### 3. **Webhook de Lead Ads** ✅
- [x] Recebimento de leads via webhook do Meta
- [x] Validação e processamento automático
- [x] Criação automática de lead no CRM
- [x] Lead scoring automático
- [x] Atribuição de prioridade

**Arquivos**:
- `webhook-lead-ads/index.ts` - Edge Function
- Tabela: `leads` com `source = 'meta_ads'`

**Fluxo**:
```
Meta Lead Ad → Webhook → Edge Function → Criar Lead no CRM
```

---

#### 4. **Conversions API (CAPI)** ✅ **(NOVO - Implementado agora)**
- [x] Envio de eventos de conversão para Meta
- [x] Trigger automático em mudanças de status
- [x] Hash SHA-256 de PII (email, telefone, nome)
- [x] Eventos: Lead (qualificado) e Purchase (fechado_ganho)
- [x] Retry logic para falhas

**Arquivos**:
- `meta-conversion-dispatch/index.ts` - Edge Function
- `20251202180000_meta_conversions_api.sql` - Migration
- Tabela: `meta_conversion_events`

**Eventos Enviados**:
- ✅ `Lead` - Quando lead é qualificado
- ✅ `Purchase` - Quando lead fecha negócio

---

#### 5. **UTM Tracking & Attribution** ✅ **(NOVO - Implementado agora)**
- [x] Captura de parâmetros UTM da URL
- [x] Armazenamento em `leads` table
- [x] Facebook Click ID (fbclid) tracking
- [x] Atribuição de campanha automática

**Arquivos**:
- `20251202181500_utm_tracking.sql` - Migration
- `tracking.ts` - Captura de dados
- `submit-lead-form/index.ts` - Salvamento

**Dados Capturados**:
- ✅ utm_source (ex: facebook)
- ✅ utm_campaign (ex: verao2025)
- ✅ utm_medium (ex: cpc)
- ✅ utm_term (palavra-chave)
- ✅ utm_content (criativo)
- ✅ fbclid (Meta Click ID)

---

#### 6. **UI de Atribuição Visual** ✅ **(NOVO - Implementado agora)**
- [x] Badges em cards de leads mostrando origem
- [x] Nome da campanha visível
- [x] Filtro por campanha na página Leads
- [x] Join automático com ad_campaigns

**Arquivos**:
- `LeadCard.tsx` - Badges visuais
- `Leads.tsx` - Filtro por campanha
- `useLeads.ts` - Query com join

---

#### 7. **Dashboard de Métricas Meta Ads** ✅
- [x] KPI Cards (spend, leads, conversions, ROI)
- [x] Gráficos de performance (linha, barra, pizza)
- [x] Funis de conversão
- [x] Análise de ROI por campanha
- [x] Evolução temporal de métricas
- [x] Distribuição de audiência
- [x] Custo vs Qualidade

**Arquivos**:
- `MetaAdsConfig.tsx` - Página principal
- `MetaAdsKPICards.tsx` - Cards de KPI
- `FunnelsSection.tsx` - Funis
- `ROIAnalysisChart.tsx` - Análise ROI
- 10+ componentes de gráficos

---

#### 8. **Lead Forms Nativos** ✅
- [x] Criação de formulários customizados
- [x] Múltiplas variantes por campanha
- [x] Tracking de submissões
- [x] Integração com Meta Ad ID/Adset ID
- [x] Automação de follow-up

**Arquivos**:
- `LeadForms.tsx` - Gerenciamento
- `PublicLeadForm.tsx` - Formulário público
- Tabelas: `lead_forms`, `lead_form_variants`, `lead_form_submissions`

---

## ❌ O Que AINDA FALTA (Gaps Identificados)

### 🔴 CRÍTICO - Alta Prioridade

#### 1. **Automação de Sincronização de Métricas** ❌
**Status**: Manual (usuário precisa clicar "Sync")

**Gap**: Não existe cron job automático para buscar métricas diárias do Meta.

**Impacto**:
- Dados ficam desatualizados se usuário não sincronizar manualmente
- Métricas atrasadas afetam decisões de otimização
- Dashboard pode mostrar dados antigos

**Solução Necessária**:
```typescript
// Opção 1: pg_cron no Supabase
SELECT cron.schedule(
  'sync-meta-insights-daily',
  '0 3 * * *',  -- 3 AM todos os dias
  $$
  SELECT net.http_post(
    url := 'https://PROJECT.supabase.co/functions/v1/sync-daily-insights',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  );
  $$
);

// Opção 2: Vercel Cron Job
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-meta-insights",
    "schedule": "0 3 * * *"
  }]
}
```

**Prioridade**: 🔴 CRÍTICA
**Esforço**: 2-4 horas
**Benefício**: Dados sempre atualizados sem intervenção manual

---

#### 2. **Automação de Dispatch de Conversions API** ❌
**Status**: Edge Function existe mas não é invocada automaticamente

**Gap**: `meta-conversion-dispatch` precisa ser chamada manualmente ou via cron.

**Impacto**:
- Eventos de conversão ficam com status "pending" indefinidamente
- Meta não recebe feedback de conversões
- Campanhas não otimizam

**Solução Necessária**:
```sql
-- Opção 1: Trigger direto (não recomendado - pode causar lentidão)
-- Opção 2: pg_cron job a cada 5 minutos
SELECT cron.schedule(
  'dispatch-meta-conversions',
  '*/5 * * * *',  -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://PROJECT.supabase.co/functions/v1/meta-conversion-dispatch',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"process_all": true}'::jsonb
  );
  $$
);
```

**Prioridade**: 🔴 CRÍTICA
**Esforço**: 1-2 horas
**Benefício**: Conversões enviadas para Meta em tempo real (5 min delay)

---

#### 3. **Sincronização Bidirecional de Leads** ❌
**Status**: CRM → Meta existe (CAPI), mas Meta → CRM é parcial

**Gap**: Leads que chegam via Webhook são salvos, mas leads que chegam via formulários do Meta (fora do webhook) não são sincronizados.

**Impacto**:
- Alguns leads do Meta podem não aparecer no CRM
- Dados duplicados se lead chegar via webhook E formulário nativo

**Solução Necessária**:
```typescript
// Novo endpoint: fetch-meta-leads
// Busca leads diretamente da API do Meta e sincroniza com CRM
async function fetchMetaLeads(adAccountId: string, since: Date) {
  const url = `https://graph.facebook.com/v21.0/${adAccountId}/leads`;
  const params = {
    access_token: metaAccessToken,
    since: since.toISOString(),
    fields: 'id,created_time,ad_id,ad_name,form_id,field_data',
  };

  // Fetch leads
  const leads = await fetchFromMeta(url, params);

  // Para cada lead, verificar se já existe no CRM
  for (const lead of leads) {
    const exists = await checkLeadExists(lead.id);
    if (!exists) {
      await createLeadInCRM(lead);
    }
  }
}
```

**Prioridade**: 🔴 ALTA
**Esforço**: 4-6 horas
**Benefício**: Garante que TODOS os leads do Meta estejam no CRM

---

### 🟡 IMPORTANTE - Média Prioridade

#### 4. **Sincronização de Adsets & Ads (Criativos)** ❌
**Status**: Só campanhas são sincronizadas

**Gap**: Tabelas `ad_adsets` e `ad_creatives` existem mas não são populadas.

**Impacto**:
- Não consegue analisar performance por adset
- Não consegue analisar performance por criativo
- Dashboard não mostra "qual imagem/vídeo converteu mais"

**Dados Faltantes**:
- Adsets (conjuntos de anúncios)
- Ads (anúncios individuais)
- Criativos (imagens, vídeos, textos)
- Insights por adset/ad

**Solução Necessária**:
```typescript
// Modificar connect-ad-account para buscar hierarquia completa:
// Account → Campaigns → Adsets → Ads → Creatives

async function syncAdAccount(accountId: string) {
  // 1. Buscar campanhas (JÁ EXISTE)
  const campaigns = await fetchCampaigns(accountId);

  // 2. Para cada campanha, buscar adsets (NOVO)
  for (const campaign of campaigns) {
    const adsets = await fetchAdsets(campaign.id);
    await saveAdsets(adsets);

    // 3. Para cada adset, buscar ads (NOVO)
    for (const adset of adsets) {
      const ads = await fetchAds(adset.id);
      await saveAds(ads);

      // 4. Para cada ad, buscar creative (NOVO)
      for (const ad of ads) {
        const creative = await fetchCreative(ad.creative_id);
        await saveCreative(creative);
      }
    }
  }
}
```

**Prioridade**: 🟡 MÉDIA
**Esforço**: 6-8 horas
**Benefício**: Análise granular de performance por criativo

---

#### 5. **Dashboard Unificado CRM + Meta Ads** ❌
**Status**: Dashboards separados (Dashboard.tsx vs MetaAdsConfig.tsx)

**Gap**: Não existe visualização unificada de ROI real (investimento Meta + receita CRM).

**Impacto**:
- Usuário precisa alternar entre páginas
- Difícil calcular ROI real (investimento vs receita fechada)
- Métricas isoladas não mostram funil completo

**Solução Necessária**:
```typescript
// Nova página: UnifiedDashboard.tsx
// ou modificar Dashboard.tsx para incluir métricas Meta

interface UnifiedMetrics {
  // Meta Ads
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  meta_leads: number;

  // CRM
  crm_leads: number;
  qualified_leads: number;
  deals_won: number;
  revenue: number;

  // Calculados
  real_cpl: number; // total_spend / crm_leads
  real_roas: number; // revenue / total_spend
  conversion_rate: number; // deals_won / crm_leads
  avg_deal_size: number; // revenue / deals_won
}
```

**Prioridade**: 🟡 MÉDIA-ALTA
**Esforço**: 8-12 horas
**Benefício**: Visão completa do funil, ROI real, decisões baseadas em dados

---

#### 6. **Gestão de Budget & Alertas** ❌
**Status**: Não existe

**Gap**: Sistema não avisa quando:
- Budget está acabando
- CPL está muito alto
- Campanha não está performando
- ROAS está abaixo do esperado

**Solução Necessária**:
```typescript
// Tabela: budget_rules
CREATE TABLE budget_rules (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  campaign_id UUID REFERENCES ad_campaigns(id),

  -- Budget limits
  daily_budget_limit DECIMAL(10,2),
  monthly_budget_limit DECIMAL(10,2),

  -- Performance thresholds
  max_cpl DECIMAL(10,2), -- alerta se CPL > max_cpl
  min_roas DECIMAL(10,2), -- alerta se ROAS < min_roas
  min_conversion_rate DECIMAL(5,2), -- alerta se taxa < min

  -- Alertas
  alert_email VARCHAR(255),
  alert_slack_webhook TEXT,
  pause_campaign_on_limit BOOLEAN DEFAULT false
);

// Edge Function: check-budget-alerts (rodar a cada hora)
async function checkBudgetAlerts() {
  const rules = await fetchBudgetRules();

  for (const rule of rules) {
    const metrics = await getCampaignMetrics(rule.campaign_id);

    if (metrics.cpl > rule.max_cpl) {
      await sendAlert({
        type: 'high_cpl',
        campaign: rule.campaign_id,
        current: metrics.cpl,
        threshold: rule.max_cpl,
      });
    }

    if (metrics.daily_spend >= rule.daily_budget_limit * 0.9) {
      await sendAlert({
        type: 'budget_90_percent',
        campaign: rule.campaign_id,
        spent: metrics.daily_spend,
        limit: rule.daily_budget_limit,
      });
    }

    if (rule.pause_campaign_on_limit && metrics.daily_spend >= rule.daily_budget_limit) {
      await pauseCampaignInMeta(rule.campaign_id);
    }
  }
}
```

**Prioridade**: 🟡 MÉDIA
**Esforço**: 10-15 horas
**Benefício**: Controle de budget, prevenção de gastos excessivos, alertas proativos

---

### 🟢 NICE TO HAVE - Baixa Prioridade

#### 7. **A/B Testing Integrado** ❌
**Status**: Não existe

**Gap**: Não há sistema para criar e comparar variações de campanhas/criativos.

**Solução Futura**:
- Interface para criar testes A/B
- Tracking de performance por variação
- Cálculo de significância estatística
- Declaração de vencedor automático

**Prioridade**: 🟢 BAIXA
**Esforço**: 20+ horas
**Benefício**: Otimização científica de campanhas

---

#### 8. **Lookalike Audiences Automáticas** ❌
**Status**: Não existe

**Gap**: Sistema não cria automaticamente audiências lookalike baseadas em clientes que converteram.

**Solução Futura**:
```typescript
// Quando X leads convertem:
// 1. Extrair características comuns (idade, localização, interesses)
// 2. Criar Custom Audience no Meta
// 3. Criar Lookalike Audience (1%, 5%, 10%)
// 4. Sugerir criação de nova campanha com essa audiência
```

**Prioridade**: 🟢 BAIXA
**Esforço**: 15-20 horas
**Benefício**: Scaling automático de campanhas vencedoras

---

#### 9. **Automação de Criativos** ❌
**Status**: Não existe

**Gap**: Sistema não sugere/cria criativos automaticamente baseados em performance.

**Solução Futura**:
- Integração com OpenAI/Midjourney para geração de imagens
- Templates de copy baseados em campanhas vencedoras
- Rotação automática de criativos
- Pause de criativos com baixa performance

**Prioridade**: 🟢 BAIXA
**Esforço**: 30+ horas
**Benefício**: Redução de trabalho manual, scaling de criativos

---

#### 10. **Integração com Instagram Direct & WhatsApp** ❌
**Status**: Não existe

**Gap**: Leads que chegam via Instagram Direct ou WhatsApp Business não são capturados no CRM.

**Solução Futura**:
- Webhook de Instagram Direct Messages
- Webhook de WhatsApp Business API
- Criação automática de lead a partir de mensagem
- Thread de conversa no CRM

**Prioridade**: 🟢 MÉDIA-BAIXA
**Esforço**: 20-30 horas
**Benefício**: Captura de leads que conversam direto (não preenchem formulário)

---

## 📈 Comparação: Atual vs Ideal

| Funcionalidade | Status Atual | Status Ideal | Gap |
|----------------|-------------|--------------|-----|
| OAuth & Conexão | ✅ 100% | ✅ 100% | - |
| Sync Campanhas | ✅ 90% (manual) | ⚙️ 100% (auto) | Cron job |
| Sync Adsets/Ads | ❌ 0% | ⚙️ 100% | Implementar |
| Webhook Lead Ads | ✅ 100% | ✅ 100% | - |
| Conversions API | ✅ 90% (manual) | ⚙️ 100% (auto) | Cron job |
| UTM Tracking | ✅ 100% | ✅ 100% | - |
| UI Attribution | ✅ 100% | ✅ 100% | - |
| Dashboard Meta | ✅ 80% | ⚙️ 100% | Unificar com CRM |
| Budget & Alertas | ❌ 0% | ⚙️ 100% | Implementar |
| A/B Testing | ❌ 0% | ⚙️ 50% | Nice to have |
| Lookalike Auto | ❌ 0% | ⚙️ 30% | Nice to have |
| Automação Criativos | ❌ 0% | ⚙️ 20% | Nice to have |
| Instagram/WhatsApp | ❌ 0% | ⚙️ 70% | Implementar |

**Legenda**:
- ✅ Implementado
- ⚙️ Planejado/Necessário
- ❌ Não existe

---

## 🎯 Recomendação de Roadmap

### Sprint 1 (1-2 semanas) - CRÍTICO
1. ✅ Automação de Sync de Métricas (cron job)
2. ✅ Automação de Dispatch CAPI (cron job)
3. ✅ Sincronização bidirecional de leads

**Resultado**: Sistema 100% automatizado, sem intervenção manual

---

### Sprint 2 (2-3 semanas) - IMPORTANTE
4. ⚙️ Sincronização de Adsets & Ads
5. ⚙️ Dashboard Unificado CRM + Meta
6. ⚙️ Análise granular de performance por criativo

**Resultado**: Visão completa do funil, decisões baseadas em dados

---

### Sprint 3 (3-4 semanas) - MELHORIA
7. ⚙️ Gestão de Budget & Alertas
8. ⚙️ Notificações proativas de performance
9. ⚙️ Pause automático de campanhas com budget estourado

**Resultado**: Controle proativo de gastos

---

### Sprint 4+ (Futuro) - NICE TO HAVE
10. ⚙️ A/B Testing integrado
11. ⚙️ Lookalike Audiences automáticas
12. ⚙️ Automação de criativos
13. ⚙️ Instagram Direct & WhatsApp

---

## 💡 Quick Wins (Implementação Rápida)

### 1. Cron Job de Sincronização (2 horas)
```sql
-- Adicionar ao Supabase via Dashboard > Database > Extensions > pg_cron
SELECT cron.schedule(
  'sync-meta-daily',
  '0 3 * * *',
  $$ SELECT net.http_post(...) $$
);
```

### 2. Alertas Simples via Email (4 horas)
```typescript
// Edge Function: daily-performance-email
// Envia email diário com resumo de performance
async function sendDailyReport() {
  const yesterday = getYesterday();
  const metrics = await getMetrics(yesterday);

  const html = `
    <h1>Resumo Diário - Meta Ads</h1>
    <p>Investimento: ${formatCurrency(metrics.spend)}</p>
    <p>Leads: ${metrics.leads}</p>
    <p>CPL: ${formatCurrency(metrics.cpl)}</p>
    <p>Conversões: ${metrics.conversions}</p>
    <p>ROAS: ${metrics.roas}x</p>
  `;

  await sendEmail(user.email, 'Resumo Diário - Meta Ads', html);
}
```

### 3. Widget de ROI Real no Dashboard (6 horas)
```typescript
// Adicionar card no Dashboard.tsx
<Card>
  <CardHeader>
    <CardTitle>ROI Real (Meta Ads)</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-4xl font-bold">
      {(revenue / metaSpend).toFixed(2)}x
    </div>
    <p className="text-sm text-muted-foreground">
      Investido: {formatCurrency(metaSpend)} →
      Faturado: {formatCurrency(revenue)}
    </p>
  </CardContent>
</Card>
```

---

## 📚 Referências

**Documentação Implementada**:
- [CONCLUSAO-DEPLOY.md](CONCLUSAO-DEPLOY.md) - Status atual
- [INTEGRACAO-META-ADS-COMPLETA.md](INTEGRACAO-META-ADS-COMPLETA.md) - Implementação CAPI + UTM
- [STATUS-IMPLEMENTACAO.md](STATUS-IMPLEMENTACAO.md) - Checklist de deploy

**Meta APIs**:
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Lead Ads Webhooks](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving)

---

**Última Atualização**: 2025-12-02
**Versão**: 1.0
**Próxima Revisão**: Após implementação do Sprint 1
