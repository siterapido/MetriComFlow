-- ============================================================================
-- Migration: Configuração de Cron Jobs para Meta Ads
-- Data: 2025-12-15
-- Descrição: Configura sincronização automática diária via pg_cron
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HABILITAR EXTENSÃO PG_CRON (se ainda não estiver)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. CONFIGURAR VARIÁVEIS DE AMBIENTE (via ALTER DATABASE)
-- ============================================================================

-- IMPORTANTE: Você precisa configurar essas variáveis manualmente antes!
-- Opção 1: Via SQL (substitua os valores)
/*
ALTER DATABASE postgres SET app.supabase_url = 'https://seu-projeto.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'sua-service-role-key';
*/

-- Opção 2: Via Supabase Dashboard
-- Settings → Database → Custom Postgres Configuration
-- Adicione:
-- app.supabase_url = https://seu-projeto.supabase.co
-- app.supabase_service_role_key = sua-service-role-key

-- ============================================================================
-- 3. FUNÇÃO AUXILIAR: Invocar Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_edge_function(
  function_name TEXT,
  payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  result JSONB;
BEGIN
  -- Obter variáveis de configuração
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Variáveis de ambiente não configuradas. Configure app.supabase_url e app.supabase_service_role_key';
  END IF;

  -- Invocar Edge Function via net.http_post
  SELECT content::jsonb INTO result
  FROM net.http_post(
    url := supabase_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := payload
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao invocar Edge Function %: %', function_name, SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION invoke_edge_function IS
  'Função auxiliar para invocar Edge Functions via HTTP';

-- ============================================================================
-- 4. CRON JOBS - SINCRONIZAÇÃO DIÁRIA
-- ============================================================================

-- JOB 1: Sincronizar Ad Sets (diário, 2:00 AM)
DO $$
BEGIN
  -- Remover job se já existir
  PERFORM cron.unschedule('sync-ad-sets-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ad-sets-daily',
  '0 2 * * *',  -- 2 AM todos os dias
  $$SELECT invoke_edge_function('sync-ad-sets-cron')$$
);

-- JOB 2: Sincronizar Ads/Criativos (diário, 2:30 AM)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ads-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ads-daily',
  '30 2 * * *',  -- 2:30 AM todos os dias
  $$SELECT invoke_edge_function('sync-ads-cron')$$
);

-- JOB 3: Sincronizar Métricas de Ad Sets (diário, 3:00 AM)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-adset-insights-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-adset-insights-daily',
  '0 3 * * *',  -- 3 AM todos os dias
  $$
  SELECT invoke_edge_function(
    'sync-adset-insights-cron',
    jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  )
  $$
);

-- JOB 4: Sincronizar Métricas de Ads (diário, 3:30 AM)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ad-insights-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ad-insights-daily',
  '30 3 * * *',  -- 3:30 AM todos os dias
  $$
  SELECT invoke_edge_function(
    'sync-ad-insights-cron',
    jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  )
  $$
);

-- JOB 5: Refresh Materialized Views (diário, 4:00 AM)
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-meta-dashboard-views');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-meta-dashboard-views',
  '0 4 * * *',  -- 4 AM todos os dias
  $$SELECT refresh_meta_dashboard_views()$$
);

-- ============================================================================
-- 5. TABELA DE LOG DE SINCRONIZAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  function_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'success', 'error')),
  error_message TEXT,
  records_synced INT,
  payload JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_job_started
  ON meta_sync_logs(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_status
  ON meta_sync_logs(status, started_at DESC);

-- RLS (apenas service role pode inserir)
ALTER TABLE meta_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sync logs"
  ON meta_sync_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Authenticated users can view logs from their org
CREATE POLICY "Users can view their org sync logs"
  ON meta_sync_logs FOR SELECT
  USING (true);  -- Logs são globais, mas podemos adicionar filtro por org se necessário

COMMENT ON TABLE meta_sync_logs IS
  'Log de execuções de sincronização automática do Meta Ads';

-- ============================================================================
-- 6. FUNÇÃO MELHORADA: Invocar com Log
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_edge_function_with_log(
  job_name TEXT,
  function_name TEXT,
  payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  log_id UUID;
  result JSONB;
  error_msg TEXT;
BEGIN
  -- Criar log de início
  INSERT INTO meta_sync_logs (job_name, function_name, status, payload)
  VALUES (job_name, function_name, 'running', payload)
  RETURNING id INTO log_id;

  -- Invocar função
  BEGIN
    result := invoke_edge_function(function_name, payload);

    -- Atualizar log de sucesso
    UPDATE meta_sync_logs
    SET
      status = 'success',
      completed_at = NOW(),
      result = result,
      records_synced = COALESCE((result->>'synced_records')::int, (result->>'synced_ad_sets')::int, (result->>'synced_ads')::int, 0)
    WHERE id = log_id;

    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      error_msg := SQLERRM;

      -- Atualizar log de erro
      UPDATE meta_sync_logs
      SET
        status = 'error',
        completed_at = NOW(),
        error_message = error_msg
      WHERE id = log_id;

      RAISE WARNING 'Erro ao executar job %: %', job_name, error_msg;
      RETURN jsonb_build_object('error', error_msg);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ATUALIZAR CRON JOBS PARA USAR LOGS
-- ============================================================================

-- Atualizar jobs existentes para usar função com log

-- JOB 1 (com log)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ad-sets-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ad-sets-daily',
  '0 2 * * *',
  $$SELECT invoke_edge_function_with_log('sync-ad-sets-daily', 'sync-ad-sets-cron')$$
);

-- JOB 2 (com log)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ads-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ads-daily',
  '30 2 * * *',
  $$SELECT invoke_edge_function_with_log('sync-ads-daily', 'sync-ads-cron')$$
);

-- JOB 3 (com log)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-adset-insights-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-adset-insights-daily',
  '0 3 * * *',
  $$
  SELECT invoke_edge_function_with_log(
    'sync-adset-insights-daily',
    'sync-adset-insights-cron',
    jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  )
  $$
);

-- JOB 4 (com log)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ad-insights-daily');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-ad-insights-daily',
  '30 3 * * *',
  $$
  SELECT invoke_edge_function_with_log(
    'sync-ad-insights-daily',
    'sync-ad-insights-cron',
    jsonb_build_object(
      'since', (CURRENT_DATE - INTERVAL '7 days')::text,
      'until', CURRENT_DATE::text
    )
  )
  $$
);

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO DOS CRON JOBS
-- ============================================================================

-- Query para listar todos os cron jobs criados
-- Execute separadamente após a migration:

/*
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE 'sync-%' OR jobname LIKE 'refresh-%'
ORDER BY jobname;

-- Verificar últimos logs de sincronização
SELECT
  job_name,
  function_name,
  status,
  records_synced,
  started_at,
  completed_at,
  completed_at - started_at as duration,
  error_message
FROM meta_sync_logs
ORDER BY started_at DESC
LIMIT 20;

-- Forçar execução manual de um job
SELECT invoke_edge_function_with_log('manual-sync', 'sync-ad-sets-cron');
*/
