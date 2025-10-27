-- Migration: Fix signup owner via Edge Function
-- Description: Reverts handle_new_user to simple profile creation without setting user_type,
-- moving owner promotion & organization creation to the privileged Edge Function.
-- Created: 2025-10-27

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create basic profile record; do not set user_type here to avoid RLS/guards
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates basic profile on auth.users insert; owner promotion & org creation is handled by Edge Function promote-owner';