-- ============================================================================
-- Script: Criar Usuário Admin
-- Email: giordanokairo13@gmail.com
-- Data: 2026-02-25
--
-- INSTRUÇÕES:
-- 1. Acesse o painel do Supabase: https://kyysmixnhdqrxynxjbwk.supabase.co
-- 2. Vá em "SQL Editor" no menu lateral
-- 3. Cole e execute este script
--
-- SENHA GERADA: vy@1Qg3z2tIB*a7y
-- IMPORTANTE: Guarde essa senha em local seguro!
-- ============================================================================

BEGIN;

-- Verifica se o usuário já existe
DO $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
BEGIN

  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'giordanokairo13@gmail.com';

  IF existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'Usuário já existe com ID: %', existing_user_id;
    RAISE NOTICE 'Apenas atualizando role para admin...';

    -- Apenas atualiza o role para admin
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = existing_user_id;

    RAISE NOTICE 'Role atualizado para admin com sucesso!';
    RETURN;
  END IF;

  -- Gera um novo UUID para o usuário
  new_user_id := gen_random_uuid();

  -- Cria o usuário em auth.users
  -- O trigger handle_new_user() criará automaticamente:
  --   - profile (com user_type = 'owner')
  --   - organization ("{name}'s Organization")
  --   - organization_membership (role = 'owner')
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'giordanokairo13@gmail.com',
    crypt('vy@1Qg3z2tIB*a7y', gen_salt('bf')),
    NOW(),                          -- email já confirmado
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Giordano Kairo"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  RAISE NOTICE 'Usuário criado com ID: %', new_user_id;

  -- Aguarda o trigger processar e atualiza role para 'admin'
  -- (o trigger cria o profile com user_type = 'owner', aqui definimos role = 'admin')
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = new_user_id;

  RAISE NOTICE 'Role definido como admin com sucesso!';
  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE 'Usuário admin criado:';
  RAISE NOTICE '  Email: giordanokairo13@gmail.com';
  RAISE NOTICE '  Senha: vy@1Qg3z2tIB*a7y';
  RAISE NOTICE '  ID: %', new_user_id;
  RAISE NOTICE '--------------------------------------------';

END;
$$;

COMMIT;
