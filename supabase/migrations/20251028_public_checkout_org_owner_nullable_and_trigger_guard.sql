-- Migration: Public checkout - allow organizations without owner and guard membership trigger
-- Description: Permite criar organizações sem owner_id (fluxo pay-first) e evita erro no trigger de membership quando owner_id é NULL.
-- Created: 2025-10-28

-- 1) Permitir owner_id NULL em organizations (idempotente)
ALTER TABLE public.organizations
  ALTER COLUMN owner_id DROP NOT NULL;

-- 2) Ajustar função ensure_owner_membership para ignorar owner_id nulo
CREATE OR REPLACE FUNCTION public.ensure_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a organização foi criada sem owner (checkout público), não criar membership agora
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organization_memberships (organization_id, profile_id, role, is_active, joined_at, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', TRUE, NOW(), NEW.owner_id)
  ON CONFLICT (organization_id, profile_id)
  DO UPDATE SET
    role = 'owner',
    is_active = TRUE,
    left_at = NULL,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Garantir que, quando o owner_id for definido posteriormente, o membership seja criado/reativado
DROP TRIGGER IF EXISTS trg_ensure_owner_membership_on_update ON public.organizations;
CREATE TRIGGER trg_ensure_owner_membership_on_update
  AFTER UPDATE OF owner_id ON public.organizations
  FOR EACH ROW
  WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id AND NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.ensure_owner_membership();

-- Nota: O trigger existente AFTER INSERT (trg_ensure_owner_membership) permanece válido e continuará funcionando
-- quando owner_id já estiver definido no momento da criação.