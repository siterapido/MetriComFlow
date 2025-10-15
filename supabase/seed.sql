-- =====================================================
-- SEED DATA FOR METRICOM FLOW CRM
-- =====================================================
-- Execute este script no Supabase SQL Editor para popular o banco com dados de teste

-- Inserir team members
INSERT INTO public.team_members (name, email, position, department) VALUES
  ('João Silva', 'joao@example.com', 'Desenvolvedor', 'TI'),
  ('Maria Santos', 'maria@example.com', 'Gerente de Vendas', 'Comercial'),
  ('Pedro Costa', 'pedro@example.com', 'Designer', 'Criativo'),
  ('Ana Lima', 'ana@example.com', 'Analista', 'Marketing'),
  ('Carlos Oliveira', 'carlos@example.com', 'Coordenador', 'Projetos'),
  ('Beatriz Ferreira', 'beatriz@example.com', 'Consultora', 'Vendas')
ON CONFLICT DO NOTHING;

-- Inserir leads de exemplo (3 em cada status)
INSERT INTO public.leads (title, description, status, value, due_date, assignee_name, position) VALUES
  -- Leads frio (todo)
  ('Proposta Empresa ABC', 'Desenvolver proposta comercial completa', 'todo', 50000, CURRENT_DATE + INTERVAL '15 days', 'João Silva', 0),
  ('Reunião Cliente XYZ', 'Apresentação do projeto piloto', 'todo', 25000, CURRENT_DATE + INTERVAL '18 days', 'Maria Santos', 1),
  ('Orçamento TechCorp', 'Levantamento de requisitos', 'todo', 35000, CURRENT_DATE + INTERVAL '20 days', 'Pedro Costa', 2),

  -- Em Andamento (doing)
  ('Projeto DEF em desenvolvimento', 'Implementação da primeira fase', 'doing', 75000, CURRENT_DATE + INTERVAL '30 days', 'Pedro Costa', 0),
  ('Sistema GHI - MVP', 'Desenvolvimento do MVP', 'doing', 65000, CURRENT_DATE + INTERVAL '25 days', 'João Silva', 1),
  ('App Mobile JKL', 'Design e prototipação', 'doing', 45000, CURRENT_DATE + INTERVAL '28 days', 'Beatriz Ferreira', 2),

  -- Contrato fechado (done)
  ('Contrato MNO assinado', 'Projeto finalizado com sucesso', 'done', 100000, CURRENT_DATE - INTERVAL '10 days', 'Ana Lima', 0),
  ('Website PQR entregue', 'Site institucional completo', 'done', 30000, CURRENT_DATE - INTERVAL '5 days', 'Carlos Oliveira', 1),
  ('App STU lançado', 'Aplicativo mobile publicado', 'done', 80000, CURRENT_DATE - INTERVAL '15 days', 'Maria Santos', 2)
ON CONFLICT DO NOTHING;

-- Inserir metas de clientes
INSERT INTO public.client_goals (company_name, goal_amount, achieved_amount, period_start, period_end) VALUES
  ('Empresa Alpha', 150000, 125000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
  ('Beta Solutions', 200000, 180000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
  ('Gamma Corp', 100000, 65000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
  ('Delta Ltda', 300000, 285000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
  ('Epsilon Inc', 120000, 48000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
  ('Zeta Group', 250000, 220000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Inserir dados de revenue (últimos 6 meses)
INSERT INTO public.revenue_records (category, amount, month, year, date) VALUES
  -- Janeiro
  ('new_up', 120000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'),
  ('clientes', 85000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'),
  ('oportunidades', 65000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'),

  -- Fevereiro
  ('new_up', 135000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months'),
  ('clientes', 92000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months'),
  ('oportunidades', 78000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months'),

  -- Março
  ('new_up', 148000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'),
  ('clientes', 105000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'),
  ('oportunidades', 88000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'),

  -- Abril
  ('new_up', 162000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'),
  ('clientes', 118000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'),
  ('oportunidades', 95000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months'),

  -- Maio
  ('new_up', 178000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('clientes', 125000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('oportunidades', 102000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'),

  -- Junho (mês atual)
  ('new_up', 195000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE)),
  ('clientes', 138000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE)),
  ('oportunidades', 115000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE))
ON CONFLICT DO NOTHING;

-- Inserir algumas stopped sales
INSERT INTO public.stopped_sales (lead_id, cliente, valor, dias_parado, last_activity_date)
SELECT
  id,
  title,
  value,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - updated_at))::INTEGER,
  updated_at
FROM public.leads
WHERE status = 'doing'
  AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
ON CONFLICT DO NOTHING;

-- Adicionar algumas labels aos leads
-- Primeiro, pegamos alguns IDs de leads e labels
DO $$
DECLARE
  lead_record RECORD;
  label_urgente UUID;
  label_comercial UUID;
  label_desenvolvimento UUID;
  label_proposta UUID;
BEGIN
  -- Get label IDs
  SELECT id INTO label_urgente FROM public.labels WHERE name = 'Urgente' LIMIT 1;
  SELECT id INTO label_comercial FROM public.labels WHERE name = 'Comercial' LIMIT 1;
  SELECT id INTO label_desenvolvimento FROM public.labels WHERE name = 'Desenvolvimento' LIMIT 1;
  SELECT id INTO label_proposta FROM public.labels WHERE name = 'Proposta' LIMIT 1;

  -- Add labels to some leads
  FOR lead_record IN
    SELECT id, status FROM public.leads LIMIT 6
  LOOP
    IF lead_record.status = 'todo' THEN
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_urgente) ON CONFLICT DO NOTHING;
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_comercial) ON CONFLICT DO NOTHING;
    ELSIF lead_record.status = 'doing' THEN
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_desenvolvimento) ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_proposta) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Adicionar alguns checklist items
DO $$
DECLARE
  lead_record RECORD;
BEGIN
  FOR lead_record IN
    SELECT id FROM public.leads LIMIT 3
  LOOP
    INSERT INTO public.checklist_items (lead_id, title, completed, position) VALUES
      (lead_record.id, 'Enviar proposta', true, 0),
      (lead_record.id, 'Agendar reunião', true, 1),
      (lead_record.id, 'Fazer follow-up', false, 2),
      (lead_record.id, 'Finalizar contrato', false, 3),
      (lead_record.id, 'Receber pagamento', false, 4)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Exibir resumo dos dados inseridos
SELECT
  'Team Members' as tabela,
  COUNT(*)::TEXT as total
FROM public.team_members
UNION ALL
SELECT
  'Leads',
  COUNT(*)::TEXT
FROM public.leads
UNION ALL
SELECT
  'Client Goals',
  COUNT(*)::TEXT
FROM public.client_goals
UNION ALL
SELECT
  'Revenue Records',
  COUNT(*)::TEXT
FROM public.revenue_records
UNION ALL
SELECT
  'Lead Labels',
  COUNT(*)::TEXT
FROM public.lead_labels
UNION ALL
SELECT
  'Checklist Items',
  COUNT(*)::TEXT
FROM public.checklist_items;
