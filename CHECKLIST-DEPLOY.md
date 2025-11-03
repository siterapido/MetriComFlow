# ✅ Checklist de Deploy - Integração Meta Ads ↔ CRM

## 📋 PRÉ-REQUISITOS

- [ ] Acesso ao Supabase Dashboard
- [ ] Acesso ao Meta Business Manager
- [ ] Meta Pixel ID configurado
- [ ] Meta Access Token de longa duração
- [ ] Permissões `ads_management` no token

---

## 🗄️ PASSO 1: Aplicar Migrations no Banco de Dados

### Opção A: Via Supabase SQL Editor (RECOMENDADO)

1. [ ] Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. [ ] Navegue até **SQL Editor**
3. [ ] Abra o arquivo [`APPLY_MIGRATIONS.sql`](./APPLY_MIGRATIONS.sql)
4. [ ] Cole todo o conteúdo no SQL Editor
5. [ ] Clique em **Run** (ou Ctrl+Enter)
6. [ ] Verifique se as queries executaram sem erros
7. [ ] Verifique a seção de "VERIFICAÇÃO" no final do script

**Resultado esperado:**
```
table_name                | column_count
--------------------------|-------------
meta_conversion_events    | 17
leads (utm columns)       | 6
```

### Opção B: Via CLI (se autenticado)

```bash
npx supabase db push
```

---

## 🚀 PASSO 2: Deploy das Edge Functions

### 2.1 Deploy meta-conversion-dispatch

```bash
npx supabase functions deploy meta-conversion-dispatch
```

**Verificação:**
```bash
npx supabase functions list
# Deve aparecer: meta-conversion-dispatch
```

### 2.2 Redeploy submit-lead-form (atualizado)

```bash
npx supabase functions deploy submit-lead-form
```

---

## 🔑 PASSO 3: Configurar Secrets no Supabase

### Via CLI:

```bash
# Meta Pixel ID
npx supabase secrets set META_PIXEL_ID="123456789"

# Meta Access Token (Long-lived)
npx supabase secrets set META_ACCESS_TOKEN="EAAG..."

# (Opcional) Test Event Code para debug
npx supabase secrets set META_TEST_EVENT_CODE="TEST12345"
```

### Via Dashboard:

1. [ ] Abra **Project Settings** → **Edge Functions**
2. [ ] Adicione as secrets:
   - `META_PIXEL_ID`
   - `META_ACCESS_TOKEN`
   - `META_TEST_EVENT_CODE` (opcional)

---

## 📱 PASSO 4: Configurar Meta Pixel no Frontend

### 4.1 Adicionar script no index.html

Abra [`index.html`](./index.html) e adicione antes do `</head>`:

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
fbq('init', 'SEU_PIXEL_ID_AQUI'); // ⚠️ SUBSTITUIR pelo Pixel ID real
fbq('track', 'PageView');
</script>
<noscript>
<img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID_AQUI&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
```

### 4.2 Deploy do Frontend

```bash
npm run build
# Ou via Vercel/Netlify automaticamente
```

---

## 🧪 PASSO 5: Testar a Integração

### 5.1 Testar Captura de UTMs

1. [ ] Acesse um formulário público com UTMs:
   ```
   https://seu-dominio.com/f/seu-form?utm_source=facebook&utm_campaign=black_friday&fbclid=IwAR123
   ```

2. [ ] Submeta o formulário

3. [ ] Verifique no Supabase SQL Editor:
   ```sql
   SELECT
     title,
     utm_source,
     utm_campaign,
     fbclid,
     source,
     campaign_id
   FROM leads
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Resultado esperado:**
- `utm_source = 'facebook'`
- `utm_campaign = 'black_friday'`
- `fbclid = 'IwAR123'`

### 5.2 Testar Meta Pixel

1. [ ] Abra DevTools (F12) → **Network**
2. [ ] Filtre por `fbevents`
3. [ ] Acesse um formulário público
4. [ ] Verifique evento `ViewContent` enviado
5. [ ] Submeta o formulário
6. [ ] Verifique evento `Lead` enviado

**Verificar no Meta Events Manager:**
- Acesse: https://business.facebook.com/events_manager2/
- Verifique eventos recebidos nas últimas horas

### 5.3 Testar Meta Conversions API (CAPI)

1. [ ] Crie um lead de teste manualmente no CRM

2. [ ] Mude o status para **"Qualificado"**

3. [ ] Verifique se evento foi criado:
   ```sql
   SELECT
     id,
     event_name,
     status,
     created_at,
     error_message
   FROM meta_conversion_events
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Resultado esperado:**
- Novo registro com `event_name = 'Lead'`
- `status = 'pending'`

4. [ ] Processar manualmente o evento:
   ```bash
   npx supabase functions invoke meta-conversion-dispatch \
     --data '{"test_event_code":"TEST12345"}'
   ```

5. [ ] Verificar resposta e status atualizado:
   ```sql
   SELECT
     event_name,
     status,
     sent_at,
     error_message,
     response_data
   FROM meta_conversion_events
   WHERE event_name = 'Lead'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Resultado esperado:**
- `status = 'sent'`
- `sent_at` preenchido
- `error_message = NULL`

6. [ ] Verificar no Meta Events Manager:
   - Acesse **Test Events** tab
   - Procure por evento com `test_event_code = 'TEST12345'`
   - Verifique dados (email hash, phone hash, etc)

### 5.4 Testar UI de Atribuição

1. [ ] Acesse `/leads` no CRM

2. [ ] Verifique se leads do Meta Ads mostram:
   - Badge "Meta Ads" azul
   - Nome da campanha (se `campaign_id` preenchido)

3. [ ] Teste filtro de campanhas:
   - Selecione uma campanha específica
   - Verifique se apenas leads daquela campanha aparecem

---

## 🔄 PASSO 6: Configurar Processamento Automático (Cron)

### Opção A: Via pg_cron (no Supabase)

```sql
-- Processar eventos CAPI a cada 5 minutos
SELECT cron.schedule(
  'process-meta-conversions',
  '*/5 * * * *',  -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://mmfuzxqglgfmotgikqav.supabase.co/functions/v1/meta-conversion-dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Opção B: Via Supabase Edge Function Schedule (Recomendado)

1. [ ] Crie arquivo `supabase/functions/_cron/meta-conversions/index.ts`
2. [ ] Configure schedule no `deno.json`
3. [ ] Deploy com `supabase functions deploy _cron/meta-conversions`

### Opção C: Via serviço externo (Cron-job.org, etc)

```bash
# Configurar para chamar a cada 5 minutos:
curl -X POST https://mmfuzxqglgfmotgikqav.supabase.co/functions/v1/meta-conversion-dispatch \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📊 PASSO 7: Monitoramento e Logs

### 7.1 Verificar logs de Edge Functions

```bash
# Ver logs de conversions dispatch
npx supabase functions logs meta-conversion-dispatch --limit 50

# Ver logs de submit-lead-form
npx supabase functions logs submit-lead-form --limit 50
```

### 7.2 Monitorar eventos pendentes

```sql
-- Ver eventos que ainda não foram enviados
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE retry_count >= max_retries) as max_retries_reached
FROM meta_conversion_events
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### 7.3 Verificar erros

```sql
-- Últimos 10 eventos com erro
SELECT
  id,
  event_name,
  error_message,
  retry_count,
  created_at
FROM meta_conversion_events
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 CHECKLIST FINAL

- [ ] Migrations aplicadas com sucesso
- [ ] Edge Functions deployadas
- [ ] Secrets configuradas
- [ ] Meta Pixel instalado no index.html
- [ ] Teste de UTM tracking funcionando
- [ ] Teste de Meta Pixel funcionando
- [ ] Teste de CAPI funcionando
- [ ] Eventos aparecem no Meta Events Manager
- [ ] UI de atribuição mostrando campanhas
- [ ] Cron job configurado (opcional)
- [ ] Monitoramento configurado

---

## 🚨 Troubleshooting

### Problema: Eventos CAPI com erro "Invalid Pixel ID"

**Solução:**
1. Verificar se `META_PIXEL_ID` está correto nos secrets
2. Verificar se Pixel está associado ao Ad Account correto
3. Verificar no Meta Business Manager → Pixels

### Problema: Meta Pixel não dispara eventos

**Solução:**
1. Verificar se script foi adicionado no `index.html`
2. Verificar Console do navegador por erros
3. Verificar Network tab por requisições para `fbevents.js`
4. Verificar se Pixel ID está correto no script

### Problema: UTMs não sendo salvos

**Solução:**
1. Verificar migrations aplicadas (`APPLY_MIGRATIONS.sql`)
2. Verificar `submit-lead-form` deployado com versão atualizada
3. Verificar logs: `npx supabase functions logs submit-lead-form`

### Problema: Filtro de campanhas não aparece

**Solução:**
1. Verificar se Meta Ads está conectado (`hasMetaConnection = true`)
2. Verificar se existem campanhas (`useAdCampaigns()` retorna dados)
3. Hard refresh no navegador (Ctrl+Shift+R)

---

## 📚 Documentação Adicional

- [Integração Completa (README)](./INTEGRACAO-META-ADS-COMPLETA.md)
- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Pixel Docs](https://developers.facebook.com/docs/meta-pixel)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Data de criação:** 2025-11-02
**Última atualização:** 2025-11-02
**Versão:** 1.0
