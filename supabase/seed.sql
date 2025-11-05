-- =====================================================
-- SEED DATA FOR METRICOM FLOW CRM
-- =====================================================
-- Execute este script no Supabase SQL Editor para popular o banco com dados de teste

-- Inserir labels
INSERT INTO public.labels (name, color) VALUES
  ('Urgente', '#EF4444'),
  ('Comercial', '#3B82F6'),
  ('Desenvolvimento', '#10B981'),
  ('Proposta', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- Inserir team members
INSERT INTO public.team_members (name, email, position, department) VALUES
  ('João Silva', 'joao@example.com', 'Desenvolvedor', 'TI'),
  ('Maria Santos', 'maria@example.com', 'Gerente de Vendas', 'Comercial'),
  ('Pedro Costa', 'pedro@example.com', 'Designer', 'Criativo'),
  ('Ana Lima', 'ana@example.com', 'Analista', 'Marketing'),
  ('Carlos Oliveira', 'carlos@example.com', 'Coordenador', 'Projetos'),
  ('Beatriz Ferreira', 'beatriz@example.com', 'Consultora', 'Vendas');

-- Inserir leads de exemplo (3 em cada status)
INSERT INTO public.leads (title, description, status, value, due_date, assignee_name, position, organization_id) VALUES
  -- Leads frio (todo)
  ('Proposta Empresa ABC', 'Desenvolver proposta comercial completa', 'novo_lead', 50000, CURRENT_DATE + INTERVAL '15 days', 'João Silva', 0, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Reunião Cliente XYZ', 'Apresentação do projeto piloto', 'novo_lead', 25000, CURRENT_DATE + INTERVAL '18 days', 'Maria Santos', 1, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Orçamento TechCorp', 'Levantamento de requisitos', 'novo_lead', 35000, CURRENT_DATE + INTERVAL '20 days', 'Pedro Costa', 2, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Em Andamento (doing)
  ('Negociação Contrato Innovate', 'Discussão de cláusulas e prazos', 'negociacao', 75000, CURRENT_DATE + INTERVAL '7 days', 'Ana Pereira', 0, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Sistema GHI - MVP', 'Desenvolvimento do MVP', 'negociacao', 65000, CURRENT_DATE + INTERVAL '25 days', 'João Silva', 1, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('App Mobile JKL', 'Design e prototipação', 'negociacao', 45000, CURRENT_DATE + INTERVAL '28 days', 'Beatriz Ferreira', 2, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Contrato fechado (done)
  ('Contrato MNO Assinado', 'Contrato assinado, aguardando pagamento', 'fechado_ganho', 120000, CURRENT_DATE - INTERVAL '5 days', 'Carlos Martins', 0, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Website PQR entregue', 'Site institucional completo', 'fechado_ganho', 30000, CURRENT_DATE - INTERVAL '5 days', 'Carlos Oliveira', 1, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('App STU lançado', 'Aplicativo mobile publicado', 'fechado_ganho', 80000, CURRENT_DATE - INTERVAL '15 days', 'Maria Santos', 2, 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9');

-- Inserir metas de clientes
INSERT INTO public.client_goals (company_name, goal_amount, achieved_amount, period_start, period_end, organization_id) VALUES
  ('Empresa Alpha', 150000, 125000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Beta Solutions', 200000, 180000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Gamma Corp', 100000, 65000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Delta Ltda', 300000, 285000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Epsilon Inc', 120000, 48000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('Zeta Group', 250000, 220000, DATE_TRUNC('year', CURRENT_DATE), DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9');

-- Inserir dados de revenue (últimos 6 meses)
INSERT INTO public.revenue_records (category, amount, month, year, date, organization_id) VALUES
  -- Janeiro
  ('new_up', 120000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 85000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 65000, 'Jan', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Fevereiro
  ('new_up', 135000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 92000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 78000, 'Fev', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Março
  ('new_up', 148000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 105000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 88000, 'Mar', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Abril
  ('new_up', 162000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 118000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 95000, 'Abr', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '2 months', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Maio
  ('new_up', 178000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 125000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 102000, 'Mai', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month', 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),

  -- Junho (mês atual)
  ('new_up', 195000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE), 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('clientes', 138000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE), 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9'),
  ('oportunidades', 115000, 'Jun', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('month', CURRENT_DATE), 'beb3dc35-a1f5-41b7-947a-7a6957e1fcb9');

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
  AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';

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
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_urgente);
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_comercial);
    ELSIF lead_record.status = 'doing' THEN
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_desenvolvimento);
    ELSE
      INSERT INTO public.lead_labels (lead_id, label_id) VALUES (lead_record.id, label_proposta);
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
      (lead_record.id, 'Receber pagamento', false, 4);
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
