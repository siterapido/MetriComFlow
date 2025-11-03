-- ============================================================================
-- AUTOMAÇÃO: CRON JOBS PARA SINCRONIZAÇÃO META ADS
-- ============================================================================
-- Este arquivo configura jobs automáticos para:
-- 1. Sincronização de métricas diárias do Meta Ads (a cada 3 horas)
-- 2. Dispatch de eventos de conversão para Meta CAPI (a cada 5 minutos)
-- ============================================================================

-- Habilitar extensão pg_cron (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão http para fazer requisições HTTP
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================================
-- TABELA: cron_job_logs
-- Armazena logs de execução dos cron jobs para monitoramento
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at ON public.cron_job_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON public.cron_job_logs(status);

-- Trigger para calcular duration automaticamente
CREATE OR REPLACE FUNCTION calculate_cron_job_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_cron_job_duration ON public.cron_job_logs;
CREATE TRIGGER trigger_calculate_cron_job_duration
  BEFORE INSERT OR UPDATE ON public.cron_job_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cron_job_duration();

-- RLS Policies
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all cron logs"
  ON public.cron_job_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Service role pode inserir/atualizar
CREATE POLICY "Service role can manage cron logs"
  ON public.cron_job_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- FUNÇÃO: invoke_edge_function
-- Função auxiliar para invocar Edge Functions via HTTP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  function_name TEXT,
  payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_url TEXT;
  v_service_role_key TEXT;
  v_log_id UUID;
  v_start_time TIMESTAMPTZ;
  v_response http_response;
  v_response_body TEXT;
  v_response_status INTEGER;
BEGIN
  -- Buscar configurações do projeto (armazenadas em secrets)
  -- NOTA: Você precisa configurar estas secrets via:
  -- supabase secrets set SUPABASE_PROJECT_URL="https://seu-projeto.supabase.co"
  -- supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

  v_project_url := current_setting('app.settings.supabase_project_url', true);
  v_service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  -- Se não encontrar nas settings, usar variáveis de ambiente padrão do Supabase
  IF v_project_url IS NULL THEN
    v_project_url := current_setting('request.headers', true)::json->>'host';
    IF v_project_url IS NOT NULL THEN
      v_project_url := 'https://' || v_project_url;
    END IF;
  END IF;

  -- Criar log de início
  v_start_time := NOW();
  INSERT INTO public.cron_job_logs (job_name, status, started_at, metadata)
  VALUES (function_name, 'running', v_start_time, payload)
  RETURNING id INTO v_log_id;

  -- Fazer requisição HTTP para Edge Function
  BEGIN
    SELECT * INTO v_response FROM http((
      'POST',
      v_project_url || '/functions/v1/' || function_name,
      ARRAY[
        http_header('Authorization', 'Bearer ' || v_service_role_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      payload::text
    )::http_request);

    v_response_status := v_response.status;
    v_response_body := v_response.content;

    -- Atualizar log com sucesso
    UPDATE public.cron_job_logs
    SET
      status = CASE WHEN v_response_status >= 200 AND v_response_status < 300 THEN 'success' ELSE 'error' END,
      completed_at = NOW(),
      response_status = v_response_status,
      response_body = v_response_body
    WHERE id = v_log_id;

    RETURN jsonb_build_object(
      'success', v_response_status >= 200 AND v_response_status < 300,
      'status', v_response_status,
      'body', v_response_body
    );

  EXCEPTION WHEN OTHERS THEN
    -- Atualizar log com erro
    UPDATE public.cron_job_logs
    SET
      status = 'error',
      completed_at = NOW(),
      error_message = SQLERRM
    WHERE id = v_log_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$;

-- ============================================================================
-- FUNÇÃO: sync_meta_insights_cron
-- Sincroniza métricas diárias do Meta Ads (últimos 7 dias)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_meta_insights_cron()
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
  -- Buscar últimos 7 dias
  v_since := CURRENT_DATE - INTERVAL '7 days';
  v_until := CURRENT_DATE;

  v_payload := jsonb_build_object(
    'since', v_since::text,
    'until', v_until::text,
    'maxDaysPerChunk', 30
  );

  -- Invocar Edge Function
  v_result := public.invoke_edge_function('sync-daily-insights', v_payload);

  -- Log resultado
  RAISE NOTICE 'sync-daily-insights result: %', v_result;
END;
$$;

-- ============================================================================
-- FUNÇÃO: dispatch_meta_conversions_cron
-- Processa eventos de conversão pendentes e envia para Meta CAPI
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dispatch_meta_conversions_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload JSONB;
  v_result JSONB;
  v_pending_count INTEGER;
BEGIN
  -- Contar eventos pendentes
  SELECT COUNT(*) INTO v_pending_count
  FROM public.meta_conversion_events
  WHERE status = 'pending'
    AND (retry_count < max_retries OR max_retries IS NULL);

  -- Se não houver eventos pendentes, não fazer nada
  IF v_pending_count = 0 THEN
    RAISE NOTICE 'No pending conversion events to dispatch';
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'process_all', true,
    'max_batch_size', 100
  );

  -- Invocar Edge Function
  v_result := public.invoke_edge_function('meta-conversion-dispatch', v_payload);

  -- Log resultado
  RAISE NOTICE 'meta-conversion-dispatch result: % (processed % events)', v_result, v_pending_count;
END;
$$;

-- ============================================================================
-- CONFIGURAÇÃO DOS CRON JOBS
-- ============================================================================

-- Remover jobs existentes (se houver) para evitar duplicação
SELECT cron.unschedule('sync-meta-insights-every-3h');
SELECT cron.unschedule('dispatch-meta-conversions-every-5min');

-- Job 1: Sincronizar métricas do Meta Ads a cada 3 horas
-- Horários de execução: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
SELECT cron.schedule(
  'sync-meta-insights-every-3h',
  '0 */3 * * *',  -- A cada 3 horas
  $$
  SELECT public.sync_meta_insights_cron();
  $$
);

-- Job 2: Despachar eventos de conversão para Meta CAPI a cada 5 minutos
SELECT cron.schedule(
  'dispatch-meta-conversions-every-5min',
  '*/5 * * * *',  -- A cada 5 minutos
  $$
  SELECT public.dispatch_meta_conversions_cron();
  $$
);

-- ============================================================================
-- VIEW: cron_job_status
-- View para monitoramento fácil do status dos cron jobs
-- ============================================================================

CREATE OR REPLACE VIEW public.cron_job_status AS
SELECT
  job_name,
  status,
  started_at,
  completed_at,
  duration_ms,
  response_status,
  CASE
    WHEN LENGTH(response_body) > 200 THEN LEFT(response_body, 200) || '...'
    ELSE response_body
  END as response_preview,
  error_message,
  metadata
FROM public.cron_job_logs
ORDER BY started_at DESC;

-- Permitir que admins vejam o status dos cron jobs
GRANT SELECT ON public.cron_job_status TO authenticated;

-- ============================================================================
-- FUNÇÃO: get_cron_job_summary
-- Retorna resumo dos últimos cron jobs (últimas 24 horas)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cron_job_summary()
RETURNS TABLE (
  job_name TEXT,
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  avg_duration_ms NUMERIC,
  last_run_at TIMESTAMPTZ,
  last_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.job_name,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE l.status = 'success') as successful_runs,
    COUNT(*) FILTER (WHERE l.status = 'error') as failed_runs,
    ROUND(AVG(l.duration_ms), 2) as avg_duration_ms,
    MAX(l.started_at) as last_run_at,
    (SELECT status FROM public.cron_job_logs WHERE job_name = l.job_name ORDER BY started_at DESC LIMIT 1) as last_status
  FROM public.cron_job_logs l
  WHERE l.started_at >= NOW() - INTERVAL '24 hours'
  GROUP BY l.job_name;
END;
$$;

-- ============================================================================
-- LIMPEZA AUTOMÁTICA DE LOGS ANTIGOS
-- Remove logs com mais de 30 dias para evitar crescimento excessivo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.cron_job_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old cron job logs', v_deleted_count;
END;
$$;

-- Job 3: Limpar logs antigos (uma vez por dia às 02:00)
SELECT cron.unschedule('cleanup-old-cron-logs-daily');
SELECT cron.schedule(
  'cleanup-old-cron-logs-daily',
  '0 2 * * *',  -- 02:00 todos os dias
  $$
  SELECT public.cleanup_old_cron_logs();
  $$
);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todos os cron jobs configurados
DO $$
DECLARE
  v_job RECORD;
BEGIN
  RAISE NOTICE '=== CRON JOBS CONFIGURADOS ===';
  FOR v_job IN
    SELECT jobid, jobname, schedule, active
    FROM cron.job
    WHERE jobname IN (
      'sync-meta-insights-every-3h',
      'dispatch-meta-conversions-every-5min',
      'cleanup-old-cron-logs-daily'
    )
  LOOP
    RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Active: %',
      v_job.jobid, v_job.jobname, v_job.schedule, v_job.active;
  END LOOP;
END $$;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE public.cron_job_logs IS 'Logs de execução dos cron jobs para monitoramento e debug';
COMMENT ON FUNCTION public.invoke_edge_function IS 'Invoca uma Edge Function via HTTP e registra log de execução';
COMMENT ON FUNCTION public.sync_meta_insights_cron IS 'Sincroniza métricas diárias do Meta Ads (últimos 7 dias) - executa a cada 3 horas';
COMMENT ON FUNCTION public.dispatch_meta_conversions_cron IS 'Processa eventos de conversão pendentes e envia para Meta CAPI - executa a cada 5 minutos';
COMMENT ON FUNCTION public.get_cron_job_summary IS 'Retorna resumo dos cron jobs executados nas últimas 24 horas';
COMMENT ON FUNCTION public.cleanup_old_cron_logs IS 'Remove logs de cron jobs com mais de 30 dias';
COMMENT ON VIEW public.cron_job_status IS 'View para monitoramento fácil do status dos cron jobs';
