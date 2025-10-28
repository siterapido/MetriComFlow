# 🚀 Próximos Passos - Colocar em Produção

## Status Atual

✅ **Sistema deployado em produção**: https://www.insightfy.com.br
✅ **Documentação completa criada**: [GUIA_PRODUCAO_META_ADS.md](GUIA_PRODUCAO_META_ADS.md)
✅ **Scripts de validação prontos**: `scripts/validate-production.ts`
⚠️ **Aguardando**: Conexão com conta Meta Business real

---

## O Que Fazer Agora (Em Ordem)

### 1. Configurar Meta Developer Console (5 minutos)

📍 **Meta Developer**: https://developers.facebook.com/apps/3361128087359379/settings/basic/

**Ação**: Adicionar URL de redirect OAuth de produção

1. Acesse o link acima
2. Vá em **"URIs de redirecionamento OAuth válidos"**
3. Adicione: `https://www.insightfy.com.br/meta-ads-config`
4. Clique em **"Salvar alterações"**

✅ **Pronto!** Meta App configurado para produção.

---

### 2. Verificar/Atualizar Variáveis no Vercel (10 minutos)

📍 **Vercel**: https://vercel.com/mafcos-projects-ca629a4f/metri-com-flow/settings/environment-variables

**Ação**: Garantir que as variáveis de produção estão corretas

Variáveis necessárias para **Production**:

```
VITE_SUPABASE_URL = https://fjoaliipjfcnokermkhy.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqb2FsaWlwamZjbm9rZXJta2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjM4MDUsImV4cCI6MjA3NTk5OTgwNX0.fvbJQAzV9q1NLXXWElbeVneWS3S3LTEigGS-s7cik2Y
VITE_META_APP_ID = 3361128087359379
VITE_META_REDIRECT_URI = https://www.insightfy.com.br/meta-ads-config
VITE_APP_URL = https://www.insightfy.com.br
```

**⚠️ IMPORTANTE**: Se alterar variáveis, fazer novo deploy:
```bash
vercel --prod
```

✅ **Pronto!** Variáveis de produção configuradas.

---

### 3. Configurar Supabase Secrets (5 minutos)

📍 **Terminal**

**Ação**: Configurar secrets das Edge Functions

```bash
# 1. Login no Supabase
npx supabase login

# 2. Link com projeto (se ainda não estiver)
npx supabase link --project-ref fjoaliipjfcnokermkhy

# 3. Configurar secrets
npx supabase secrets set META_APP_ID="3361128087359379"
npx supabase secrets set META_APP_SECRET="7e6216e859be7639fa4de061536ce944"
npx supabase secrets set VITE_APP_URL="https://www.insightfy.com.br"

# 4. Verificar
npx supabase secrets list
```

✅ **Pronto!** Secrets configurados.

---

### 4. Deploy das Edge Functions (5 minutos)

📍 **Terminal**

**Ação**: Fazer deploy das funções necessárias

```bash
# Deploy de todas as funções Meta Ads
npx supabase functions deploy meta-auth
npx supabase functions deploy connect-ad-account
npx supabase functions deploy sync-daily-insights

# Verificar
npx supabase functions list
```

✅ **Pronto!** Edge Functions deployed.

---

### 5. Conectar Conta Meta Business (5 minutos)

📍 **Interface Web**: https://www.insightfy.com.br/meta-ads-config

**Ação**: Realizar OAuth e conectar conta

1. **Fazer login** no sistema com suas credenciais
2. **Ir para**: Menu lateral → **"Meta Ads Config"**
3. **Clicar em**: **"Conectar Meta Business"**
4. **Autorizar** no Meta/Facebook quando redirecionado
5. **Aguardar** redirecionamento de volta (processamento automático)

✅ **Pronto!** Conta Meta Business conectada.

---

### 6. Adicionar Contas de Anúncios (5 minutos)

📍 **Interface Web**: https://www.insightfy.com.br/meta-ads-config

**Ação**: Adicionar suas contas de anúncios

**Opção A: Descobrir automaticamente** (Recomendado)
1. Clicar em **"Descobrir Contas"**
2. Sistema buscará todas as contas disponíveis no seu Meta Business
3. Selecionar as contas desejadas
4. Clicar em **"Conectar"**

**Opção B: Adicionar manualmente**
1. Clicar em **"Adicionar Conta"**
2. Inserir **ID da conta** (ex: `1558732224693082`)
3. Inserir **nome da conta** (ex: "Conta Principal")
4. Clicar em **"Adicionar"**

**⏳ Aguardar**: Sistema sincronizará campanhas automaticamente (30-60s)

✅ **Pronto!** Contas adicionadas e campanhas sincronizadas.

---

### 7. Sincronizar Dados Históricos (10 minutos)

📍 **Terminal**

**Ação**: Buscar dados do ano completo de 2025

```bash
# Sincronizar todo o ano de 2025
npx supabase functions invoke sync-daily-insights \
  --data '{
    "since": "2025-01-01",
    "until": "2025-12-31",
    "maxDaysPerChunk": 30,
    "logResponseSample": true
  }'
```

**⏳ Aguardar**: Processo pode levar 5-10 minutos dependendo do volume de dados.

**Monitorar progresso**:
```bash
# Ver logs em tempo real
npx supabase functions logs sync-daily-insights --limit 50
```

**Verificar dados inseridos**:
```bash
npx tsx scripts/check-campaigns.ts
```

✅ **Pronto!** Dados históricos sincronizados.

---

### 8. Validar na Interface (5 minutos)

📍 **Interface Web**: https://www.insightfy.com.br/meta-ads-config

**Ação**: Verificar se tudo está funcionando

1. **Selecionar filtro de data**: "Ano completo - 2025" (ou período desejado)
2. **Verificar KPIs**:
   - ✅ Investimento total
   - ✅ Leads gerados
   - ✅ CPL (Custo por Lead)
   - ✅ ROAS (Retorno sobre investimento)
3. **Verificar gráfico**: Evolução diária/mensal deve aparecer
4. **Verificar tabela**: Todas as campanhas listadas com métricas

✅ **Pronto!** Sistema validado e funcionando!

---

### 9. Configurar Sincronização Automática (Opcional - 15 minutos)

📍 **Supabase SQL Editor**: https://supabase.com/dashboard/project/fjoaliipjfcnokermkhy/sql

**Ação**: Criar cron job para sync diário

Copie e execute o SQL abaixo:

```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar job diário (executa às 3h AM)
SELECT cron.schedule(
  'sync-meta-insights-daily',
  '0 3 * * *',
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
```

**Verificar cron jobs ativos**:
```sql
SELECT * FROM cron.job;
```

✅ **Pronto!** Sincronização automática configurada.

---

## 📊 Validação Final

Execute o script de validação:

```bash
npx tsx scripts/validate-production.ts
```

**Resultado esperado**:
- ✅ 9/9 checks no checklist
- ✅ Todas as verificações passando
- ✅ Dados históricos com período completo

---

## 🎯 Tempo Total Estimado

| Etapa | Tempo | Complexidade |
|-------|-------|--------------|
| 1. Meta Developer | 5 min | 🟢 Fácil |
| 2. Vercel | 10 min | 🟢 Fácil |
| 3. Supabase Secrets | 5 min | 🟡 Médio |
| 4. Deploy Edge Functions | 5 min | 🟡 Médio |
| 5. Conectar Meta | 5 min | 🟢 Fácil |
| 6. Adicionar Contas | 5 min | 🟢 Fácil |
| 7. Sync Histórico | 10 min | 🟡 Médio |
| 8. Validar UI | 5 min | 🟢 Fácil |
| 9. Cron Job (opcional) | 15 min | 🔴 Avançado |
| **TOTAL** | **50-65 min** | - |

---

## 🆘 Troubleshooting

### Problema: OAuth não funciona

**Verificar**:
1. Redirect URI está correto no Meta Developer Console
2. Variáveis `VITE_META_REDIRECT_URI` e `VITE_APP_URL` estão corretas no Vercel
3. Secrets `META_APP_ID` e `META_APP_SECRET` estão configurados no Supabase

**Logs**:
```bash
npx supabase functions logs meta-auth --limit 20
```

### Problema: Campanhas não aparecem

**Verificar**:
1. Conta foi adicionada com sucesso (ver lista de contas na UI)
2. Campanhas foram sincronizadas (ver logs)

**Logs**:
```bash
npx supabase functions logs connect-ad-account --limit 20
```

**Ação**:
- Desativar e reativar conta na UI (força nova sincronização)

### Problema: Dados históricos não sincronizam

**Verificar**:
1. Token não expirou (reconectar OAuth se necessário)
2. Rate limits do Meta API (ver logs)

**Logs**:
```bash
npx supabase functions logs sync-daily-insights --limit 50
```

**Ação**:
- Executar sync novamente com `logResponseSample: true`
- Verificar resposta do Meta API nos logs

---

## 📚 Documentação de Referência

- **Guia completo**: [GUIA_PRODUCAO_META_ADS.md](GUIA_PRODUCAO_META_ADS.md)
- **Arquitetura técnica**: [CLAUDE.md](CLAUDE.md) - Seção "Meta Ads Integration"
- **Troubleshooting**: [CLAUDE.md](CLAUDE.md) - Seção "Common Issues & Troubleshooting"

---

## ✅ Checklist Completo

```
[ ] 1. Meta Developer: Redirect URI adicionado
[ ] 2. Vercel: Variáveis de produção configuradas
[ ] 3. Supabase: Secrets configurados
[ ] 4. Edge Functions: Deployed
[ ] 5. Meta Business: Conectado via OAuth
[ ] 6. Contas de Anúncios: Adicionadas
[ ] 7. Campanhas: Sincronizadas
[ ] 8. Dados Históricos: Sincronizados (ano completo)
[ ] 9. UI: Validada (KPIs, gráficos, tabela)
[ ] 10. Cron Job: Configurado (opcional)
```

---

**🎉 Ao completar todos os passos, seu sistema estará 100% operacional em produção!**

**URL de Produção**: https://www.insightfy.com.br
**Data de Preparação**: 28/10/2025
