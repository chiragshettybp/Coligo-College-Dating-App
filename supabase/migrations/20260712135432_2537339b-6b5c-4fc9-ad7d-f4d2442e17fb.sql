-- Availability check (no profile data exposed, just a boolean).
CREATE OR REPLACE FUNCTION public.phone_available(_e164 text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE phone = _e164)
$$;
REVOKE EXECUTE ON FUNCTION public.phone_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_available(text) TO anon, authenticated;

-- DEV-MODE password reset by phone (OTP disabled). Intentionally not
-- production-safe; superseded when OTP verification is enabled.
CREATE OR REPLACE FUNCTION public.dev_reset_password(_e164 text, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE uid uuid;
BEGIN
  IF length(_password) < 8 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;
  SELECT id INTO uid FROM public.profiles WHERE phone = _e164;
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  UPDATE auth.users
    SET encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = uid;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.dev_reset_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dev_reset_password(text, text) TO anon, authenticated;