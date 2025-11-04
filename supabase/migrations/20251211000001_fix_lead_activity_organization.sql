-- Migration: Fix lead_activity trigger to include organization_id
-- Description: Update log_lead_activity function to pass organization_id when inserting activity records
-- Issue: Previous trigger inserts failed due to NOT NULL constraint on organization_id

CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_from TEXT;
  v_to TEXT;
  v_organization_id UUID;
BEGIN
  -- Try to resolve the auth user (optional)
  BEGIN
    SELECT auth.uid() INTO v_user_id; -- works within auth context
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT p.full_name INTO v_user_name FROM public.profiles p WHERE p.id = v_user_id;
  END IF;

  -- Get organization_id from the lead record
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_organization_id := NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_organization_id := OLD.organization_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_activity (
      action_type,
      lead_id,
      lead_title,
      description,
      user_id,
      user_name,
      organization_id,
      created_at
    ) VALUES (
      'created',
      NEW.id,
      NEW.title,
      'Lead criado',
      v_user_id,
      COALESCE(v_user_name, 'Sistema'),
      v_organization_id,
      NOW()
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.lead_activity (
      action_type,
      lead_id,
      lead_title,
      description,
      user_id,
      user_name,
      organization_id,
      created_at
    ) VALUES (
      'deleted',
      OLD.id,
      OLD.title,
      'Lead removido',
      v_user_id,
      COALESCE(v_user_name, 'Sistema'),
      v_organization_id,
      NOW()
    );
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change
    IF COALESCE(OLD.status, '') IS DISTINCT FROM COALESCE(NEW.status, '') THEN
      INSERT INTO public.lead_activity (
        action_type,
        lead_id,
        lead_title,
        from_status,
        to_status,
        description,
        user_id,
        user_name,
        organization_id,
        created_at
      ) VALUES (
        'status_change',
        NEW.id,
        NEW.title,
        OLD.status,
        NEW.status,
        'Mudança de etapa',
        v_user_id,
        COALESCE(v_user_name, 'Sistema'),
        v_organization_id,
        NOW()
      );
    END IF;

    -- Assignment change
    IF COALESCE(OLD.assignee_id, '') IS DISTINCT FROM COALESCE(NEW.assignee_id, '') THEN
      INSERT INTO public.lead_activity (
        action_type,
        lead_id,
        lead_title,
        description,
        user_id,
        user_name,
        organization_id,
        created_at
      ) VALUES (
        'assignment',
        NEW.id,
        NEW.title,
        COALESCE(NEW.assignee_name, 'Responsável atualizado'),
        v_user_id,
        COALESCE(v_user_name, 'Sistema'),
        v_organization_id,
        NOW()
      );
    END IF;

    -- Value change
    IF COALESCE(OLD.value, 0) IS DISTINCT FROM COALESCE(NEW.value, 0) OR COALESCE(OLD.contract_value, 0) IS DISTINCT FROM COALESCE(NEW.contract_value, 0) THEN
      INSERT INTO public.lead_activity (
        action_type,
        lead_id,
        lead_title,
        description,
        user_id,
        user_name,
        organization_id,
        created_at
      ) VALUES (
        'value_update',
        NEW.id,
        NEW.title,
        'Valor do negócio atualizado',
        v_user_id,
        COALESCE(v_user_name, 'Sistema'),
        v_organization_id,
        NOW()
      );
    END IF;

    -- Source/campaign change
    IF COALESCE(OLD.source, '') IS DISTINCT FROM COALESCE(NEW.source, '') OR COALESCE(OLD.campaign_id, '') IS DISTINCT FROM COALESCE(NEW.campaign_id, '') THEN
      INSERT INTO public.lead_activity (
        action_type,
        lead_id,
        lead_title,
        description,
        user_id,
        user_name,
        organization_id,
        created_at
      ) VALUES (
        'source_update',
        NEW.id,
        NEW.title,
        'Origem/Campanha atualizada',
        v_user_id,
        COALESCE(v_user_name, 'Sistema'),
        v_organization_id,
        NOW()
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger should already exist, but let's ensure it's properly set
DROP TRIGGER IF EXISTS trg_leads_log_activity ON public.leads;
CREATE TRIGGER trg_leads_log_activity
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_activity();

-- Add comment documenting the fix
COMMENT ON FUNCTION public.log_lead_activity() IS 'Logs all lead activity changes including inserts, updates, deletes with organization_id scoping';
