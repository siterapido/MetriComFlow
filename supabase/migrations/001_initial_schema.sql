-- Metricom Flow CRM Database Schema
-- PostgreSQL Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Users Profile Table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
-- =====================================================
-- TEAM MEMBERS
-- =====================================================

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT,
  department TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team members"
  ON public.team_members FOR SELECT
  USING (true);
CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
-- =====================================================
-- LEADS (KANBAN CARDS)
-- =====================================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  value DECIMAL(15, 2) DEFAULT 0,
  due_date DATE,
  assignee_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  assignee_name TEXT, -- Denormalized for quick access
  comments_count INTEGER DEFAULT 0,
  attachments_count INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0, -- For ordering within columns
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leads"
  ON public.leads FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
-- Index for better query performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assignee ON public.leads(assignee_id);
CREATE INDEX idx_leads_due_date ON public.leads(due_date);
-- =====================================================
-- LEAD LABELS
-- =====================================================

CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#2DA7FF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view labels"
  ON public.labels FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can manage labels"
  ON public.labels FOR ALL
  USING (auth.uid() IS NOT NULL);
-- Junction table for many-to-many relationship
CREATE TABLE public.lead_labels (
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (lead_id, label_id)
);
ALTER TABLE public.lead_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lead labels"
  ON public.lead_labels FOR SELECT
  USING (true);
CREATE POLICY "Users can manage lead labels"
  ON public.lead_labels FOR ALL
  USING (auth.uid() IS NOT NULL);
-- =====================================================
-- LEAD CHECKLIST
-- =====================================================

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view checklist items"
  ON public.checklist_items FOR SELECT
  USING (true);
CREATE POLICY "Users can manage checklist items"
  ON public.checklist_items FOR ALL
  USING (auth.uid() IS NOT NULL);
-- =====================================================
-- LEAD COMMENTS
-- =====================================================

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);
-- =====================================================
-- LEAD ATTACHMENTS
-- =====================================================

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view attachments"
  ON public.attachments FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can upload attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own attachments"
  ON public.attachments FOR DELETE
  USING (auth.uid() = uploaded_by);
-- =====================================================
-- LEAD ACTIVITY HISTORY
-- =====================================================

CREATE TABLE public.lead_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  lead_title TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'moved', 'updated', 'deleted', 'commented')),
  from_status TEXT,
  to_status TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lead activity"
  ON public.lead_activity FOR SELECT
  USING (true);
CREATE POLICY "System can insert activity"
  ON public.lead_activity FOR INSERT
  WITH CHECK (true);
-- Index for activity queries
CREATE INDEX idx_lead_activity_lead ON public.lead_activity(lead_id);
CREATE INDEX idx_lead_activity_created ON public.lead_activity(created_at DESC);
-- =====================================================
-- CLIENT GOALS (METAS)
-- =====================================================

CREATE TABLE public.client_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  goal_amount DECIMAL(15, 2) NOT NULL,
  achieved_amount DECIMAL(15, 2) DEFAULT 0,
  percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN goal_amount > 0 THEN (achieved_amount / goal_amount * 100)
      ELSE 0
    END
  ) STORED,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (achieved_amount / NULLIF(goal_amount, 0) * 100) >= 95 THEN 'Excelente'
      WHEN (achieved_amount / NULLIF(goal_amount, 0) * 100) >= 70 THEN 'Em dia'
      WHEN (achieved_amount / NULLIF(goal_amount, 0) * 100) >= 50 THEN 'Atrasado'
      ELSE 'Crítico'
    END
  ) STORED,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view client goals"
  ON public.client_goals FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can create goals"
  ON public.client_goals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update goals"
  ON public.client_goals FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- Index for goals
CREATE INDEX idx_client_goals_company ON public.client_goals(company_name);
CREATE INDEX idx_client_goals_period ON public.client_goals(period_start, period_end);
-- =====================================================
-- REVENUE TRACKING
-- =====================================================

CREATE TABLE public.revenue_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('new_up', 'clientes', 'oportunidades')),
  amount DECIMAL(15, 2) NOT NULL,
  month TEXT NOT NULL, -- Format: 'Jan', 'Fev', etc.
  year INTEGER NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  related_goal_id UUID REFERENCES public.client_goals(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view revenue records"
  ON public.revenue_records FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can manage revenue"
  ON public.revenue_records FOR ALL
  USING (auth.uid() IS NOT NULL);
-- Index for revenue queries
CREATE INDEX idx_revenue_date ON public.revenue_records(date DESC);
CREATE INDEX idx_revenue_category ON public.revenue_records(category);
CREATE INDEX idx_revenue_year_month ON public.revenue_records(year, month);
-- =====================================================
-- STOPPED SALES TRACKING
-- =====================================================

CREATE TABLE public.stopped_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  cliente TEXT NOT NULL,
  valor DECIMAL(15, 2) NOT NULL,
  dias_parado INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.stopped_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stopped sales"
  ON public.stopped_sales FOR SELECT
  USING (true);
-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_goals_updated_at BEFORE UPDATE ON public.client_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Function to track lead movements
CREATE OR REPLACE FUNCTION log_lead_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO public.lead_activity (
      lead_id,
      lead_title,
      action_type,
      from_status,
      to_status,
      description
    ) VALUES (
      NEW.id,
      NEW.title,
      'moved',
      OLD.status,
      NEW.status,
      'Lead movido de ' || OLD.status || ' para ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER track_lead_movements
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_movement();
-- Function to update comments count
CREATE OR REPLACE FUNCTION update_lead_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.leads
    SET comments_count = comments_count + 1
    WHERE id = NEW.lead_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.leads
    SET comments_count = comments_count - 1
    WHERE id = OLD.lead_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_comments_count();
-- Function to update attachments count
CREATE OR REPLACE FUNCTION update_lead_attachments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.leads
    SET attachments_count = attachments_count + 1
    WHERE id = NEW.lead_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.leads
    SET attachments_count = attachments_count - 1
    WHERE id = OLD.lead_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_attachments_count
  AFTER INSERT OR DELETE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_attachments_count();
-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View for dashboard KPIs
CREATE OR REPLACE VIEW public.dashboard_kpis AS
SELECT
  (SELECT COALESCE(SUM(amount), 0)
   FROM public.revenue_records
   WHERE category = 'new_up'
   AND date >= DATE_TRUNC('month', CURRENT_DATE)
  ) as faturamento_mensal,

  (SELECT COALESCE(SUM(amount), 0)
   FROM public.revenue_records
   WHERE category = 'new_up'
   AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ) as faturamento_anual,

  (SELECT COUNT(*)
   FROM public.leads
   WHERE status != 'done'
  ) as oportunidades_ativas,

  (SELECT COALESCE(SUM(value), 0)
   FROM public.leads
   WHERE status != 'done'
  ) as pipeline_value;
-- View for monthly revenue
CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  month,
  year,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as record_count
FROM public.revenue_records
GROUP BY month, year, category
ORDER BY year DESC,
  CASE month
    WHEN 'Jan' THEN 1
    WHEN 'Fev' THEN 2
    WHEN 'Mar' THEN 3
    WHEN 'Abr' THEN 4
    WHEN 'Mai' THEN 5
    WHEN 'Jun' THEN 6
    WHEN 'Jul' THEN 7
    WHEN 'Ago' THEN 8
    WHEN 'Set' THEN 9
    WHEN 'Out' THEN 10
    WHEN 'Nov' THEN 11
    WHEN 'Dez' THEN 12
  END;
-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert predefined labels
INSERT INTO public.labels (name, color) VALUES
  ('Urgente', '#EF4444'),
  ('Comercial', '#2DA7FF'),
  ('Reunião', '#8B5CF6'),
  ('Desenvolvimento', '#10B981'),
  ('Alta Prioridade', '#F59E0B'),
  ('Baixa Prioridade', '#6B7280'),
  ('Proposta', '#3B82F6'),
  ('Negociação', '#EC4899'),
  ('Contrato', '#059669'),
  ('Concluído', '#22C55E'),
  ('Faturado', '#94A3B8')
ON CONFLICT (name) DO NOTHING;
-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
