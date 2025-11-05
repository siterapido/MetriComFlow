# 🚀 Guia de Aplicação em Produção - Meta Ads

## ⚠️ IMPORTANTE: Por que as alterações não aparecem?

Mesmo após o merge, você precisa aplicar manualmente:
1. ✅ Migrations do banco de dados (3 arquivos SQL)
2. ✅ Configurar variáveis de ambiente do PostgreSQL
3. ✅ Executar sincronização inicial
4. ✅ (Opcional) Integrar componentes novos na UI

---

## 📋 CHECKLIST DE APLICAÇÃO

### ☑️ 1. Aplicar Migrations no Supabase

**CRÍTICO:** As 3 migrations SQL devem ser executadas NA ORDEM:

#### Migration 1: Índices Compostos (Performance)

1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql/new
2. Copie e cole o conteúdo de:
   ```
   supabase/migrations/20251215000000_optimize_meta_indexes.sql
   ```
3. Clique em **Run**
4. Aguarde conclusão (pode demorar 30-60 segundos)

**Verificação:**
```sql
-- Execute para verificar se índices foram criados
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
  AND indexname LIKE 'idx_%composite%';
```

✅ **Resultado esperado:** Deve mostrar 2 índices compostos

---

#### Migration 2: Materialized Views (Cache)

1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql/new
2. Copie e cole o conteúdo de:
   ```
   supabase/migrations/20251215010000_create_meta_dashboard_view.sql
   ```
3. Clique em **Run**
4. Aguarde conclusão

**Verificação:**
```sql
-- Execute para verificar se views foram criadas
SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';
```

✅ **Resultado esperado:** Deve mostrar `meta_campaigns_monthly_summary` e `meta_top_creatives`

**IMPORTANTE - Primeiro Refresh:**
```sql
-- Execute APÓS criar as views
SELECT refresh_meta_dashboard_views();
```

---

#### Migration 3: Cron Jobs (Automação)

**ANTES DE EXECUTAR:** Configure variáveis de ambiente!

1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/settings/database
2. Vá em **Custom Postgres Configuration**
3. Adicione:
   ```
   app.supabase_url = https://seu-projeto.supabase.co
   app.supabase_service_role_key = sua-service-role-key
   ```
4. **Salve e reinicie o banco** (se solicitado)

5. Agora execute a migration:
   - Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql/new
   - Copie e cole o conteúdo de:
     ```
     supabase/migrations/20251215020000_setup_meta_cron_jobs.sql
     ```
   - Clique em **Run**

**Verificação:**
```sql
-- Execute para verificar cron jobs
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'sync-%'
ORDER BY jobname;
```

✅ **Resultado esperado:** Deve mostrar 5 cron jobs (sync-ad-sets-daily, sync-ads-daily, etc.)

---

### ☑️ 2. Executar Sincronização Inicial

**Opção A: Via UI (Recomendado)**

1. Acesse: https://seu-dominio.vercel.app/metricas
2. Clique no botão **"Sincronizar"**
3. Aguarde a conclusão (toast de progresso)
4. Verifique se dados aparecem nas abas

**Opção B: Via Script (Mais completo)**

```bash
# Configure variáveis
export VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# Execute sincronização
npx tsx scripts/sync-meta-initial.ts

# Ou com parâmetros
npx tsx scripts/sync-meta-initial.ts --days=90
```

**Verificação:**
```sql
-- Execute no SQL Editor
SELECT
  'ad_sets' as tabela, COUNT(*) as total FROM ad_sets
UNION ALL
SELECT 'ads', COUNT(*) FROM ads
UNION ALL
SELECT 'ad_set_daily_insights', COUNT(*) FROM ad_set_daily_insights
UNION ALL
SELECT 'ad_daily_insights', COUNT(*) FROM ad_daily_insights;
```

✅ **Resultado esperado:** Todos devem ter registros > 0

---

### ☑️ 3. Verificar Variáveis de Ambiente na Vercel

Acesse: https://vercel.com/[seu-projeto]/settings/environment-variables

**Variáveis OBRIGATÓRIAS:**
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_APP_URL` (URL de produção)
- ✅ `VITE_META_REDIRECT_URI` (URL de produção + /metricas)

**Se faltando alguma:**
1. Adicione a variável
2. Force novo deploy: Settings → Deployments → [último deploy] → Redeploy

---

### ☑️ 4. (Opcional) Integrar Componentes Novos na UI

Os componentes foram criados mas NÃO foram integrados automaticamente no `TrafficMetrics.tsx`.

**Para usar os componentes novos:**

1. Abra: `src/pages/TrafficMetrics.tsx`

2. Adicione os imports:
```typescript
// Novos componentes
import { useMetaAdsData } from '@/hooks/useMetaAdsData';
import { QualityRankingGroup } from '@/components/metrics/QualityRankingBadge';
import { AdThumbnailPreview } from '@/components/metrics/AdThumbnailPreview';
import { SyncStatusIndicator } from '@/components/metrics/SyncStatusIndicator';
```

3. Substitua os hooks antigos pelo unificado:
```typescript
// ANTES (múltiplos hooks)
const { data: campaigns } = useAdCampaigns(...);
const { data: adSets } = useAdSets(...);
const { data: ads } = useAds(...);
const { data: metrics } = useAdSetMetrics(...);

// DEPOIS (hook unificado)
const {
  campaigns,
  adSets,
  ads,
  metrics,
  summary,
  isLoading,
  sync,
} = useMetaAdsData({
  accountId: selectedAccount === 'all' ? undefined : selectedAccount,
  campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
  adSetId: selectedAdSet === 'all' ? undefined : selectedAdSet,
  dateRange,
});
```

4. Adicione o indicador de status:
```typescript
// No header da página
<SyncStatusIndicator
  accountId={selectedAccount}
  onSync={async () => await sync({ syncStructure: true, syncMetrics: true })}
  isSyncing={isLoading}
/>
```

5. Adicione quality rankings na tabela de criativos:
```typescript
{metrics?.ads.map(ad => (
  <TableRow key={ad.ad_id}>
    <TableCell>
      <AdThumbnailPreview
        imageUrl={ad.image_url}
        thumbnailUrl={ad.thumbnail_url}
        adName={ad.ad_name}
        creativeType={ad.creative_type}
      />
    </TableCell>
    <TableCell>{ad.ad_name}</TableCell>
    <TableCell>
      <QualityRankingGroup
        qualityRanking={ad.quality_ranking}
        engagementRanking={ad.engagement_ranking}
        conversionRanking={ad.conversion_ranking}
        layout="horizontal"
        size="sm"
      />
    </TableCell>
    {/* ... outras células */}
  </TableRow>
))}
```

6. Commit e push:
```bash
git add src/pages/TrafficMetrics.tsx
git commit -m "feat(ui): integrate new Meta Ads components"
git push
```

---

## 🧪 Verificação Final

Após aplicar tudo, verifique:

### 1. Performance de Queries
```sql
-- Esta query deve ser RÁPIDA (< 1 segundo)
SELECT
  ad_set_id,
  SUM(spend) as total_spend,
  SUM(leads_count) as total_leads
FROM ad_set_daily_insights
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY ad_set_id
ORDER BY total_spend DESC
LIMIT 10;
```

### 2. Materialized Views
```sql
-- Deve retornar dados
SELECT * FROM meta_campaigns_monthly_summary_rls
WHERE month >= '2025-01-01'
LIMIT 5;
```

### 3. Cron Jobs (após 24h)
```sql
-- Deve mostrar execuções automáticas
SELECT
  job_name,
  status,
  started_at,
  completed_at
FROM meta_sync_logs
WHERE started_at >= CURRENT_DATE
ORDER BY started_at DESC;
```

### 4. UI em Produção

1. Acesse: https://seu-dominio.vercel.app/metricas
2. Verifique:
   - ✅ Dados de campanhas aparecem
   - ✅ Filtros funcionam
   - ✅ Abas (Campanhas, Conjuntos, Criativos) funcionam
   - ✅ Sincronização manual funciona
   - ✅ (Se integrado) Quality rankings aparecem
   - ✅ (Se integrado) Thumbnails abrem preview

---

## 🆘 Troubleshooting

### Erro: "extension pg_cron not found"

**Solução:**
1. Acesse: Settings → Database → Extensions
2. Busque "pg_cron"
3. Clique em "Enable"

### Erro: "function invoke_edge_function does not exist"

**Causa:** Migration 3 não foi executada

**Solução:** Execute a migration `20251215020000_setup_meta_cron_jobs.sql`

### Erro: Cron jobs não executam

**Verificação:**
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**Causas comuns:**
- Variáveis de ambiente não configuradas
- Service role key inválida
- Edge Functions não deployadas

**Solução:**
1. Verifique variáveis: `SHOW app.supabase_url;`
2. Execute job manualmente:
   ```sql
   SELECT invoke_edge_function_with_log('manual-test', 'sync-ad-sets-cron');
   ```
3. Verifique logs em `meta_sync_logs`

### Performance não melhorou

**Verificação:**
```sql
-- Ver se índices estão sendo usados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans
FROM pg_stat_user_indexes
WHERE tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
ORDER BY idx_scan DESC;
```

**Se `idx_scan` = 0:** Índices não estão sendo usados

**Solução:**
```sql
ANALYZE ad_set_daily_insights;
ANALYZE ad_daily_insights;
```

---

## 📊 Resumo de Tempo

| Etapa | Tempo Estimado |
|-------|----------------|
| Aplicar Migration 1 (índices) | 1-2 min |
| Aplicar Migration 2 (views) | 2-3 min |
| Aplicar Migration 3 (cron jobs) | 2-3 min |
| Sincronização inicial | 5-10 min |
| Integração UI (opcional) | 15-30 min |
| **TOTAL** | **25-45 min** |

---

## ✅ Checklist Final

Após completar tudo, marque:

- [ ] Migration 1 aplicada (índices criados)
- [ ] Migration 2 aplicada (views criadas + primeiro refresh)
- [ ] Migration 3 aplicada (cron jobs ativos)
- [ ] Variáveis de ambiente configuradas (PostgreSQL + Vercel)
- [ ] Sincronização inicial executada (dados nas tabelas)
- [ ] Queries de performance testadas (< 1 segundo)
- [ ] UI testada em produção (filtros funcionam)
- [ ] (Opcional) Componentes novos integrados
- [ ] Cron jobs executando (verificar após 24h)

---

**Dúvidas?** Consulte:
- `docs/META_ADS_DEPLOYMENT.md` (guia completo)
- `IMPLEMENTATION_SUMMARY.md` (resumo executivo)
- `scripts/diagnostico-meta-ads.sql` (diagnóstico de dados)
