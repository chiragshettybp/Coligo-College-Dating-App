
REVOKE EXECUTE ON FUNCTION public.college_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.college_rankings(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.college_rank(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_matches_today(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.new_members(integer) FROM PUBLIC, anon;
