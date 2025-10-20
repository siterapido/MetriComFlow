-- Migration: CRM Essential Features
-- Description: Implements core CRM functionalities including tasks, activities, interactions, and enhanced lead management
-- Created: 2025-01-20

-- =====================================================
-- ENHANCED LEADS TABLE
-- =====================================================

-- Add new fields to leads table for better CRM functionality
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS product_interest TEXT,
ADD COLUMN IF NOT EXISTS lead_source_detail TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
ADD COLUMN IF NOT EXISTS conversion_probability DECIMAL(5,2) DEFAULT 0 CHECK (conversion_probability >= 0 AND conversion_probability <= 100);

-- Update lead status to include more CRM-specific statuses
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('novo_lead', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido', 'follow_up', 'aguardando_resposta'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON public.leads(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact_date ON public.leads(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_date ON public.leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score);

-- =====================================================
-- TASKS TABLE
-- =====================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (task_type IN ('call', 'email', 'meeting', 'follow_up', 'proposal', 'demo', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Relationships
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Timing
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users with CRM access can view tasks"
  ON public.tasks FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()));

CREATE POLICY "Users can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (has_crm_access(auth.uid()) AND (assigned_to = auth.uid() OR created_by = auth.uid() OR is_owner(auth.uid())));

CREATE POLICY "Users can delete their created tasks"
  ON public.tasks FOR DELETE
  USING (has_crm_access(auth.uid()) AND (created_by = auth.uid() OR is_owner(auth.uid())));

-- Indexes for tasks
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_reminder_date ON public.tasks(reminder_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

-- =====================================================
-- INTERACTIONS TABLE
-- =====================================================

CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core fields
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'whatsapp', 'sms', 'video_call', 'in_person', 'other')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response')),
  
  -- Relationships
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  
  -- Timing
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  duration INTEGER, -- in minutes
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,
  
  -- Metadata
  attachments_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interactions
CREATE POLICY "Users with CRM access can view interactions"
  ON public.interactions FOR SELECT
  USING (has_crm_access(auth.uid()));

CREATE POLICY "Users with CRM access can create interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (has_crm_access(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their interactions"
  ON public.interactions FOR UPDATE
  USING (has_crm_access(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can delete their interactions"
  ON public.interactions FOR DELETE
  USING (has_crm_access(auth.uid()) AND (user_id = auth.uid() OR is_owner(auth.uid())));

-- Indexes for interactions
CREATE INDEX idx_interactions_lead_id ON public.interactions(lead_id);
CREATE INDEX idx_interactions_task_id ON public.interactions(task_id);
CREATE INDEX idx_interactions_user_id ON public.interactions(user_id);
CREATE INDEX idx_interactions_type ON public.interactions(interaction_type);
CREATE INDEX idx_interactions_date ON public.interactions(interaction_date);
CREATE INDEX idx_interactions_follow_up_date ON public.interactions(follow_up_date);

-- =====================================================
-- SALES METRICS VIEW
-- =====================================================

-- Create a view for sales metrics and reports
CREATE OR REPLACE VIEW public.sales_metrics AS
SELECT 
  -- Time periods
  DATE_TRUNC('month', l.created_at) as month,
  DATE_TRUNC('week', l.created_at) as week,
  DATE_TRUNC('day', l.created_at) as day,
  
  -- Lead metrics
  l.assignee_id,
  l.assignee_name,
  l.source,
  l.lead_source_detail,
  l.product_interest,
  l.status,
  l.priority,
  
  -- Financial metrics
  l.value as lead_value,
  l.contract_value,
  l.contract_type,
  l.contract_months,
  
  -- Timing metrics
  l.created_at as lead_created_at,
  l.closed_won_at,
  l.closed_lost_at,
  l.expected_close_date,
  l.last_contact_date,
  
  -- Calculated metrics
  CASE 
    WHEN l.closed_won_at IS NOT NULL THEN 
      EXTRACT(DAYS FROM l.closed_won_at - l.created_at)
    ELSE NULL
  END as days_to_close,
  
  CASE 
    WHEN l.status = 'fechado_ganho' THEN 1 
    ELSE 0 
  END as is_won,
  
  CASE 
    WHEN l.status = 'fechado_perdido' THEN 1 
    ELSE 0 
  END as is_lost,
  
  CASE 
    WHEN l.status IN ('fechado_ganho', 'fechado_perdido') THEN 1 
    ELSE 0 
  END as is_closed,
  
  -- Lead score and probability
  l.lead_score,
  l.conversion_probability

FROM public.leads l
WHERE l.created_at >= DATE_TRUNC('year', NOW()) - INTERVAL '1 year';

-- Grant access to the view
GRANT SELECT ON public.sales_metrics TO authenticated;

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update last_contact_date when interaction is created
CREATE OR REPLACE FUNCTION update_lead_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leads 
  SET 
    last_contact_date = NEW.interaction_date,
    updated_at = NOW()
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_contact_date
CREATE TRIGGER trigger_update_lead_last_contact
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_contact();

-- Function to auto-complete task when interaction is logged
CREATE OR REPLACE FUNCTION auto_complete_task()
RETURNS TRIGGER AS $$
BEGIN
  -- If interaction is linked to a task, mark task as completed
  IF NEW.task_id IS NOT NULL THEN
    UPDATE public.tasks 
    SET 
      status = 'completed',
      completed_at = NEW.interaction_date,
      actual_duration = NEW.duration,
      updated_at = NOW()
    WHERE id = NEW.task_id AND status != 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete tasks
CREATE TRIGGER trigger_auto_complete_task
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_task();

-- Function to create follow-up task if needed
CREATE OR REPLACE FUNCTION create_follow_up_task()
RETURNS TRIGGER AS $$
BEGIN
  -- If follow-up is required, create a new task
  IF NEW.follow_up_required = true AND NEW.follow_up_date IS NOT NULL THEN
    INSERT INTO public.tasks (
      title,
      description,
      task_type,
      lead_id,
      assigned_to,
      created_by,
      due_date,
      notes
    ) VALUES (
      'Follow-up: ' || COALESCE(NEW.subject, 'Interaction'),
      NEW.follow_up_notes,
      'follow_up',
      NEW.lead_id,
      NEW.user_id,
      NEW.user_id,
      NEW.follow_up_date,
      'Auto-created from interaction on ' || NEW.interaction_date::date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create follow-up tasks
CREATE TRIGGER trigger_create_follow_up_task
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_up_task();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default task types if they don't exist
INSERT INTO public.labels (name, color) VALUES
  ('Ligação Agendada', '#10B981'),
  ('Reunião Marcada', '#3B82F6'),
  ('Proposta Enviada', '#F59E0B'),
  ('Follow-up Necessário', '#EF4444'),
  ('Demo Agendada', '#8B5CF6'),
  ('Contrato Enviado', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

-- Update existing leads to have better default values
UPDATE public.leads 
SET 
  priority = 'medium',
  lead_score = 50,
  conversion_probability = 25.0
WHERE priority IS NULL OR lead_score IS NULL OR conversion_probability IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.tasks IS 'CRM tasks and reminders assigned to team members';
COMMENT ON TABLE public.interactions IS 'Record of all interactions with leads (calls, emails, meetings, etc.)';
COMMENT ON VIEW public.sales_metrics IS 'Aggregated sales metrics for reporting and analytics';

COMMENT ON COLUMN public.leads.product_interest IS 'Product or service the lead is interested in';
COMMENT ON COLUMN public.leads.lead_source_detail IS 'Detailed source information (campaign name, referrer, etc.)';
COMMENT ON COLUMN public.leads.priority IS 'Lead priority level for sales team';
COMMENT ON COLUMN public.leads.expected_close_date IS 'Expected date to close the deal';
COMMENT ON COLUMN public.leads.last_contact_date IS 'Date of last interaction with this lead';
COMMENT ON COLUMN public.leads.next_follow_up_date IS 'Scheduled date for next follow-up';
COMMENT ON COLUMN public.leads.lead_score IS 'Lead scoring from 0-100 based on engagement and fit';
COMMENT ON COLUMN public.leads.conversion_probability IS 'Estimated probability of conversion (0-100%)';