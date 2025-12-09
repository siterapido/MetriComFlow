-- Migration: Lead Distribution System
-- Description: Creates distribution_rules table and trigger to automatically assign leads based on user type limits.

-- 1. Create distribution_rules table
CREATE TABLE IF NOT EXISTS public.distribution_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type user_type NOT NULL,
    lead_limit INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_type) -- One rule per user type for now
);

-- Enable RLS
ALTER TABLE public.distribution_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view distribution rules"
    ON public.distribution_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can manage distribution rules"
    ON public.distribution_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- 2. Function to find eligible user and assign lead
CREATE OR REPLACE FUNCTION public.auto_distribute_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_rule RECORD;
    v_assignee_id UUID;
BEGIN
    -- Only proceed if lead is unassigned
    IF NEW.assignee_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Iterate through active rules to find a candidate
    -- We'll process rules in some order (e.g., specific types first if needed, but here just loop)
    FOR v_rule IN SELECT * FROM public.distribution_rules WHERE is_active = true LOOP
        
        -- Find a candidate user of this type who has not reached the limit
        -- Strategy: Random selection among those who have space
        -- Active leads count: Leads not in 'done' status (or 'fechado_ganho'/'fechado_perdido' depending on pipeline, assuming 'done' based on schema view)
        -- NOTE: The schema view dashboard_kpis uses `status != 'done'`. Let's stick to that or use the standard closed statuses.
        -- Assuming 'fechado_ganho' and 'fechado_perdido' are final. But commonly 'done' was used in simple kanban.
        -- Let's check the leads table check constraint: CHECK (status IN ('todo', 'doing', 'done')) - Wait, the check constraint in 001_initial_schema.sql says that, 
        -- BUT ModernLeadCard.tsx uses 'novo_lead', 'qualificacao', etc.
        -- The migration 001 might be outdated or there's no check constraint enforcement if it changed.
        -- Let's assume active leads are those NOT in ('fechado_ganho', 'fechado_perdido', 'done').
        
        SELECT p.id INTO v_assignee_id
        FROM public.profiles p
        WHERE p.user_type = v_rule.user_type
        AND (
            SELECT COUNT(*) 
            FROM public.leads l 
            WHERE l.assignee_id = p.id 
            AND l.status NOT IN ('fechado_ganho', 'fechado_perdido', 'done')
        ) < v_rule.lead_limit
        ORDER BY RANDOM()
        LIMIT 1;

        -- If found, assign and break
        IF v_assignee_id IS NOT NULL THEN
            NEW.assignee_id := v_assignee_id;
            NEW.assignee_name := (SELECT full_name FROM public.profiles WHERE id = v_assignee_id);
            EXIT; -- Stop checking other rules
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger
DROP TRIGGER IF EXISTS trigger_auto_distribute_lead ON public.leads;
CREATE TRIGGER trigger_auto_distribute_lead
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_distribute_lead();

-- 4. Initial Seed (Optional: Create default disabled rules for types)
INSERT INTO public.distribution_rules (user_type, lead_limit, is_active)
VALUES 
    ('crm_user', 30, false),
    ('sales', 50, false)
ON CONFLICT (user_type) DO NOTHING;
