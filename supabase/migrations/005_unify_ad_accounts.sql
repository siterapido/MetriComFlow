-- 005_unify_ad_accounts.sql
-- Objetivo: Unificar o schema da tabela public.ad_accounts para refletir o uso no frontend/hooks (provider, external_id, business_name, connected_by)
-- mantendo compatibilidade com dados já inseridos pela função meta-auth (colunas legadas: user_id, ad_account_id, name, etc.).
-- Também adiciona políticas RLS para permitir que o próprio usuário visualize/insira/edite suas contas conectadas.

BEGIN;
-- 1) Adicionar novas colunas (se não existirem)
ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- 2) Definir valores padrão e restrições básicas
-- provider padrão = 'meta' e limitar aos provedores suportados (por ora apenas 'meta')
ALTER TABLE public.ad_accounts
  ALTER COLUMN provider SET DEFAULT 'meta';
-- Nota: CHECK não pode ser IF NOT EXISTS; então criamos apenas se não existir um constraint com esse nome
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ad_accounts_provider_check'
  ) THEN
    ALTER TABLE public.ad_accounts
      ADD CONSTRAINT ad_accounts_provider_check CHECK (provider IN ('meta'));
  END IF;
END $$;
-- 3) Backfill dos dados novos a partir das colunas legadas, se existirem
DO $$
DECLARE
  v_has_user_id BOOLEAN;
  v_has_ad_account_id BOOLEAN;
  v_has_name BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_accounts' AND column_name = 'user_id'
  ) INTO v_has_user_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_accounts' AND column_name = 'ad_account_id'
  ) INTO v_has_ad_account_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_accounts' AND column_name = 'name'
  ) INTO v_has_name;

  -- provider: garantir 'meta' como default quando nulo
  EXECUTE 'UPDATE public.ad_accounts SET provider = COALESCE(provider, ''meta'')';

  -- external_id: preencher a partir de ad_account_id, se existir
  IF v_has_ad_account_id THEN
    EXECUTE '
      UPDATE public.ad_accounts
      SET external_id = CASE
        WHEN external_id IS NULL AND ad_account_id IS NOT NULL AND ad_account_id ~ ''^act_'' THEN regexp_replace(ad_account_id, ''^act_'', '''')
        WHEN external_id IS NULL AND ad_account_id IS NOT NULL THEN ad_account_id
        ELSE external_id
      END
    ';
  END IF;

  -- connected_by: herdar de user_id, se existir
  IF v_has_user_id THEN
    EXECUTE 'UPDATE public.ad_accounts SET connected_by = COALESCE(connected_by, user_id)';
  END IF;

  -- business_name: herdar de name, se existir
  IF v_has_name THEN
    EXECUTE 'UPDATE public.ad_accounts SET business_name = COALESCE(business_name, name)';
  END IF;
END $$;
-- 4) Tornar external_id NOT NULL após o backfill
ALTER TABLE public.ad_accounts
  ALTER COLUMN external_id SET NOT NULL;
-- 5) Índice único para external_id (mantendo o índice/constraint único de ad_account_id por compatibilidade até atualizarmos meta-auth)
CREATE UNIQUE INDEX IF NOT EXISTS ux_ad_accounts_external_id ON public.ad_accounts(external_id);
-- 6) Trigger para compatibilidade futura:
--    Se a função meta-auth continuar inserindo apenas colunas legadas, o trigger completa os campos novos.
CREATE OR REPLACE FUNCTION public.unify_ad_accounts_defaults()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_ad_account_id TEXT := to_jsonb(NEW)->>'ad_account_id';
  v_name TEXT := to_jsonb(NEW)->>'name';
  v_user_id TEXT := to_jsonb(NEW)->>'user_id';
BEGIN
  -- provider padrão
  IF NEW.provider IS NULL THEN
    NEW.provider := 'meta';
  END IF;

  -- external_id a partir de ad_account_id (removendo prefixo 'act_') se o campo existir no row
  IF NEW.external_id IS NULL AND v_ad_account_id IS NOT NULL THEN
    IF v_ad_account_id ~ '^act_' THEN
      NEW.external_id := regexp_replace(v_ad_account_id, '^act_', '');
    ELSE
      NEW.external_id := v_ad_account_id;
    END IF;
  END IF;

  -- business_name herdando de name, se aplicável
  IF NEW.business_name IS NULL AND v_name IS NOT NULL THEN
    NEW.business_name := v_name;
  END IF;

  -- connected_by herdando de user_id
  IF NEW.connected_by IS NULL AND v_user_id IS NOT NULL THEN
    NEW.connected_by := v_user_id::uuid;
  END IF;

  -- garantir updated_at
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;
-- Criar trigger BEFORE INSERT (e também BEFORE UPDATE para manter coerência se campos legados forem alterados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'before_insert_unify_ad_accounts_defaults'
  ) THEN
    CREATE TRIGGER before_insert_unify_ad_accounts_defaults
    BEFORE INSERT ON public.ad_accounts
    FOR EACH ROW EXECUTE FUNCTION public.unify_ad_accounts_defaults();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'before_update_unify_ad_accounts_defaults'
  ) THEN
    CREATE TRIGGER before_update_unify_ad_accounts_defaults
    BEFORE UPDATE ON public.ad_accounts
    FOR EACH ROW EXECUTE FUNCTION public.unify_ad_accounts_defaults();
  END IF;
END $$;
-- 7) Políticas RLS adicionais com base em connected_by (sem remover as políticas existentes baseadas em user_id para compatibilidade)
-- Observação: CREATE POLICY não suporta IF NOT EXISTS; usamos guardas por nome via catálogo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_accounts' AND policyname = 'Users can view ad accounts they connected'
  ) THEN
    CREATE POLICY "Users can view ad accounts they connected"
    ON public.ad_accounts FOR SELECT
    USING (connected_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_accounts' AND policyname = 'Users can insert ad accounts they connected'
  ) THEN
    CREATE POLICY "Users can insert ad accounts they connected"
    ON public.ad_accounts FOR INSERT
    WITH CHECK (connected_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_accounts' AND policyname = 'Users can update ad accounts they connected'
  ) THEN
    CREATE POLICY "Users can update ad accounts they connected"
    ON public.ad_accounts FOR UPDATE
    USING (connected_by = auth.uid())
    WITH CHECK (connected_by = auth.uid());
  END IF;
END $$;
COMMIT;
