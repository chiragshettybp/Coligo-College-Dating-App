-- Helper: is a given profile an active, onboarded member?
-- SECURITY DEFINER so the storage policy's check is not blocked by the
-- profiles table's own "view own profile only" RLS.
CREATE OR REPLACE FUNCTION public.is_active_member(_folder text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = _folder
      AND p.account_status = 'active'
      AND p.onboarding_completed = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_member(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_member(text) TO authenticated, service_role;

-- Replace the photo read policy so it no longer depends on the viewer being
-- able to SELECT the target profile row under RLS.
DROP POLICY IF EXISTS "Members read active member photos" ON storage.objects;
CREATE POLICY "Members read active member photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND public.is_active_member((storage.foldername(name))[1])
  );