-- =====================================================
-- Unified Goals System Migration
-- =====================================================
-- Creates a flexible goals system that integrates:
-- - CRM metrics (leads, conversions, revenue, pipeline)
-- - Meta Ads metrics (ROAS, CPL, impressions, clicks)
-- - Revenue tracking
-- - Custom KPIs

-- Create enum for goal types
CREATE TYPE goal_type AS ENUM (
  'crm_revenue',          -- Faturamento do CRM
  'crm_leads_generated',  -- Leads gerados
  'crm_leads_converted',  -- Leads convertidos (fechado_ganho)
  'crm_conversion_rate',  -- Taxa de conversão
  'crm_pipeline_value',   -- Valor total do pipeline
  'crm_avg_deal_size',    -- Ticket médio
  'meta_roas',            -- Return on Ad Spend
  'meta_cpl',             -- Custo por Lead
  'meta_investment',      -- Investimento total
  'meta_leads',           -- Leads do Meta Ads
  'meta_impressions',     -- Impressões
  'meta_clicks',          -- Cliques
  'meta_ctr',             -- Click-through rate
  'revenue_total',        -- Receita total
  'revenue_by_category',  -- Receita por categoria
  'custom'                -- Metas customizadas
);

CREATE TYPE goal_period_type AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);

CREATE TYPE goal_status AS ENUM (
  'active',
  'completed',
  'paused',
  'archived'
);

-- Main goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  goal_type goal_type NOT NULL,

  -- Target and current values
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  start_value NUMERIC DEFAULT 0,

  -- Period
  period_type goal_period_type NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Filters (for Meta Ads integration)
  meta_account_id UUID REFERENCES ad_accounts(id) ON DELETE SET NULL,
  meta_campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,

  -- Revenue category filter
  revenue_category TEXT CHECK (revenue_category IN ('new_up', 'clientes', 'oportunidades')),

  -- Custom formula for 'custom' type goals
  custom_formula TEXT,

  -- Status and metadata
  status goal_status NOT NULL DEFAULT 'active',
  color TEXT DEFAULT '#2DA7FF',
  icon TEXT,

  -- Owner and timestamps
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Calculated fields (updated via trigger)
  progress_percentage NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN target_value > 0 THEN
        LEAST(((current_value - start_value) / (target_value - start_value) * 100), 100)
      ELSE 0
    END
  ) STORED,

  computed_status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN ((current_value - start_value) / NULLIF(target_value - start_value, 0) * 100) >= 95 THEN 'Excelente'
      WHEN ((current_value - start_value) / NULLIF(target_value - start_value, 0) * 100) >= 70 THEN 'Em dia'
      WHEN ((current_value - start_value) / NULLIF(target_value - start_value, 0) * 100) >= 50 THEN 'Atrasado'
      ELSE 'Crítico'
    END
  ) STORED
);

-- Goal progress history (for tracking changes over time)
CREATE TABLE IF NOT EXISTS goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value NUMERIC NOT NULL,

  -- Metadata for debugging
  data_source TEXT, -- 'crm', 'meta_ads', 'revenue', 'manual'
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_period ON goals(period_start, period_end);
CREATE INDEX idx_goals_type ON goals(goal_type);
CREATE INDEX idx_goals_created_by ON goals(created_by);
CREATE INDEX idx_goals_meta_account ON goals(meta_account_id);
CREATE INDEX idx_goals_meta_campaign ON goals(meta_campaign_id);

CREATE INDEX idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX idx_goal_progress_recorded_at ON goal_progress(recorded_at DESC);

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read goals
CREATE POLICY "Anyone can view goals" ON goals
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only owners and admins can create goals
CREATE POLICY "Authenticated users can create goals" ON goals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only creator can update their goals
CREATE POLICY "Users can update their own goals" ON goals
  FOR UPDATE USING (created_by = auth.uid());

-- Only creator can delete their goals
CREATE POLICY "Users can delete their own goals" ON goals
  FOR DELETE USING (created_by = auth.uid());

-- Goal progress policies (same as goals)
CREATE POLICY "Anyone can view goal progress" ON goal_progress
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert goal progress" ON goal_progress
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goals_updated_at_trigger
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_updated_at();

-- Function to automatically record goal progress when current_value changes
CREATE OR REPLACE FUNCTION record_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if current_value actually changed
  IF (TG_OP = 'UPDATE' AND OLD.current_value != NEW.current_value) OR TG_OP = 'INSERT' THEN
    INSERT INTO goal_progress (goal_id, value, data_source)
    VALUES (NEW.id, NEW.current_value, 'auto');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_goal_progress_trigger
  AFTER INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION record_goal_progress();

-- Comments
COMMENT ON TABLE goals IS 'Unified goals system supporting CRM, Meta Ads, and custom KPIs';
COMMENT ON TABLE goal_progress IS 'Historical tracking of goal progress over time';

COMMENT ON COLUMN goals.goal_type IS 'Type of KPI being tracked (CRM, Meta Ads, Revenue, Custom)';
COMMENT ON COLUMN goals.target_value IS 'Target value to achieve by period_end';
COMMENT ON COLUMN goals.current_value IS 'Current achieved value (updated automatically or manually)';
COMMENT ON COLUMN goals.start_value IS 'Starting value at period_start (for calculating progress)';
COMMENT ON COLUMN goals.meta_account_id IS 'Filter by specific Meta Ads account (optional)';
COMMENT ON COLUMN goals.meta_campaign_id IS 'Filter by specific Meta Ads campaign (optional)';
COMMENT ON COLUMN goals.custom_formula IS 'Custom calculation formula for custom-type goals';
COMMENT ON COLUMN goals.progress_percentage IS 'Calculated progress percentage (0-100)';
COMMENT ON COLUMN goals.computed_status IS 'Auto-calculated status based on progress';
