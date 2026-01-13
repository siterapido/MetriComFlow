# Guia de Configuração - Meta Ads em Produção

Este guia detalha os passos para configurar completamente a integração Meta Ads em produção, incluindo OAuth, sincronização de campanhas e dados históricos.

## 📋 Pré-requisitos

- [ ] Acesso ao painel do Meta Developer (https://developers.facebook.com)
- [ ] Acesso ao Supabase (https://supabase.com)
- [ ] Acesso ao Vercel (https://vercel.com)
- [ ] Conta ativa no Meta Business Manager
- [ ] Conta(s) de anúncios ativas no Meta Ads

## 🌐 Informações do Ambiente de Produção

- **URL de Produção**: https://www.insightfy.com.br
- **Redirect URI OAuth**: https://www.insightfy.com.br/meta-ads-config
- **Meta App ID**: 3361128087359379
- **Supabase URL**: https://kyysmixnhdqrxynxjbwk.supabase.co

---

## Parte 1: Configuração do Meta App (Developer Console)

### 1.1 Acessar Meta Developer Console

1. Acesse: https://developers.facebook.com/apps/3361128087359379/settings/basic/
2. Faça login com sua conta Meta/Facebook

### 1.2 Configurar URLs de Redirecionamento OAuth

1. Vá para **Settings** > **Basic**
2. Na seção **"URIs de redirecionamento OAuth válidos"**, adicione:
   ```
   https://www.insightfy.com.br/meta-ads-config
   ```
3. Clique em **"Salvar alterações"** (canto inferior direito)

### 1.3 Verificar Permissões do App

1. Vá para **App Review** > **Permissions and Features**
2. Certifique-se que as seguintes permissões estão aprovadas:
   - ✅ `ads_read` - Ler dados de anúncios
   - ✅ `ads_management` - Gerenciar campanhas
   - ✅ `business_management` - Acessar contas de anúncios

### 1.4 Verificar Modo do App

1. Vá para **Settings** > **Basic**
2. No topo da página, o status deve ser:
   - **"Live"** (App ativo em produção) ✅

   Se estiver em **"Development Mode"**:
   - Clique em **"Switch to Live"**
   - Siga o processo de revisão do Meta se necessário

---

## Parte 2: Configuração do Supabase

### 2.1 Configurar Secrets das Edge Functions

Execute os seguintes comandos no terminal:

```bash
# 1. Login no Supabase CLI
npx supabase login

# 2. Link com o projeto (se ainda não estiver linkado)
npx supabase link --project-ref kyysmixnhdqrxynxjbwk

# 3. Configurar secrets do Meta App
npx supabase secrets set META_APP_ID="3361128087359379"
npx supabase secrets set META_APP_SECRET="7e6216e859be7639fa4de061536ce944"

# 4. Configurar URL de produção
npx supabase secrets set VITE_APP_URL="https://www.insightfy.com.br"

# 5. Verificar secrets configurados
npx supabase secrets list
```

### 2.2 Deploy das Edge Functions

```bash
# Deploy de todas as Edge Functions necessárias
npx supabase functions deploy meta-auth
npx supabase functions deploy connect-ad-account
npx supabase functions deploy sync-daily-insights

# Verificar deploy
npx supabase functions list
```

### 2.3 Verificar Edge Functions Logs

```bash
# Verificar logs recentes
npx supabase functions logs meta-auth --limit 20
npx supabase functions logs connect-ad-account --limit 20
npx supabase functions logs sync-daily-insights --limit 20
```

---

## Parte 3: Configuração do Vercel (Variáveis de Ambiente)

### 3.1 Acessar Painel do Vercel

1. Acesse: https://vercel.com/mafcos-projects-ca629a4f/metri-com-flow/settings/environment-variables
2. Vá para **Settings** > **Environment Variables**

### 3.2 Configurar Variáveis de Ambiente

Adicione/atualize as seguintes variáveis para o ambiente **Production**:

| Nome da Variável | Valor | Ambiente |
|------------------|-------|----------|
| `VITE_SUPABASE_URL` | `https://fjoaliipjfcnokermkhy.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production |
| `VITE_META_APP_ID` | `3361128087359379` | Production |
| `VITE_META_REDIRECT_URI` | `https://www.insightfy.com.br/meta-ads-config` | Production |
| `VITE_APP_URL` | `https://www.insightfy.com.br` | Production |

**⚠️ IMPORTANTE**: Não adicione `VITE_META_APP_SECRET` nas variáveis do Vercel (apenas no Supabase Secrets)

### 3.3 Deploy em Produção

```bash
# Via Vercel CLI
vercel --prod

# OU via Git (push para branch main)
git add .
git commit -m "feat: configuração Meta Ads produção"
git push origin main
```

Aguarde o deploy completar (2-3 minutos).

---

## Parte 4: Conectar Conta Meta Business (Interface Web)

### 4.1 Acessar Sistema em Produção

1. Acesse: https://www.insightfy.com.br
2. Faça login com suas credenciais

### 4.2 Iniciar OAuth Flow

1. Vá para: **Meta Ads Config** (menu lateral esquerdo)
   - URL: https://www.insightfy.com.br/meta-ads-config

2. Clique no botão **"Conectar Meta Business"**

3. Você será redirecionado para o Meta:
   - Faça login na sua conta Meta/Facebook
   - Autorize o app "InsightFy"
   - Conceda permissões de acesso às contas de anúncios

4. Após autorização, você será redirecionado de volta para:
   ```
   https://www.insightfy.com.br/meta-ads-config?code=xxx&state=xxx
   ```

5. O sistema processará automaticamente o código OAuth e armazenará o token

### 4.3 Adicionar Contas de Anúncios

Na página **Meta Ads Config**:

1. Clique em **"Adicionar Conta"** ou **"Descobrir Contas"**

2. Se usar **"Descobrir Contas"**:
   - O sistema buscará todas as contas disponíveis no Meta
   - Selecione as contas desejadas
   - Clique em **"Conectar"**

3. Se adicionar **manualmente**:
   - Insira o **ID da conta** (número de 15 dígitos, ex: `1558732224693082`)
   - Insira o **nome da conta** (ex: "Conta Principal - Meta Ads")
   - Clique em **"Adicionar"**

4. Aguarde a sincronização inicial:
   - O sistema buscará automaticamente todas as campanhas ativas, pausadas e arquivadas
   - Isso pode levar 30-60 segundos por conta

---

## Parte 5: Sincronizar Dados Históricos (Ano Completo)

### 5.1 Preparar Sincronização

Agora que as campanhas estão cadastradas, precisamos buscar os dados históricos de 2025.

### 5.2 Executar Sincronização Manual (Recomendado)

**Opção A: Via Terminal (mais confiável)**

```bash
# Sincronizar ano completo de 2025
npx supabase functions invoke sync-daily-insights \
  --data '{
    "since": "2025-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30,
    "logResponseSample": true
  }'
```

**Opção B: Via API REST (se preferir)**

```bash
# Obtenha o SERVICE_ROLE_KEY do .env ou Supabase Dashboard
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Execute a sincronização
curl -X POST https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-daily-insights \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2025-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30,
    "logResponseSample": true
  }'
```

### 5.3 Monitorar Progresso da Sincronização

```bash
# Verificar logs da Edge Function em tempo real
npx supabase functions logs sync-daily-insights --limit 50

# Verificar quantos insights foram inseridos
npx supabase db execute --sql \
  "SELECT
    DATE_TRUNC('month', date) as mes,
    COUNT(*) as total_registros,
    SUM(spend) as investimento_total,
    SUM(leads_count) as leads_gerados
   FROM campaign_daily_insights
   WHERE date >= '2025-01-01'
   GROUP BY mes
   ORDER BY mes;"
```

### 5.4 Validar Dados na Interface

1. Acesse: https://www.insightfy.com.br/meta-ads-config
2. Selecione o filtro de data: **"Ano completo - 2025"**
3. Verifique se os dados aparecem:
   - ✅ KPIs (Investimento total, Leads, CPL, ROAS)
   - ✅ Gráfico de evolução diária/mensal
   - ✅ Tabela de campanhas com métricas

---

## Parte 6: Configurar Sincronização Automática Diária

### 6.1 Criar Cron Job no Supabase (pg_cron)

Execute o seguinte SQL no **Supabase SQL Editor**:

```sql
-- 1. Habilitar extensão pg_cron (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar job diário para sincronizar últimos 7 dias (executa às 3h da manhã)
SELECT cron.schedule(
  'sync-meta-insights-daily',
  '0 3 * * *', -- Todo dia às 3h AM (horário do servidor)
  $$
  SELECT net.http_post(
    url := 'https://fjoaliipjfcnokermkhy.supabase.co/functions/v1/sync-daily-insights',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text,
      'maxDaysPerChunk', 7
    )
  );
  $$
);

-- 3. Verificar jobs ativos
SELECT * FROM cron.job;

-- 4. Ver histórico de execuções
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

**⚠️ NOTA**: O `pg_cron` pode não estar disponível em todos os planos do Supabase. Alternativas:

### 6.2 Alternativa: Vercel Cron Jobs

Crie um arquivo `vercel.json` com:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-meta-insights",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Crie o endpoint `/api/cron/sync-meta-insights.ts` (API Route no Vercel):

```typescript
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: Request) {
  // Verificar autenticação do cron (via Vercel secret)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase.functions.invoke('sync-daily-insights', {
    body: {
      since: weekAgo,
      until: today,
      maxDaysPerChunk: 7
    }
  });

  if (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}
```

---

## 🔍 Troubleshooting

### Problema: Campanhas não aparecem após conectar conta

**Diagnóstico**:
```bash
# 1. Verificar se conta foi criada
npx supabase db execute --sql \
  "SELECT id, external_id, business_name, is_active, organization_id
   FROM ad_accounts
   ORDER BY created_at DESC;"

# 2. Verificar se campanhas foram sincronizadas
npx supabase db execute --sql \
  "SELECT COUNT(*) as total_campanhas FROM ad_campaigns;"

# 3. Verificar logs da conexão
npx supabase functions logs connect-ad-account --limit 20
```

**Solução**:
- Se conta existe mas sem campanhas: Desativar e reativar conta na UI
- Se erro nos logs: Verificar token de acesso e permissões do Meta App

### Problema: Dados históricos não sincronizam

**Diagnóstico**:
```bash
# Verificar se sync foi executado
npx supabase functions logs sync-daily-insights --limit 50

# Verificar insights no banco
npx supabase db execute --sql \
  "SELECT DATE_TRUNC('month', date) as mes, COUNT(*)
   FROM campaign_daily_insights
   GROUP BY mes
   ORDER BY mes;"
```

**Solução**:
- Executar sync novamente com `logResponseSample: true`
- Verificar se token não expirou (reconectar OAuth se necessário)
- Verificar rate limits do Meta API nos logs

### Problema: Token expirado

**Sintoma**: Logs mostram "Access token has expired"

**Solução**:
1. Vá para https://www.insightfy.com.br/meta-ads-config
2. Desconecte a conta Meta Business
3. Conecte novamente (OAuth flow)

---

## ✅ Checklist Final

- [ ] Meta App configurado com redirect URI de produção
- [ ] Supabase Secrets configurados (META_APP_ID, META_APP_SECRET)
- [ ] Edge Functions deployed (meta-auth, connect-ad-account, sync-daily-insights)
- [ ] Variáveis de ambiente no Vercel configuradas
- [ ] Deploy em produção realizado (https://www.insightfy.com.br)
- [ ] OAuth flow testado e conectado com sucesso
- [ ] Contas de anúncios adicionadas
- [ ] Campanhas sincronizadas (visíveis na UI)
- [ ] Dados históricos do ano completo sincronizados
- [ ] Cron job diário configurado (pg_cron ou Vercel Cron)
- [ ] Dados validados na interface (KPIs, gráficos, tabela)

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs**:
   ```bash
   npx supabase functions logs sync-daily-insights --limit 100
   ```

2. **Verificar status das Edge Functions**:
   ```bash
   npx supabase functions list
   ```

3. **Verificar dados no banco**:
   ```bash
   # Script de diagnóstico
   npx tsx scripts/check-campaigns.ts
   ```

4. **Consultar documentação**:
   - [CLAUDE.md](CLAUDE.md) - Seção "Meta Ads Integration"
   - [docs/META_ADS_SETUP.md](docs/META_ADS_SETUP.md)

---

**Última atualização**: 28/10/2025
