-- ============================================================================
-- AUTOMAÇÃO: CRON JOBS PARA SINCRONIZAÇÃO AUTOMÁTICA TODOS OS PLANOS
-- ============================================================================
-- Este arquivo configura jobs automáticos para sincronização de:
-- 1. Ad Sets (a cada 6 horas para todos os planos)
-- 2. Ads (a cada 6 horas para todos os planos)
-- 3. Insights de Ad Sets (a cada 6 horas para todos os planos)
-- 4. Insights de Ads (a cada 6 horas para todos os planos)
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: sync_ad_sets_cron
-- Sincroniza Ad Sets para todas as organizações com auto_sync_enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_ad_sets_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Invocar Edge Function de sincronização de Ad Sets
  v_result := public.invoke_edge_function('sync-ad-sets-cron', '{}'::jsonb);

  -- Log resultado
  RAISE NOTICE 'sync-ad-sets-cron result: %', v_result;
END;
$$;

-- ============================================================================
-- FUNÇÃO: sync_ads_cron
-- Sincroniza Ads para todas as organizações com auto_sync_enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_ads_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Invocar Edge Function de sincronização de Ads
  v_result := public.invoke_edge_function('sync-ads-cron', '{}'::jsonb);

  -- Log resultado
  RAISE NOTICE 'sync-ads-cron result: %', v_result;
END;
$$;

-- ============================================================================
-- FUNÇÃO: sync_adset_insights_cron
-- Sincroniza insights de Ad Sets para todas as organizações com auto_sync_enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_adset_insights_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Invocar Edge Function de sincronização de insights de Ad Sets
  v_result := public.invoke_edge_function('sync-adset-insights-cron', '{}'::jsonb);

  -- Log resultado
  RAISE NOTICE 'sync-adset-insights-cron result: %', v_result;
END;
$$;

-- ============================================================================
-- FUNÇÃO: sync_ad_insights_cron
-- Sincroniza insights de Ads para todas as organizações com auto_sync_enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_ad_insights_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Invocar Edge Function de sincronização de insights de Ads
  v_result := public.invoke_edge_function('sync-ad-insights-cron', '{}'::jsonb);

  -- Log resultado
  RAISE NOTICE 'sync-ad-insights-cron result: %', v_result;
END;
$$;

-- ============================================================================
-- CONFIGURAÇÃO DOS NOVOS CRON JOBS
-- Executam a cada 6 horas com delays para evitar sobrecarga
-- ============================================================================

-- Remover jobs existentes (se houver) para evitar duplicação
DO $$
BEGIN
  PERFORM cron.unschedule('sync-ad-sets-every-6h');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-ads-every-6h');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-adset-insights-every-6h');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-ad-insights-every-6h');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;

-- Job 1: Sincronizar Ad Sets a cada 6 horas (às 00:00, 06:00, 12:00, 18:00)
SELECT cron.schedule(
  'sync-ad-sets-every-6h',
  '0 */6 * * *',  -- A cada 6 horas
  $$
  SELECT public.sync_ad_sets_cron();
  $$
);

-- Job 2: Sincronizar Ads a cada 6 horas com 5 minutos de delay (às 00:05, 06:05, 12:05, 18:05)
SELECT cron.schedule(
  'sync-ads-every-6h',
  '5 */6 * * *',  -- A cada 6 horas + 5 minutos
  $$
  SELECT public.sync_ads_cron();
  $$
);

-- Job 3: Sincronizar insights de Ad Sets a cada 6 horas com 10 minutos de delay (às 00:10, 06:10, 12:10, 18:10)
SELECT cron.schedule(
  'sync-adset-insights-every-6h',
  '10 */6 * * *',  -- A cada 6 horas + 10 minutos
  $$
  SELECT public.sync_adset_insights_cron();
  $$
);

-- Job 4: Sincronizar insights de Ads a cada 6 horas com 15 minutos de delay (às 00:15, 06:15, 12:15, 18:15)
SELECT cron.schedule(
  'sync-ad-insights-every-6h',
  '15 */6 * * *',  -- A cada 6 horas + 15 minutos
  $$
  SELECT public.sync_ad_insights_cron();
  $$
);

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION public.sync_ad_sets_cron IS 'Sincroniza Ad Sets para todas as organizações com auto_sync_enabled - executa a cada 6 horas';
COMMENT ON FUNCTION public.sync_ads_cron IS 'Sincroniza Ads para todas as organizações com auto_sync_enabled - executa a cada 6 horas';
COMMENT ON FUNCTION public.sync_adset_insights_cron IS 'Sincroniza insights de Ad Sets para todas as organizações com auto_sync_enabled - executa a cada 6 horas';
COMMENT ON FUNCTION public.sync_ad_insights_cron IS 'Sincroniza insights de Ads para todas as organizações com auto_sync_enabled - executa a cada 6 horas';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todos os cron jobs de sincronização automática configurados
DO $$
DECLARE
  v_job RECORD;
BEGIN
  RAISE NOTICE '=== CRON JOBS DE SINCRONIZAÇÃO AUTOMÁTICA CONFIGURADOS ===';
  FOR v_job IN
    SELECT jobid, jobname, schedule, active
    FROM cron.job
    WHERE jobname IN (
      'sync-ad-sets-every-6h',
      'sync-ads-every-6h',
      'sync-adset-insights-every-6h',
      'sync-ad-insights-every-6h'
    )
  LOOP
    RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Active: %',
      v_job.jobid, v_job.jobname, v_job.schedule, v_job.active;
  END LOOP;
END $$;