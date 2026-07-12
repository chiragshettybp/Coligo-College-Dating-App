CREATE OR REPLACE FUNCTION public.admin_list_colleges(
  _search text DEFAULT '', _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest', _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, name text, code text, short_name text, city text, state text, country text,
  logo_url text, banner_url text, status text, discovery_enabled boolean,
  created_at timestamptz, updated_at timestamptz,
  total_students bigint, male_students bigint, female_students bigint,
  department_count bigint, active_users bigint, online_users bigint,
  total_matches bigint, messages_sent bigint, profile_completion int,
  growth_30d bigint, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT c.id, c.name, c.code, c.short_name, c.city, c.state, c.country,
      c.logo_url, c.banner_url, c.status, c.discovery_enabled, c.created_at, c.updated_at,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true) AS total_students,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true AND p.gender='man') AS male_students,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true AND p.gender='woman') AS female_students,
      (SELECT count(DISTINCT p.department_id) FROM profiles p WHERE p.college_id=c.id AND p.department_id IS NOT NULL) AS department_count,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.last_login_at>now()-interval '24 hours') AS active_users,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.last_login_at>now()-interval '5 minutes') AS online_users,
      (SELECT count(*) FROM matches m WHERE m.user_a IN (SELECT id FROM profiles WHERE college_id=c.id) OR m.user_b IN (SELECT id FROM profiles WHERE college_id=c.id)) AS total_matches,
      (SELECT count(*) FROM messages msg WHERE msg.sender_id IN (SELECT id FROM profiles WHERE college_id=c.id)) AS messages_sent,
      COALESCE((SELECT round(avg(sc))::int FROM (
        SELECT ((CASE WHEN p.bio IS NOT NULL AND p.bio<>'' THEN 1 ELSE 0 END)
          +(CASE WHEN p.date_of_birth IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.gender IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.department_id IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.semester IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.graduation_year IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.looking_for IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN EXISTS(SELECT 1 FROM photos ph WHERE ph.user_id=p.id) THEN 2 ELSE 0 END))*10 AS sc
        FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true
      ) s), 0) AS profile_completion,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.created_at>now()-interval '30 days' AND p.account_status='active') AS growth_30d
    FROM colleges c
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (_search='' OR b.name ILIKE '%'||_search||'%' OR COALESCE(b.code,'') ILIKE '%'||_search||'%'
        OR COALESCE(b.city,'') ILIKE '%'||_search||'%' OR COALESCE(b.state,'') ILIKE '%'||_search||'%'
        OR COALESCE(b.country,'') ILIKE '%'||_search||'%')
      AND (_filters->>'status' IS NULL OR b.status = _filters->>'status')
      AND (_filters->>'discovery' IS NULL OR b.discovery_enabled = (_filters->>'discovery')::bool)
      AND (_filters->>'state' IS NULL OR b.state = _filters->>'state')
      AND (_filters->>'city' IS NULL OR b.city = _filters->>'city')
      AND (_filters->>'min_students' IS NULL OR b.total_students >= (_filters->>'min_students')::bigint)
  )
  SELECT f.id, f.name, f.code, f.short_name, f.city, f.state, f.country,
    f.logo_url, f.banner_url, f.status, f.discovery_enabled, f.created_at, f.updated_at,
    f.total_students, f.male_students, f.female_students, f.department_count,
    f.active_users, f.online_users, f.total_matches, f.messages_sent,
    f.profile_completion, f.growth_30d, count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN _sort='name' THEN f.name END ASC,
    CASE WHEN _sort='oldest' THEN f.created_at END ASC,
    CASE WHEN _sort='newest' THEN f.created_at END DESC,
    CASE WHEN _sort IN('students','most_students') THEN f.total_students END DESC,
    CASE WHEN _sort='least_students' THEN f.total_students END ASC,
    CASE WHEN _sort='active_users' THEN f.active_users END DESC,
    CASE WHEN _sort='online' THEN f.online_users END DESC,
    CASE WHEN _sort='matches' THEN f.total_matches END DESC,
    CASE WHEN _sort='messages' THEN f.messages_sent END DESC,
    CASE WHEN _sort='completion' THEN f.profile_completion END DESC,
    CASE WHEN _sort='growth' THEN f.growth_30d END DESC,
    f.created_at DESC
  LIMIT GREATEST(_limit,0) OFFSET GREATEST(_offset,0);
END;
$$;