-- Fix RLS Infinite Recursion on users table
-- Execute este SQL no SQL Editor do Supabase

-- 1. Criar função segura para obter IDs das organizações do usuário
-- Esta função usa SECURITY DEFINER para rodar com permissões elevadas
-- e não dispara as políticas RLS, quebrando a recursão
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

-- 2. Remover políticas problemáticas na tabela users
DROP POLICY IF EXISTS "Users can view their own user record" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users in their organization" ON public.users;

-- 3. Criar políticas seguras usando a função (evita recursão)
CREATE POLICY "Users can view their own user record" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all users in their organization" ON public.users
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );

-- 4. Corrigir política de organization_memberships
DROP POLICY IF EXISTS "Members can view memberships for their organizations" ON public.organization_memberships;

CREATE POLICY "Members can view memberships for their organizations"
  ON public.organization_memberships FOR SELECT
  USING (
    organization_id IN (SELECT public.get_user_organization_ids())
    OR profile_id = auth.uid()
  );

-- 5. Garantir que o usuário tem permissões completas nas políticas de organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their own organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.get_user_organization_ids())
  );
