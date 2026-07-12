-- handle_new_user is only ever invoked by the auth trigger; no API caller needs it.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is referenced by RLS policies (TO authenticated) so authenticated must keep EXECUTE,
-- but anon/public never need it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;