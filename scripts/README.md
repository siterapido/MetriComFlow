# Scripts de Meta Ads - InsightFy

## 📋 Diagnóstico

### `diagnostico-meta-ads.sql`

Script SQL para verificar o estado atual das tabelas e dados do Meta Ads.

**Como executar:**

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `diagnostico-meta-ads.sql`
4. Execute

**O que verifica:**

- ✅ Tabelas existentes (ad_sets, ads, insights)
- 📊 Contagem de registros
- 🏢 Distribuição por organização
- 📅 Últimas sincronizações
- ⚙️ Funções RPC disponíveis
- 📈 Índices criados
- 🎯 Quality rankings
- 🖼️ Criativos com thumbnail

---

## 🚀 Sincronização Inicial

### `sync-meta-initial.ts`

Script TypeScript para sincronização inicial completa de todas as contas Meta conectadas.

**Pré-requisitos:**

```bash
# Instalar tsx (executor TypeScript)
npm install -D tsx

# Ou globalmente
npm install -g tsx
```

**Variáveis de ambiente necessárias:**

```bash
# Em .env ou .env.local
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

**Como executar:**

```bash
# Sincronizar todas as contas (últimos 90 dias)
npx tsx scripts/sync-meta-initial.ts

# Sincronizar últimos 180 dias
npx tsx scripts/sync-meta-initial.ts --days=180

# Sincronizar conta específica
npx tsx scripts/sync-meta-initial.ts --account=<uuid-da-conta>

# Combinar parâmetros
npx tsx scripts/sync-meta-initial.ts --days=30 --account=<uuid>
```

**O que sincroniza:**

1. ✅ **Ad Sets** - Estrutura de conjuntos de anúncios
2. ✅ **Ads** - Criativos (imagens, vídeos, carrosséis)
3. ✅ **Métricas de Ad Sets** - Spend, impressões, cliques, leads
4. ✅ **Métricas de Ads** - Métricas por criativo + quality rankings

**Tempo estimado:**

- Conta pequena (< 10 campanhas): 2-5 minutos
- Conta média (10-50 campanhas): 5-15 minutos
- Conta grande (> 50 campanhas): 15-30 minutos

**Troubleshooting:**

**Erro: "Nenhuma conta Meta conectada"**
- Conecte uma conta primeiro em `/meta-ads-config`

**Erro: "Access token expired"**
- Reconecte a conta no Meta Ads
- Ou configure `META_ACCESS_TOKEN` global nas secrets do Supabase

**Erro: "Rate limit exceeded"**
- Script já tem delays de 2s entre requests
- Se persistir, reduza o período: `--days=30`

---

## 🔄 Sincronização Manual (Via UI)

Se preferir não usar o script, você pode sincronizar pela interface:

1. Acesse **Métricas de Tráfego** (`/metricas`)
2. Clique em **"Sincronizar"**
3. Aguarde a conclusão (toast de progresso)

A sincronização via UI executa as mesmas Edge Functions, mas com período limitado ao filtro de data selecionado.

---

## 📊 Verificação Pós-Sincronização

Após executar a sincronização inicial, verifique os dados:

```bash
# Execute o diagnóstico novamente
# (no SQL Editor do Supabase)
```

Você deve ver:

- ✅ `ad_sets` com registros > 0
- ✅ `ads` com registros > 0
- ✅ `ad_set_daily_insights` com registros > 0
- ✅ `ad_daily_insights` com registros > 0

---

## 🤖 Sincronização Automática (Futuro)

Após a sincronização inicial, configure cron jobs para manter os dados atualizados automaticamente:

**Opção 1: pg_cron (Supabase)**
- Ver migration `20251215020000_setup_meta_cron_jobs.sql`
- Executa diariamente às 2-3 AM

**Opção 2: Vercel Cron**
- Configure em `vercel.json`
- Invoca Edge Functions via HTTP

**Opção 3: GitHub Actions**
- Workflow scheduled
- Executa `sync-meta-initial.ts` diariamente

---

## 📝 Logs e Monitoramento

**Verificar logs de Edge Functions:**

```bash
# Via Supabase CLI
npx supabase functions logs sync-ad-sets --limit 50
npx supabase functions logs sync-ads --limit 50
npx supabase functions logs sync-adset-insights --limit 50
npx supabase functions logs sync-ad-insights --limit 50
```

**Ou via Dashboard:**
- Supabase Dashboard → Edge Functions → Logs

---

## 🆘 Suporte

**Problemas comuns:**

1. **Dados não aparecem na UI**
   - Execute o diagnóstico SQL
   - Verifique se há dados nas tabelas
   - Confirme que o período selecionado tem dados

2. **Sincronização muito lenta**
   - Normal para contas grandes
   - Meta API tem rate limits
   - Script já otimizado com delays

3. **Erros de autenticação**
   - Reconecte a conta Meta
   - Verifique `META_ACCESS_TOKEN` global
   - Confirme que a conta ainda tem permissões

**Documentação completa:**
- Ver `/docs/META_ADS_USAGE_GUIDE.md` (após criação)
- Ver `CLAUDE.md` seção "Meta Ads Integration"
