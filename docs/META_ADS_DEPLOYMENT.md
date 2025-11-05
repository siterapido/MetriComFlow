# Guia de Deployment - Otimizações Meta Ads

## 📋 Resumo das Melhorias Implementadas

Este documento descreve **todas as otimizações e melhorias** implementadas no sistema de Meta Ads do InsightFy, e como fazer o deployment.

### ✅ O que foi criado:

1. ✅ **Hook Unificado** (`useMetaAdsData`) - Acesso simplificado a todos os dados
2. ✅ **Componentes UI** - Quality rankings, thumbnails, status de sincronização
3. ✅ **Script de Sincronização Inicial** - Onboarding automatizado
4. ✅ **Otimizações de Banco** - Índices compostos + materialized views
5. ✅ **Cron Jobs Automáticos** - Sincronização diária automática
6. ✅ **Documentação Completa** - Guia de uso para usuários finais

---

## 🚀 Deployment - Passo a Passo

### ETAPA 1: Aplicar Migrations no Banco de Dados

**Arquivos:**
- `supabase/migrations/20251215000000_optimize_meta_indexes.sql`
- `supabase/migrations/20251215010000_create_meta_dashboard_view.sql`
- `supabase/migrations/20251215020000_setup_meta_cron_jobs.sql`

**Como aplicar:**

```bash
# Opção 1: Via Supabase CLI (recomendado)
npx supabase db push

# Opção 2: Via SQL Editor no Supabase Dashboard
# Copie e cole cada arquivo SQL manualmente
```

**Verificação:**
```sql
-- Verificar índices criados
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
ORDER BY tablename, indexname;

-- Verificar materialized views
SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';

-- Verificar cron jobs
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'sync-%';
```

---

### ETAPA 2: Configurar Variáveis de Ambiente para Cron Jobs

**IMPORTANTE**: Para os cron jobs funcionarem, você precisa configurar as variáveis de ambiente do PostgreSQL.

**Opção 1: Via SQL**

```sql
-- Substitua pelos valores reais do seu projeto
ALTER DATABASE postgres SET app.supabase_url = 'https://seu-projeto.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'sua-service-role-key';

-- Verificar configuração
SHOW app.supabase_url;
SHOW app.supabase_service_role_key;
```

**Opção 2: Via Supabase Dashboard**

1. Acesse: **Settings → Database → Custom Postgres Configuration**
2. Adicione:
   ```
   app.supabase_url = https://seu-projeto.supabase.co
   app.supabase_service_role_key = sua-service-role-key
   ```
3. Salve e reinicie o banco (se necessário)

---

### ETAPA 3: Deploy de Edge Functions (se ainda não deployadas)

**Verificar funções existentes:**
```bash
npx supabase functions list
```

**Deploy de funções necessárias:**
```bash
# Funções de sync (já devem existir)
npx supabase functions deploy sync-ad-sets
npx supabase functions deploy sync-ads
npx supabase functions deploy sync-adset-insights
npx supabase functions deploy sync-ad-insights

# Funções cron (já devem existir)
npx supabase functions deploy sync-ad-sets-cron
npx supabase functions deploy sync-ads-cron
npx supabase functions deploy sync-adset-insights-cron
npx supabase functions deploy sync-ad-insights-cron
```

**Verificar logs:**
```bash
npx supabase functions logs sync-ad-sets --limit 20
```

---

### ETAPA 4: Executar Sincronização Inicial

**Opção 1: Via Script TypeScript (recomendado)**

```bash
# Configurar variáveis de ambiente
export VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# Executar script
npx tsx scripts/sync-meta-initial.ts

# Ou com parâmetros customizados
npx tsx scripts/sync-meta-initial.ts --days=180
```

**Opção 2: Via Interface (UI)**

1. Acesse `/metricas` no navegador
2. Clique no botão **"Sincronizar"**
3. Aguarde a conclusão (toast de progresso)

**Verificação:**
```sql
-- Executar diagnóstico completo
-- Ver: scripts/diagnostico-meta-ads.sql

-- Verificação rápida
SELECT
  'ad_sets' as tabela, COUNT(*) as total FROM ad_sets
UNION ALL
SELECT 'ads', COUNT(*) FROM ads
UNION ALL
SELECT 'ad_set_daily_insights', COUNT(*) FROM ad_set_daily_insights
UNION ALL
SELECT 'ad_daily_insights', COUNT(*) FROM ad_daily_insights;
```

---

### ETAPA 5: Refresh das Materialized Views

**Primeira execução (manual):**

```sql
-- Executar função de refresh
SELECT refresh_meta_dashboard_views();

-- Verificar resultado
SELECT * FROM meta_campaigns_monthly_summary_rls LIMIT 10;
SELECT * FROM meta_top_creatives_rls LIMIT 10;
```

**Nota**: O cron job vai executar o refresh automaticamente às 4 AM diariamente.

---

### ETAPA 6: Integrar Novos Componentes na UI

**Componentes criados:**
- `src/hooks/useMetaAdsData.ts`
- `src/components/metrics/QualityRankingBadge.tsx`
- `src/components/metrics/AdThumbnailPreview.tsx`
- `src/components/metrics/SyncStatusIndicator.tsx`

**Como usar no TrafficMetrics.tsx:**

```typescript
// 1. Importar hook unificado
import { useMetaAdsData } from '@/hooks/useMetaAdsData';

// 2. Importar componentes
import { QualityRankingGroup } from '@/components/metrics/QualityRankingBadge';
import { AdThumbnailPreview } from '@/components/metrics/AdThumbnailPreview';
import { SyncStatusIndicator } from '@/components/metrics/SyncStatusIndicator';

// 3. Usar hook unificado (substitui múltiplos hooks)
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

// 4. Adicionar indicador de status
<SyncStatusIndicator
  accountId={selectedAccount}
  onSync={async () => await sync({ syncStructure: true, syncMetrics: true })}
  isSyncing={isLoading}
/>

// 5. Exibir quality rankings na tabela de ads
{metrics?.ads.map(ad => (
  <div key={ad.ad_id}>
    <AdThumbnailPreview
      imageUrl={ad.image_url}
      thumbnailUrl={ad.thumbnail_url}
      adName={ad.ad_name}
      creativeType={ad.creative_type}
    />
    <QualityRankingGroup
      qualityRanking={ad.quality_ranking}
      engagementRanking={ad.engagement_ranking}
      conversionRanking={ad.conversion_ranking}
    />
  </div>
))}
```

---

## 🔧 Configurações Opcionais

### 1. Configurar Refresh Automático de Views

**Via pg_cron (já configurado na migration):**

```sql
-- Verificar se job está ativo
SELECT * FROM cron.job WHERE jobname = 'refresh-meta-dashboard-views';

-- Forçar execução manual
SELECT refresh_meta_dashboard_views();
```

---

### 2. Ajustar Frequência de Sincronização

**Padrão**: Diária às 3 AM (últimos 7 dias)

**Alterar horário:**
```sql
-- Alterar para 2 AM
SELECT cron.schedule(
  'sync-adset-insights-daily',
  '0 2 * * *',  -- Nova hora
  $$SELECT invoke_edge_function_with_log('sync-adset-insights-daily', 'sync-adset-insights-cron')$$
);
```

**Alterar período sincronizado:**
```sql
-- Sincronizar últimos 30 dias ao invés de 7
SELECT cron.schedule(
  'sync-adset-insights-daily',
  '0 3 * * *',
  $$
  SELECT invoke_edge_function_with_log(
    'sync-adset-insights-daily',
    'sync-adset-insights-cron',
    jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '30 days')::text,
      'until', CURRENT_DATE::text
    )
  )
  $$
);
```

---

### 3. Monitorar Logs de Sincronização

**Ver logs recentes:**
```sql
SELECT
  job_name,
  status,
  records_synced,
  started_at,
  completed_at,
  completed_at - started_at as duration,
  error_message
FROM meta_sync_logs
ORDER BY started_at DESC
LIMIT 50;
```

**Ver estatísticas por job:**
```sql
SELECT
  job_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  AVG(completed_at - started_at) as avg_duration,
  SUM(records_synced) as total_records
FROM meta_sync_logs
WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY job_name
ORDER BY job_name;
```

---

## 🧪 Testes Recomendados

### Teste 1: Sincronização Manual

1. ✅ Acesse `/metricas`
2. ✅ Clique em "Sincronizar"
3. ✅ Verifique toast de progresso
4. ✅ Confirme que dados aparecem nas abas

### Teste 2: Filtros

1. ✅ Selecione uma conta específica
2. ✅ Selecione uma campanha
3. ✅ Verifique que conjuntos e criativos filtram corretamente

### Teste 3: Quality Rankings

1. ✅ Acesse aba "Criativos"
2. ✅ Verifique se badges de ranking aparecem
3. ✅ Clique em um criativo
4. ✅ Confirme que preview abre

### Teste 4: Thumbnails

1. ✅ Verifique se thumbnails carregam
2. ✅ Clique em um thumbnail
3. ✅ Confirme que modal abre com preview em tela cheia

### Teste 5: Status de Sincronização

1. ✅ Verifique indicador de status no header
2. ✅ Confirme que mostra última sincronização
3. ✅ Execute sincronização manual e veja status mudar

### Teste 6: Cron Jobs (após 24h)

1. ✅ Execute query de logs:
   ```sql
   SELECT * FROM meta_sync_logs WHERE started_at >= CURRENT_DATE;
   ```
2. ✅ Verifique se há execuções às 2 AM, 3 AM, 4 AM
3. ✅ Confirme status 'success'

---

## 📊 Monitoramento Contínuo

### Queries Úteis

**1. Verificar crescimento de dados:**
```sql
SELECT
  DATE(created_at) as data,
  COUNT(*) as novos_registros
FROM ad_daily_insights
GROUP BY DATE(created_at)
ORDER BY data DESC
LIMIT 30;
```

**2. Verificar tamanho das tabelas:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%ad%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**3. Verificar uso de índices:**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ad_set_daily_insights', 'ad_daily_insights')
ORDER BY idx_scan DESC;
```

---

## 🆘 Troubleshooting de Deployment

### Erro: "extension pg_cron not found"

**Solução:**
1. Habilite pg_cron no Supabase Dashboard:
   - Settings → Database → Extensions
   - Busque "pg_cron" e habilite
2. Ou via SQL: `CREATE EXTENSION pg_cron;`

### Erro: "function invoke_edge_function does not exist"

**Causa**: Migration de cron jobs não foi aplicada

**Solução:**
```bash
# Aplicar migration manualmente
npx supabase db push
```

### Erro: Cron jobs não executam

**Verificação:**
```sql
-- Ver jobs agendados
SELECT * FROM cron.job WHERE jobname LIKE 'sync-%';

-- Ver execuções recentes
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

**Solução:**
1. Verifique se variáveis de ambiente estão configuradas
2. Execute job manualmente: `SELECT invoke_edge_function_with_log(...)`
3. Verifique logs de erro na tabela `meta_sync_logs`

### Erro: Materialized views não atualizam

**Solução:**
```sql
-- Refresh manual
REFRESH MATERIALIZED VIEW CONCURRENTLY meta_campaigns_monthly_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY meta_top_creatives;

-- Ou via função
SELECT refresh_meta_dashboard_views();
```

---

## 📚 Documentação de Referência

- **Uso do Sistema**: `docs/META_ADS_USAGE_GUIDE.md`
- **Scripts de Sync**: `scripts/README.md`
- **Configuração Inicial**: `docs/META_ADS_SETUP.md` (se existir)
- **CLAUDE.md**: Seção "Meta Ads Integration"

---

## ✅ Checklist Final

Após deployment, confirme:

- [ ] Migrations aplicadas (3 arquivos SQL)
- [ ] Variáveis de ambiente configuradas (cron jobs)
- [ ] Edge Functions deployadas (8 funções)
- [ ] Sincronização inicial executada (dados nas tabelas)
- [ ] Materialized views atualizadas (primeiro refresh)
- [ ] Cron jobs ativos (query `cron.job`)
- [ ] Componentes UI funcionando (quality rankings, thumbnails, status)
- [ ] Logs de sincronização aparecendo (`meta_sync_logs`)
- [ ] Testes de UI passando (filtros, abas, preview)

---

**Versão**: 1.0
**Data**: Dezembro 2025
**Status**: ✅ Completo e Pronto para Produção
