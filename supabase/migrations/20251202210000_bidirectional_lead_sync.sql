-- ============================================================================
-- SINCRONIZAÇÃO BIDIRECIONAL DE LEADS: META ADS ↔ CRM
-- ============================================================================
-- Este arquivo adiciona sincronização automática de leads do Meta para o CRM
-- Garante que TODOS os leads do Meta apareçam no CRM, não apenas os do webhook
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: fetch_meta_leads_cron
-- Busca leads do Meta API e insere no CRM (deduplicação automática)
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
  -- Buscar leads dos últimos 3 dias (overlap para garantir que não perca nenhum)
  v_since := CURRENT_DATE - INTERVAL '3 days';
  v_until := CURRENT_DATE;

  v_payload := jsonb_build_object(
    'since', v_since::text,
    'until', v_until::text,
    'limit', 100  -- Max 100 leads por conta por execução
  );

  -- Invocar Edge Function
  v_result := public.invoke_edge_function('fetch-meta-leads', v_payload);

  -- Log resultado
  RAISE NOTICE 'fetch-meta-leads result: %', v_result;
END;
$$;
COMMENT ON FUNCTION public.fetch_meta_leads_cron IS 'Sincroniza leads do Meta Ads API para o CRM (últimos 3 dias) - executa a cada 6 horas';
-- ============================================================================
-- CONFIGURAÇÃO DO CRON JOB
-- ============================================================================

-- Remover job existente (se houver) para evitar duplicação
DO $$
BEGIN
  PERFORM cron.unschedule('fetch-meta-leads-every-6h');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;
-- Job 4: Buscar leads do Meta Ads API a cada 6 horas
-- Horários de execução: 00:00, 06:00, 12:00, 18:00
SELECT cron.schedule(
  'fetch-meta-leads-every-6h',
  '0 */6 * * *',  -- A cada 6 horas
  $$
  SELECT public.fetch_meta_leads_cron();
  $$
);
-- ============================================================================
-- TABELA: meta_lead_sync_log
-- Rastreia sincronizações de leads do Meta para análise e debug
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meta_lead_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  leads_fetched INTEGER DEFAULT 0,
  leads_inserted INTEGER DEFAULT 0,
  leads_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  sync_params JSONB,  -- Store since, until, limit
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Índices
CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_account ON public.meta_lead_sync_log(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_started_at ON public.meta_lead_sync_log(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_lead_sync_log_status ON public.meta_lead_sync_log(status);
-- RLS Policies
ALTER TABLE public.meta_lead_sync_log ENABLE ROW LEVEL SECURITY;
-- Owners podem ver todos os logs
CREATE POLICY "Owners can view all sync logs"
  ON public.meta_lead_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'owner'
    )
  );
-- Service role pode inserir/atualizar
CREATE POLICY "Service role can manage sync logs"
  ON public.meta_lead_sync_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
COMMENT ON TABLE public.meta_lead_sync_log IS 'Rastreia sincronizações de leads do Meta Ads API para o CRM';
-- ============================================================================
-- VIEW: meta_lead_sync_summary
-- Resumo das sincronizações de leads (últimas 24 horas)
-- ============================================================================

CREATE OR REPLACE VIEW public.meta_lead_sync_summary AS
SELECT
  DATE_TRUNC('hour', sync_started_at) as sync_hour,
  COUNT(*) as total_syncs,
  SUM(leads_fetched) as total_fetched,
  SUM(leads_inserted) as total_inserted,
  SUM(leads_skipped) as total_skipped,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
  AVG(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))) as avg_duration_seconds
FROM public.meta_lead_sync_log
WHERE sync_started_at >= NOW() - INTERVAL '24 hours'
GROUP BY sync_hour
ORDER BY sync_hour DESC;
GRANT SELECT ON public.meta_lead_sync_summary TO authenticated;
-- ============================================================================
-- FUNÇÃO: get_lead_sync_stats
-- Retorna estatísticas de sincronização de leads por conta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_lead_sync_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  ad_account_id UUID,
  account_name TEXT,
  total_syncs BIGINT,
  leads_fetched BIGINT,
  leads_inserted BIGINT,
  leads_skipped BIGINT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.ad_account_id,
    a.business_name as account_name,
    COUNT(*) as total_syncs,
    SUM(l.leads_fetched) as leads_fetched,
    SUM(l.leads_inserted) as leads_inserted,
    SUM(l.leads_skipped) as leads_skipped,
    MAX(l.sync_started_at) as last_sync_at,
    (
      SELECT status FROM public.meta_lead_sync_log
      WHERE ad_account_id = l.ad_account_id
      ORDER BY sync_started_at DESC
      LIMIT 1
    ) as last_sync_status
  FROM public.meta_lead_sync_log l
  LEFT JOIN public.ad_accounts a ON a.id = l.ad_account_id
  WHERE l.sync_started_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY l.ad_account_id, a.business_name;
END;
$$;
COMMENT ON FUNCTION public.get_lead_sync_stats IS 'Retorna estatísticas de sincronização de leads por conta (últimas N horas)';
-- ============================================================================
-- ÍNDICE: leads.external_lead_id (para deduplicação rápida)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_external_lead_id ON public.leads(external_lead_id)
WHERE external_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_organization ON public.leads(source, organization_id)
WHERE source = 'meta_ads';
-- ============================================================================
-- FUNÇÃO DE LIMPEZA: cleanup_old_lead_sync_logs
-- Remove logs com mais de 90 dias
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_lead_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.meta_lead_sync_log
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old lead sync logs', v_deleted_count;
END;
$$;
-- Agendar limpeza semanal (domingos às 03:00)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-lead-sync-logs-weekly');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;
SELECT cron.schedule(
  'cleanup-old-lead-sync-logs-weekly',
  '0 3 * * 0',  -- Domingos às 03:00
  $$
  SELECT public.cleanup_old_lead_sync_logs();
  $$
);
-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todos os cron jobs relacionados a Meta Ads
DO $$
DECLARE
  v_job RECORD;
BEGIN
  RAISE NOTICE '=== META ADS CRON JOBS ===';
  FOR v_job IN
    SELECT jobid, jobname, schedule, active
    FROM cron.job
    WHERE jobname IN (
      'sync-meta-insights-every-3h',
      'dispatch-meta-conversions-every-5min',
      'fetch-meta-leads-every-6h',
      'cleanup-old-lead-sync-logs-weekly'
    )
  LOOP
    RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Active: %',
      v_job.jobid, v_job.jobname, v_job.schedule, v_job.active;
  END LOOP;
END $$;
-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION public.fetch_meta_leads_cron IS
'Busca leads do Meta Ads API dos últimos 3 dias e insere no CRM. Executa a cada 6 horas (00:00, 06:00, 12:00, 18:00). Deduplicação automática via external_lead_id. Garante que leads que chegam fora do webhook também sejam sincronizados.';
-- ============================================================================
-- QUERY DE TESTE (comentada)
-- ============================================================================

/*
-- Testar função manualmente
SELECT public.fetch_meta_leads_cron();

-- Ver logs recentes
SELECT * FROM public.cron_job_logs
WHERE job_name = 'fetch-meta-leads'
ORDER BY started_at DESC
LIMIT 5;

-- Ver estatísticas de sincronização
SELECT * FROM public.get_lead_sync_stats(24);

-- Ver resumo por hora
SELECT * FROM public.meta_lead_sync_summary;

-- Contar leads do Meta no CRM
SELECT COUNT(*) as total_meta_leads
FROM public.leads
WHERE source = 'meta_ads';

-- Contar leads por campanha
SELECT
  c.name as campaign_name,
  COUNT(l.id) as lead_count
FROM public.leads l
JOIN public.ad_campaigns c ON c.id = l.campaign_id
WHERE l.source = 'meta_ads'
  AND l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.name
ORDER BY lead_count DESC;
*/;
