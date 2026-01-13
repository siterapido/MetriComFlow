-- ===============================================
-- FIX COMPLETO - Recursão Infinita nas Políticas RLS
-- Execute TODO este SQL no SQL Editor do Supabase
-- ===============================================

-- 1. Criar função SECURITY DEFINER para obter org IDs do usuário
-- Esta função roda com permissões elevadas e não dispara políticas RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id 
  FROM public.organization_memberships 
  WHERE profile_id = auth.uid() 
  AND is_active = TRUE;
$$;

-- ===============================================
-- 2. CORRIGIR TABELA: organizations
-- ===============================================

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;

CREATE POLICY "Members can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.get_user_organization_ids())
  );

-- ===============================================
-- 3. CORRIGIR TABELA: organization_memberships
-- ===============================================

DROP POLICY IF EXISTS "Members can view memberships for their organizations" ON public.organization_memberships;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_memberships;

-- Permitir usuário ver sua própria membership (sem recursão)
CREATE POLICY "Users can view own membership" ON public.organization_memberships
  FOR SELECT USING (profile_id = auth.uid());

-- Permitir membros ver outras memberships da mesma org (usando função)
CREATE POLICY "Members can view org memberships" ON public.organization_memberships
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );

-- ===============================================
-- 4. CORRIGIR TABELA: users (se existir)
-- ===============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Users can view their own user record" ON public.users;
    DROP POLICY IF EXISTS "Admins can view all users in their organization" ON public.users;

    CREATE POLICY "Users can view their own record" ON public.users
      FOR SELECT USING (id = auth.uid());

    CREATE POLICY "Members can view users in their org" ON public.users
      FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organization_ids())
      );
  END IF;
END $$;

-- ===============================================
-- 5. CORRIGIR TABELA: profiles
-- ===============================================

-- Garantir que profiles não tem recursão
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- Usuário pode ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Membros podem ver perfis de colegas na mesma organização
CREATE POLICY "Members can view org profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT profile_id FROM public.organization_memberships
      WHERE organization_id IN (SELECT public.get_user_organization_ids())
      AND is_active = TRUE
    )
  );

-- ===============================================
-- 6. CORRIGIR TABELA: organization_subscriptions
-- ===============================================

DROP POLICY IF EXISTS "Members can view organization subscription" ON public.organization_subscriptions;

CREATE POLICY "Members can view organization subscription" ON public.organization_subscriptions
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );

-- ===============================================
-- 7. REFRESH MATERIALIZED VIEW
-- ===============================================

SELECT public.refresh_organization_plan_limits();

-- ===============================================
-- VERIFICAÇÃO: Teste a função
-- ===============================================
-- Após executar, faça logout e login novamente no app
-- Ou execute: SELECT public.get_user_organization_ids();
