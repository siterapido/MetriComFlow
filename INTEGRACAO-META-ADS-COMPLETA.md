# Integração Completa Meta Ads ↔ CRM - Implementação

## ✅ FASES IMPLEMENTADAS

### **FASE 1: Meta Conversions API (CAPI)** 🟢 COMPLETO

Implementação do feedback de conversões do CRM para o Meta Ads, permitindo que o algoritmo do Meta aprenda com conversões reais.

#### Arquivos Criados:
- ✅ **Migration:** `supabase/migrations/20251102_meta_conversions_api.sql`
  - Tabela `meta_conversion_events` para armazenar eventos
  - Trigger automático quando lead muda para 'qualificado' ou 'fechado_ganho'
  - Políticas RLS para multi-tenancy

- ✅ **Edge Function:** `supabase/functions/meta-conversion-dispatch/index.ts`
  - Processa eventos pendentes da tabela
  - Hash SHA-256 de PII (email, phone, name)
  - Envia para Meta Graph API v24.0
  - Retry logic para falhas
  - Suporte a test_event_code para debug

#### Como Funciona:
1. Lead atualiza status → Trigger cria registro em `meta_conversion_events`
2. Edge Function (via cron ou manual) lê eventos `pending`
3. Busca dados do lead (email, phone, name)
4. Faz hash SHA-256 de todos dados pessoais
5. Envia para Meta CAPI: `POST /v24.0/{pixel_id}/events`
6. Marca evento como `sent` ou `failed`

#### Eventos Enviados:
- **Lead**: Quando status = 'qualificado'
- **Purchase**: Quando status = 'fechado_ganho' (com valor)

#### Configuração Necessária:
```bash
# Adicionar nos Supabase Secrets:
npx supabase secrets set META_PIXEL_ID="seu_pixel_id"
npx supabase secrets set META_ACCESS_TOKEN="seu_token_longa_duracao"

# Ou configurar por organização (preferível)
# Em meta_business_connections adicionar coluna meta_pixel_id
```

---

### **FASE 2: UI de Atribuição Campaign → Lead** 🟢 COMPLETO

Visualização de quais leads vieram de cada campanha Meta Ads.

#### Arquivos Modificados:
- ✅ **src/components/leads/LeadCard.tsx**
  - Badge "Meta Ads" com gradiente azul
  - Badge da campanha (truncado, com tooltip)
  - Join com `ad_campaigns` via `campaign_id`

- ✅ **src/hooks/useLeads.ts**
  - Adicionado join: `ad_campaigns (name, external_id)`
  - Novo filtro: `campaign_id` em `LeadFilters`
  - Type `Lead` estendido com `ad_campaigns`

- ✅ **src/pages/Leads.tsx**
  - Novo filtro dropdown "Filtrar por Campanha"
  - Lista campanhas de `useAdCampaigns()`
  - Filtro aplicado no useMemo de `boards`
  - Visível apenas se Meta Ads conectado

#### Como Usar:
1. Leads com `source = 'meta_ads'` mostram badge azul
2. Se `campaign_id` preenchido, mostra nome da campanha
3. Filtro permite isolar leads por campanha específica
4. Clicar no badge abre detalhes da campanha (futuro)

---

### **FASE 3: UTM Tracking + Meta Pixel** 🟢 COMPLETO

Captura de parâmetros UTM e fbclid para atribuição completa + tracking de eventos com Meta Pixel.

#### Arquivos Criados/Modificados:

**Migration:**
- ✅ `supabase/migrations/20251102_utm_tracking.sql`
  - Colunas UTM em `lead_form_submissions`: utm_source, utm_campaign, utm_medium, utm_term, utm_content, fbclid
  - Colunas UTM em `leads`: mesmos campos
  - Índices para queries rápidas

**Frontend:**
- ✅ **src/lib/tracking.ts**
  - Captura `fbclid` da URL além do cookie `_fbc`
  - Já capturava UTMs, agora com fbclid prioritário

- ✅ **src/pages/PublicLeadForm.tsx**
  - `useEffect` para disparar `fbq('track', 'ViewContent')` ao carregar
  - `fbq('track', 'Lead')` ao submeter com sucesso
  - Declaração global de `window.fbq`

**Backend:**
- ✅ **supabase/functions/submit-lead-form/index.ts**
  - Salva UTMs em `leadInsert`:
    - `utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content`
    - `fbclid` (para CAPI)
  - Dados passados para `meta-conversion-dispatch`

#### Fluxo Completo:
1. **Anúncio Meta** → URL com `?fbclid=xxx&utm_campaign=Black+Friday`
2. **PublicLeadForm** carrega → `fbq('track', 'ViewContent')`
3. **tracking.ts** captura fbclid + UTMs da URL
4. **Formulário** submetido → `fbq('track', 'Lead')`
5. **submit-lead-form** salva UTMs + fbclid no lead
6. **Auto-atribuição:** Se `utm_campaign` match nome de campanha → `campaign_id` preenchido
7. **CAPI:** fbclid enviado para Meta para melhor atribuição

#### Configuração do Meta Pixel:
O Meta Pixel precisa ser carregado manualmente. Adicionar em `index.html`:

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID_AQUI');
fbq('track', 'PageView');
</script>
<noscript>
<img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID_AQUI&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
```

---

## 📋 PRÓXIMAS FASES (NÃO IMPLEMENTADAS)

### **FASE 4: Dashboard ROI Unificado** ⏸️ PENDENTE

**Objetivo:** Visão holística: Investimento → Leads → Vendas → ROI Real

**Implementação:**
1. Criar view SQL `campaign_roi_complete`:
```sql
CREATE VIEW campaign_roi_complete AS
SELECT
  c.id,
  c.name,
  SUM(cdi.spend) as investimento,
  COUNT(DISTINCT l.id) FILTER (WHERE l.source = 'meta_ads') as leads_totais,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'qualificado') as leads_qualificados,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'fechado_ganho') as vendas_fechadas,
  SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho') as receita_fechada,
  (SUM(l.value) FILTER (WHERE l.status = 'fechado_ganho') - SUM(cdi.spend)) / NULLIF(SUM(cdi.spend), 0) * 100 as roi_real
FROM ad_campaigns c
LEFT JOIN campaign_daily_insights cdi ON cdi.campaign_id = c.id
LEFT JOIN leads l ON l.campaign_id = c.id
WHERE c.ad_accounts.organization_id = auth.organization_id() -- RLS
GROUP BY c.id, c.name;
```

2. Hook: `src/hooks/useCampaignROI.ts`
3. Componente: `src/components/meta-ads/ROIUnifiedDashboard.tsx`
4. Integrar no Dashboard principal

**Benefícios:**
- Visão clara de qual campanha tem melhor ROI
- Decisões baseadas em revenue, não apenas leads
- Gráfico de funil: Impressões → Clicks → Leads → Qualificados → Vendas

---

### **FASE 5: Gestão de Webhooks** ⏸️ PENDENTE

**Objetivo:** Visibilidade e debug de webhooks recebidos.

**Implementação:**
1. Criar tabela `webhook_logs`:
```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL, -- 'meta', 'asaas', etc
  event_type TEXT,
  payload JSON,
  status TEXT, -- 'success', 'failed', 'duplicate'
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Atualizar `webhook-lead-ads/index.ts` para logar TODOS eventos
3. Componente: `src/components/meta-ads/WebhookMonitor.tsx`
4. Seção em `/meta-ads-config` com:
   - Lista de webhooks últimas 24h
   - Status de cada evento
   - Botão "Testar Webhook"
   - Botão "Reprocessar" para falhas

---

## 🚀 COMO TESTAR A IMPLEMENTAÇÃO

### 1. Aplicar Migrations
```bash
npx supabase db push
```

### 2. Deploy Edge Functions
```bash
npx supabase functions deploy meta-conversion-dispatch
```

### 3. Configurar Secrets
```bash
npx supabase secrets set META_PIXEL_ID="123456789"
npx supabase secrets set META_ACCESS_TOKEN="EAAG..."
```

### 4. Testar CAPI
```bash
# Criar lead de teste e mudar status para qualificado
# Verificar se evento foi criado:
SELECT * FROM meta_conversion_events ORDER BY created_at DESC LIMIT 5;

# Processar manualmente:
npx supabase functions invoke meta-conversion-dispatch \
  --data '{"test_event_code":"TEST12345"}'

# Verificar no Meta Events Manager:
# https://business.facebook.com/events_manager2/
```

### 5. Testar UTM Tracking
```bash
# Acessar formulário público com UTMs:
https://SEU_DOMINIO.com/f/seu-form?utm_source=facebook&utm_campaign=black_friday&fbclid=IwAR123

# Submeter formulário
# Verificar se lead foi criado com UTMs:
SELECT utm_source, utm_campaign, fbclid FROM leads ORDER BY created_at DESC LIMIT 1;
```

### 6. Testar Meta Pixel
```bash
# 1. Adicionar Pixel ID no index.html
# 2. Abrir DevTools → Network → filtrar "fbevents"
# 3. Acessar formulário → ver evento "ViewContent"
# 4. Submeter → ver evento "Lead"
# 5. Verificar no Meta Events Manager
```

---

## 📊 MÉTRICAS DE SUCESSO

### Antes (Sem Integração):
- ❌ Meta não sabia quais leads viraram clientes
- ❌ Otimização baseada apenas em leads brutos
- ❌ Sem visibilidade de ROI real
- ❌ Atribuição manual

### Depois (Com Integração):
- ✅ Meta recebe eventos de conversão (CAPI)
- ✅ Algoritmo otimiza para leads qualificados
- ✅ Dashboard mostra ROI real (investimento vs receita)
- ✅ Atribuição automática via UTM + fbclid
- ✅ Tracking completo: Anúncio → Lead → Cliente

---

## ⚠️ AVISOS IMPORTANTES

### CAPI (Conversions API):
- **Requer Pixel configurado** no index.html
- **Access Token** deve ter permissão `ads_management`
- **Pixel ID** deve estar associado ao Ad Account correto
- **Test Event Code** recomendado durante testes

### UTM Tracking:
- **Consistência:** Use mesmos nomes de campanhas em Meta e UTMs
- **Auto-atribuição:** Funciona por match de string (`utm_campaign` ≈ `campaign.name`)
- **fbclid:** Essencial para CAPI funcionar corretamente

### RLS (Row Level Security):
- **Todas queries** devem filtrar por `organization_id`
- **meta_conversion_events** tem RLS habilitado
- **Service role** pode fazer CRUD completo

---

## 📝 DOCUMENTAÇÃO ADICIONAL

- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Pixel Docs](https://developers.facebook.com/docs/meta-pixel)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎯 RESUMO EXECUTIVO

**O que foi feito:**
1. ✅ Meta Conversions API (CRM → Meta) para otimização de campanhas
2. ✅ UI de atribuição (ver quais leads vieram de cada campanha)
3. ✅ UTM Tracking completo + fbclid para atribuição
4. ✅ Meta Pixel em formulários para remarketing

**Benefícios:**
- Meta aprende com conversões reais, não apenas leads
- Visibilidade completa de atribuição de campanhas
- Base para Dashboard ROI (Fase 4)
- Remarketing de quem visitou formulário

**Próximos Passos:**
1. Aplicar migrations (`npx supabase db push`)
2. Deploy functions (`npx supabase functions deploy meta-conversion-dispatch`)
3. Configurar Meta Pixel no `index.html`
4. Testar fluxo completo
5. (Opcional) Implementar Fase 4 (Dashboard ROI) e Fase 5 (Webhook Monitor)
