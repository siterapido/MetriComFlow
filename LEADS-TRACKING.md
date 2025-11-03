# Como os Leads são Rastreados no Sistema

## ✅ Atualizações Recentes (Formulários + CRM)

- Nome do lead agora é obrigatório em todos os formulários (UI e validação no servidor).
- Cada lead recebe um identificador legível único (`public_id`, ex.: `L-20251103-AB12CD`).
- Vínculo automático com campanhas Meta Ads via `utm_campaign` (com opção manual na criação do formulário).


## 📊 Problema Identificado

**Status Atual**: Os gráficos mostram **zero leads** porque não há dados do Meta Ads sincronizados no sistema.

### Verificação Realizada:
- ✅ Ad Accounts: **0 contas ativas**
- ✅ Campanhas: **0 campanhas**
- ✅ Daily Insights: **0 registros**
- ✅ Leads do Meta Ads: **0 registros**

---

## 🔄 Como Funciona o Rastreamento de Leads

### 1. Fonte de Dados: Meta Ads API

Os leads são capturados de **duas formas principais**:

#### A) Via `campaign_daily_insights` (Métricas Agregadas)
- **Tabela**: `campaign_daily_insights`
- **Campo**: `leads_count` (número de leads gerados por dia por campanha)
- **Origem**: Sincronizado via Edge Function `sync-daily-insights`
- **Dados do Meta API**: Campo `actions` → tipos de ação relacionados a leads
  - `lead` - Formulário de lead preenchido
  - `offsite_conversion.fb_pixel_lead` - Conversão de lead via Pixel
  - `onsite_conversion.post_save` - Lead salvo (formulário nativo)

**Como é calculado**:
```typescript
// No hook useCampaignFinancialsFiltered (linha 783)
t.leads_gerados += row.leads_count || 0
```

**Onde é usado**:
- KPI Cards (Scorecard de Campanhas)
- Funil de Engajamento
- Gráficos de métricas (CPL, CTR, etc.)

---

#### B) Via Tabela `leads` (Leads Individuais no CRM)
- **Tabela**: `leads`
- **Campo**: `source = 'meta_ads'`
- **Origem**: Webhooks do Meta Lead Ads OU criação manual vinculada a campanha
- **Dados capturados**:
  - `campaign_id` - ID interno da campanha vinculada
  - `status` - Estágio no funil (novo, contato_inicial, qualificado, etc.)
  - `value` - Valor estimado do lead
  - `created_at` - Data de criação

**Onde é usado**:
- Funil de Conversão (CRM)
- Métricas de faturamento (ROAS)
- Taxa de conversão (vendas fechadas / leads gerados)

---

## 🚀 Passos para Começar a Rastrear Leads

### Passo 1: Conectar ao Meta Business Manager
1. Acesse: [/meta-ads-config](https://www.insightfy.com.br/meta-ads-config)
2. Clique em **"Configurações"**
3. Clique em **"Conectar com Meta Business"**
4. Autorize o acesso no Meta

### Passo 2: Adicionar Contas Publicitárias
1. Após conectar, clique em **"Descobrir Contas"** ou **"Adicionar Manualmente"**
2. Selecione as contas publicitárias que deseja monitorar
3. O sistema irá:
   - Criar registro na tabela `ad_accounts`
   - Buscar todas as campanhas automaticamente (tabela `ad_campaigns`)

### Passo 3: Sincronizar Métricas Históricas
1. Na página de Métricas, selecione o **período desejado** (ex: últimos 90 dias)
2. Clique no botão **"Atualizar Dados"** (ícone de refresh)
3. O sistema irá:
   - Chamar a Edge Function `sync-daily-insights`
   - Buscar dados do Meta API para cada campanha
   - Preencher a tabela `campaign_daily_insights` com:
     - `spend` - Investimento diário
     - `impressions` - Impressões
     - `clicks` - Cliques
     - `leads_count` - **Leads gerados**

**Exemplo de chamada manual**:
```bash
npx supabase functions invoke sync-daily-insights \
  --data '{
    "since": "2025-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30
  }'
```

### Passo 4: Configurar Webhooks (Opcional - para leads em tempo real)
Para capturar leads individuais automaticamente:
1. Configure o webhook do Meta Lead Ads
2. Aponte para: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-lead-ads`
3. Cada lead preenchido será criado automaticamente na tabela `leads`

---

## 📈 Fórmulas de Cálculo

### CPL (Custo Por Lead)
```typescript
cpl = leads_gerados > 0 ? investimento / leads_gerados : null
```
**Exemplo**: R$ 1.000 investidos ÷ 20 leads = R$ 50,00 CPL

### ROAS (Return on Ad Spend)
```typescript
roas = investimento > 0 ? faturamento / investimento : null
```
**Exemplo**: R$ 5.000 faturamento ÷ R$ 1.000 investidos = 5x ROAS

### Taxa de Conversão
```typescript
taxa_conversao = leads_gerados > 0 ? (vendas_fechadas / leads_gerados) * 100 : 0
```
**Exemplo**: 5 vendas fechadas ÷ 20 leads = 25% taxa de conversão

### CTR (Click-Through Rate)
```typescript
ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
```

---

## 🔍 Como Verificar se os Dados Estão Sincronizando

### Via Interface (Recomendado)
1. Acesse [/meta-ads-config](https://www.insightfy.com.br/meta-ads-config)
2. Verifique os **KPI Cards** no topo:
   - Se aparecerem valores > 0, os dados estão sincronizados
   - Se aparecerem "0" ou "-", não há dados

### Via Logs do Supabase
```bash
# Verificar logs da sincronização
npx supabase functions logs sync-daily-insights --limit 50

# Verificar logs de conexão de contas
npx supabase functions logs connect-ad-account --limit 20
```

### Via SQL (para desenvolvedores)
```sql
-- Verificar últimas métricas sincronizadas
SELECT
  c.name as campaign_name,
  i.date,
  i.spend,
  i.leads_count
FROM campaign_daily_insights i
INNER JOIN ad_campaigns c ON c.id = i.campaign_id
ORDER BY i.date DESC
LIMIT 20;

-- Verificar totais por campanha
SELECT
  c.name,
  COUNT(*) as days_tracked,
  SUM(i.spend) as total_spend,
  SUM(i.leads_count) as total_leads,
  CASE
    WHEN SUM(i.leads_count) > 0
    THEN SUM(i.spend) / SUM(i.leads_count)
    ELSE NULL
  END as cpl
FROM campaign_daily_insights i
INNER JOIN ad_campaigns c ON c.id = i.campaign_id
GROUP BY c.id, c.name
ORDER BY total_leads DESC;
```

---

## ⚠️ Problemas Comuns

### 1. "Leads = 0 mesmo após sincronização"
**Causas possíveis**:
- Campanhas não têm objetivo de leads (ex: tráfego, awareness)
- Meta API não retorna dados de `actions` com tipo de lead
- Período selecionado não tem dados

**Solução**:
- Verifique no Meta Ads Manager se as campanhas geram leads
- Teste com período mais amplo (ex: últimos 90 dias)
- Execute sync com `logResponseSample: true` para ver resposta da API

### 2. "CPL aparece como NULL"
**Causa**: `leads_gerados = 0` (divisão por zero)

**Solução**: Aguardar sincronização de dados com leads ou verificar se campanhas estão ativas

### 3. "Scorecard mostra zero em todas as campanhas"
**Causa**: Tabela `campaign_daily_insights` vazia

**Solução**: Execute sincronização conforme Passo 3 acima

---

## 📚 Documentação Relacionada

- [Meta Ads Setup Guide](docs/META_ADS_SETUP.md)
- [Database Schema](DATABASE.md)
- [CLAUDE.md - Meta Ads Integration](CLAUDE.md#meta-ads-integration)

---

## 🎯 Resumo

**Para ter leads nos gráficos, você precisa**:
1. ✅ Conectar ao Meta Business Manager
2. ✅ Adicionar contas publicitárias
3. ✅ Sincronizar dados históricos via botão "Atualizar Dados"
4. ⏱️ Aguardar processamento (1-5 minutos para 90 dias de dados)
5. 🎉 Leads aparecerão nos gráficos automaticamente!

**Status Atual**: Sistema está pronto, mas sem dados sincronizados do Meta Ads.
