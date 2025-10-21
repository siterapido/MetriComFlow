-- Migrações Propostas (Complementos Pós-010)
-- Execute via Supabase CLI em branch de desenvolvimento antes de promover para produção.

-- 1) Ampliar enum de origem de leads para refletir opções usadas no frontend
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN (
    'meta_ads',
    'manual',
    'google_ads',
    'whatsapp',
    'indicacao',
    'site',
    'telefone',
    'email',
    'evento'
  ));

-- 2) Garantir que o enum de status contempla o valor `follow_up` e `aguardando_resposta`
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'novo_lead',
    'qualificacao',
    'proposta',
    'negociacao',
    'follow_up',
    'aguardando_resposta',
    'fechado_ganho',
    'fechado_perdido'
  ));

-- 3) Índices auxiliares para consultas de follow-up
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_date
  ON public.leads(next_follow_up_date)
  WHERE status NOT IN ('fechado_ganho', 'fechado_perdido');

CREATE INDEX IF NOT EXISTS idx_leads_assignee_priority
  ON public.leads(assignee_id, priority)
  WHERE status NOT IN ('fechado_ganho', 'fechado_perdido');

-- 4) View opcional para filas de follow-up diário
CREATE OR REPLACE VIEW public.leads_follow_up_queue AS
SELECT
  l.id,
  l.title,
  l.assignee_id,
  l.priority,
  l.status,
  l.next_follow_up_date,
  l.last_contact_date,
  l.value,
  l.source
FROM public.leads l
WHERE l.status IN ('qualificacao', 'proposta', 'negociacao', 'follow_up', 'aguardando_resposta')
  AND (
    l.next_follow_up_date IS NULL
    OR l.next_follow_up_date::date <= NOW()::date
  )
ORDER BY l.next_follow_up_date NULLS FIRST, l.priority DESC;

GRANT SELECT ON public.leads_follow_up_queue TO authenticated;
