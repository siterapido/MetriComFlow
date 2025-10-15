-- Enforce that only service_role can change the 'role' column in public.profiles
-- Also prevent non-service inserts from setting role != 'user'

-- Function: prevent role changes unless service_role
CREATE OR REPLACE FUNCTION public.enforce_profile_role_change()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Block updates that attempt to change the role unless service_role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Changing profile role is restricted to service_role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_role_change ON public.profiles;
CREATE TRIGGER enforce_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role_change();

-- Function: prevent non-service inserts from setting role other than default 'user'
CREATE OR REPLACE FUNCTION public.enforce_profile_role_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- Allow default 'user' for normal signups; require service_role for any other role
  IF NEW.role IS DISTINCT FROM 'user' THEN
    IF jwt_role IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Assigning non-user role is restricted to service_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_role_insert ON public.profiles;
CREATE TRIGGER enforce_profile_role_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role_on_insert();