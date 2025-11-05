
-- ============================================================================
-- CORREÇÃO: PERMISSÃO DE LEITURA PARA CRON JOB LOGS
-- ============================================================================
-- Este arquivo adiciona uma política de RLS para permitir que usuários
-- autenticados leiam a tabela `cron_job_logs`.
-- ============================================================================

-- Permitir que usuários autenticados leiam todos os logs de cron jobs
CREATE POLICY "Authenticated users can view all cron logs"
  ON public.cron_job_logs FOR SELECT
  USING (auth.role() = 'authenticated');
