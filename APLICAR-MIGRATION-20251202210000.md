# 🚀 Aplicar Migration: Sincronização Bidirecional de Leads

## Instruções para Aplicar a Migration

### Passo 1: Acessar Supabase SQL Editor

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecionar seu projeto
3. No menu lateral, clicar em **"SQL Editor"**
4. Clicar em **"New Query"**

---

### Passo 2: Copiar e Colar a Migration

Copie TODO o conteúdo do arquivo:
```
supabase/migrations/20251202210000_bidirectional_lead_sync.sql
```

**Ou use o conteúdo abaixo** (já está pronto para copiar):

```sql
-- ============================================================================
-- SINCRONIZAÇÃO BIDIRECIONAL DE LEADS: META ADS ↔ CRM
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fetch_meta_leads_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_since DATE;
  v_until DATE;
  v_payload JSONB;
  v_result JSONB;
BEGIN
  v_since := CURRENT_DATE - INTERVAL '3 days';
  v_until := CURRENT_DATE;
  v_payload := jsonb_build_object('since', v_since::text, 'until', v_until::text, 'limit', 100);
  v_result := public.invoke_edge_function('fetch-meta-leads', v_payload);
  RAISE NOTICE 'fetch-meta-leads result: %', v_result;
END;
$$;

SELECT cron.unschedule('fetch-meta-leads-every-6h');
SELECT cron.schedule('fetch-meta-leads-every-6h', '0 */6 * * *', $$ SELECT public.fetch_meta_leads_cron(); $$);

CREATE TABLE IF NOT EXISTS public.meta_lead_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  leads_fetched INTEGER DEFAULT 0,
  leads_inserted INTEGER DEFAULT 0,
  leads_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  sync_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_account ON public.meta_lead_sync_log(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_started_at ON public.meta_lead_sync_log(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_status ON public.meta_lead_sync_log(status);

ALTER TABLE public.meta_lead_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all sync logs" ON public.meta_lead_sync_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'));
CREATE POLICY "Service role can manage sync logs" ON public.meta_lead_sync_log FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE OR REPLACE VIEW public.meta_lead_sync_summary AS
SELECT DATE_TRUNC('hour', sync_started_at) as sync_hour, COUNT(*) as total_syncs, SUM(leads_fetched) as total_fetched, SUM(leads_inserted) as total_inserted, SUM(leads_skipped) as total_skipped, COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs, COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs, AVG(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))) as avg_duration_seconds
FROM public.meta_lead_sync_log WHERE sync_started_at >= NOW() - INTERVAL '24 hours' GROUP BY sync_hour ORDER BY sync_hour DESC;

GRANT SELECT ON public.meta_lead_sync_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_lead_sync_stats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (ad_account_id UUID, account_name TEXT, total_syncs BIGINT, leads_fetched BIGINT, leads_inserted BIGINT, leads_skipped BIGINT, last_sync_at TIMESTAMPTZ, last_sync_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT l.ad_account_id, a.business_name as account_name, COUNT(*) as total_syncs, SUM(l.leads_fetched) as leads_fetched, SUM(l.leads_inserted) as leads_inserted, SUM(l.leads_skipped) as leads_skipped, MAX(l.sync_started_at) as last_sync_at, (SELECT status FROM public.meta_lead_sync_log WHERE ad_account_id = l.ad_account_id ORDER BY sync_started_at DESC LIMIT 1) as last_sync_status
  FROM public.meta_lead_sync_log l LEFT JOIN public.ad_accounts a ON a.id = l.ad_account_id WHERE l.sync_started_at >= NOW() - (p_hours || ' hours')::INTERVAL GROUP BY l.ad_account_id, a.business_name;
END; $$;

CREATE INDEX IF NOT EXISTS idx_leads_external_lead_id ON public.leads(external_lead_id) WHERE external_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_organization ON public.leads(source, organization_id) WHERE source = 'meta_ads';

CREATE OR REPLACE FUNCTION public.cleanup_old_lead_sync_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_deleted_count INTEGER;
BEGIN DELETE FROM public.meta_lead_sync_log WHERE created_at < NOW() - INTERVAL '90 days'; GET DIAGNOSTICS v_deleted_count = ROW_COUNT; RAISE NOTICE 'Cleaned up % old lead sync logs', v_deleted_count; END; $$;

SELECT cron.unschedule('cleanup-old-lead-sync-logs-weekly');
SELECT cron.schedule('cleanup-old-lead-sync-logs-weekly', '0 3 * * 0', $$ SELECT public.cleanup_old_lead_sync_logs(); $$);
```

---

### Passo 3: Executar

1. Clicar no botão **"Run"** (ou `Ctrl/Cmd + Enter`)
2. Aguardar execução (~5 segundos)
3. Verificar mensagens na parte inferior

**Output Esperado**:
```
NOTICE: === META ADS CRON JOBS ===
NOTICE: Job ID: X, Name: sync-meta-insights-every-3h, Schedule: 0 */3 * * *, Active: t
NOTICE: Job ID: Y, Name: dispatch-meta-conversions-every-5min, Schedule: */5 * * * *, Active: t
NOTICE: Job ID: Z, Name: fetch-meta-leads-every-6h, Schedule: 0 */6 * * *, Active: t
NOTICE: Job ID: W, Name: cleanup-old-lead-sync-logs-weekly, Schedule: 0 3 * * 0, Active: t
```

---

### Passo 4: Verificar Instalação

Execute esta query para confirmar que tudo foi criado:

```sql
-- Verificar cron jobs
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%meta%' OR jobname LIKE '%lead%'
ORDER BY jobname;

-- Deve retornar 4 jobs:
-- 1. cleanup-old-lead-sync-logs-weekly
-- 2. dispatch-meta-conversions-every-5min
-- 3. fetch-meta-leads-every-6h ← NOVO
-- 4. sync-meta-insights-every-3h
```

Se retornar **4 linhas**, a migration foi aplicada com sucesso! ✅

---

### Passo 5: Testar Execução Manual

Execute o novo job manualmente para testar:

```sql
SELECT public.fetch_meta_leads_cron();
```

Aguarde ~10 segundos e verifique os logs:

```sql
SELECT * FROM public.cron_job_logs
WHERE job_name = 'fetch-meta-leads'
ORDER BY started_at DESC
LIMIT 5;
```

---

## ✅ Checklist de Verificação

Após executar a migration, confirme:

- [ ] 4 cron jobs ativos em `cron.job`
- [ ] Tabela `meta_lead_sync_log` existe
- [ ] View `meta_lead_sync_summary` existe
- [ ] Função `get_lead_sync_stats()` existe
- [ ] Teste manual executou sem erros
- [ ] Logs aparecem em `cron_job_logs`

---

## 🎯 Próximo Passo

Depois de aplicar a migration:

1. ✅ Abrir `/meta-ads-config` no navegador
2. ✅ Rolar até "Monitoramento de Jobs Automáticos"
3. ✅ Aba "Executar Manualmente"
4. ✅ Ver o 3º card: **"Sincronização de Leads"**
5. ✅ Clicar "Executar Agora" para testar via UI

---

## 🚨 Troubleshooting

### Erro: "relation cron.job does not exist"
**Causa**: Extensão pg_cron não habilitada
**Solução**: Executar primeiro a migration `20251202200000_automation_cron_jobs.sql`

### Erro: "function invoke_edge_function does not exist"
**Causa**: Migration anterior não foi aplicada
**Solução**: Aplicar migration `20251202200000_automation_cron_jobs.sql` primeiro

### Erro: "extension uuid-ossp does not exist"
**Causa**: Extensão UUID não habilitada
**Solução**: Executar `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` antes

---

## 📚 Documentação

Para mais detalhes, consulte:
- [SPRINT1-COMPLETO.md](SPRINT1-COMPLETO.md) - Resumo completo do Sprint 1
- [docs/CRON_JOBS_SETUP.md](docs/CRON_JOBS_SETUP.md) - Setup e troubleshooting

---

**Última Atualização**: 2025-12-02
**Status**: ✅ Pronto para Aplicar
