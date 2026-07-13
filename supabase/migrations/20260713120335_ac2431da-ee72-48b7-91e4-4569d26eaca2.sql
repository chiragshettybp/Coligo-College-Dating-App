-- ============================================================================
-- Admin Analytics Module — SECURITY DEFINER aggregation RPCs.
-- Every function re-checks has_role(auth.uid(),'admin') and raises 'Forbidden'
-- otherwise, so students can never read analytics even with a bypassed UI.
-- No new user-data tables; these read existing tables only.
-- ============================================================================

-- Supporting indexes for time-bucketed aggregation (idempotent).
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON public.profiles (college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON public.swipes (created_at);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at);

-- ---------------------------------------------------------------- KPIs
CREATE OR REPLACE FUNCTION public.admin_analytics_kpis(
  p_start timestamptz,
  p_end timestamptz,
  p_college uuid DEFAULT NULL,
  p_department uuid DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_verification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  matched int;
  swiped int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  CREATE TEMP TABLE _fp ON COMMIT DROP AS
    SELECT p.id, p.college_id
    FROM profiles p
    WHERE (p_college IS NULL OR p.college_id = p_college)
      AND (p_department IS NULL OR p.department_id = p_department)
      AND (p_gender IS NULL OR p.gender::text = p_gender)
      AND (p_verification IS NULL OR p.verification_status::text = p_verification);

  SELECT count(*) INTO swiped FROM swipes s
    WHERE s.created_at BETWEEN p_start AND p_end
      AND s.actor_id IN (SELECT id FROM _fp);
  SELECT count(*) INTO matched FROM matches m
    WHERE m.created_at BETWEEN p_start AND p_end
      AND (m.user_a IN (SELECT id FROM _fp) OR m.user_b IN (SELECT id FROM _fp));

  result := jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM _fp),
    'verifiedUsers', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.verification_status::text = 'verified'),
    'activeUsers', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.last_login_at >= now() - interval '7 days'),
    'usersOnline', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.last_login_at > now() - interval '5 minutes'),
    'newToday', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.created_at >= date_trunc('day', now())),
    'newThisWeek', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.created_at >= date_trunc('week', now())),
    'newThisMonth', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.created_at >= date_trunc('month', now())),
    'newInRange', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.created_at BETWEEN p_start AND p_end),
    'totalColleges', (SELECT count(*) FROM colleges),
    'totalDepartments', (SELECT count(*) FROM departments),
    'totalSwipes', swiped,
    'totalLikes', (SELECT count(*) FROM swipes s WHERE s.created_at BETWEEN p_start AND p_end AND s.action IN ('like','super') AND s.actor_id IN (SELECT id FROM _fp)),
    'totalPasses', (SELECT count(*) FROM swipes s WHERE s.created_at BETWEEN p_start AND p_end AND s.action = 'pass' AND s.actor_id IN (SELECT id FROM _fp)),
    'totalMatches', matched,
    'matchRate', CASE WHEN swiped > 0 THEN round((matched::numeric / swiped) * 100, 1) ELSE 0 END,
    'messages', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.sender_id IN (SELECT id FROM _fp)),
    'imagesShared', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.image_path IS NOT NULL AND ms.sender_id IN (SELECT id FROM _fp)),
    'voiceNotes', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.audio_path IS NOT NULL AND ms.sender_id IN (SELECT id FROM _fp)),
    'reports', (SELECT count(*) FROM reports r WHERE r.created_at BETWEEN p_start AND p_end),
    'reportsPending', (SELECT count(*) FROM reports r WHERE r.status = 'pending'),
    'bannedUsers', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.account_status::text = 'banned'),
    'suspendedUsers', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.account_status::text = 'suspended'),
    'deletedUsers', (SELECT count(*) FROM profiles p JOIN _fp f ON f.id = p.id WHERE p.account_status::text = 'deleted'),
    'activeConversations', (SELECT count(DISTINCT m.match_id) FROM messages m WHERE m.created_at >= now() - interval '7 days'),
    'dau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '30 days'),
    'avgProfileCompletion', (SELECT COALESCE(round(avg(CASE WHEN p.onboarding_completed THEN 100 ELSE (COALESCE(p.onboarding_step,0) * 20) END)::numeric, 0), 0) FROM profiles p JOIN _fp f ON f.id = p.id)
  );

  DROP TABLE IF EXISTS _fp;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Timeseries
-- p_metric: signups | swipes | likes | matches | messages
-- p_bucket: day | hour
CREATE OR REPLACE FUNCTION public.admin_analytics_timeseries(
  p_metric text,
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day',
  p_college uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  step interval := CASE WHEN p_bucket = 'hour' THEN interval '1 hour' ELSE interval '1 day' END;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH buckets AS (
    SELECT generate_series(date_trunc(p_bucket, p_start), date_trunc(p_bucket, p_end), step) AS b
  ),
  events AS (
    SELECT date_trunc(p_bucket, created_at) AS b
    FROM (
      SELECT p.created_at FROM profiles p
        WHERE p_metric = 'signups' AND (p_college IS NULL OR p.college_id = p_college)
      UNION ALL
      SELECT s.created_at FROM swipes s
        WHERE p_metric = 'swipes'
      UNION ALL
      SELECT s.created_at FROM swipes s
        WHERE p_metric = 'likes' AND s.action IN ('like','super')
      UNION ALL
      SELECT m.created_at FROM matches m
        WHERE p_metric = 'matches'
      UNION ALL
      SELECT ms.created_at FROM messages ms
        WHERE p_metric = 'messages'
    ) e
    WHERE e.created_at BETWEEN p_start AND p_end
  )
  SELECT jsonb_agg(jsonb_build_object(
    'bucket', to_char(b.b, CASE WHEN p_bucket = 'hour' THEN 'MM-DD HH24:00' ELSE 'YYYY-MM-DD' END),
    'value', COALESCE(c.cnt, 0)
  ) ORDER BY b.b)
  INTO result
  FROM buckets b
  LEFT JOIN (SELECT b, count(*) cnt FROM events GROUP BY b) c ON c.b = b.b;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------- Distribution
-- p_dimension: gender | age | college | department | semester | graduation | completion | verification
CREATE OR REPLACE FUNCTION public.admin_analytics_distribution(
  p_dimension text,
  p_college uuid DEFAULT NULL,
  p_department uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH fp AS (
    SELECT p.* FROM profiles p
    WHERE (p_college IS NULL OR p.college_id = p_college)
      AND (p_department IS NULL OR p.department_id = p_department)
  ),
  agg AS (
    SELECT
      CASE p_dimension
        WHEN 'gender' THEN COALESCE(gender::text, 'unknown')
        WHEN 'age' THEN CASE
          WHEN date_of_birth IS NULL THEN 'unknown'
          WHEN extract(year FROM age(date_of_birth)) < 21 THEN '18-20'
          WHEN extract(year FROM age(date_of_birth)) < 24 THEN '21-23'
          WHEN extract(year FROM age(date_of_birth)) < 27 THEN '24-26'
          ELSE '27+' END
        WHEN 'college' THEN COALESCE((SELECT name FROM colleges c WHERE c.id = fp.college_id), 'Unknown')
        WHEN 'department' THEN COALESCE((SELECT name FROM departments d WHERE d.id = fp.department_id), 'Unknown')
        WHEN 'semester' THEN COALESCE(semester::text, 'unknown')
        WHEN 'graduation' THEN COALESCE(graduation_year::text, 'unknown')
        WHEN 'completion' THEN CASE WHEN onboarding_completed THEN 'Completed' ELSE 'Incomplete' END
        WHEN 'verification' THEN COALESCE(verification_status::text, 'unknown')
        ELSE 'unknown'
      END AS label
    FROM fp
  )
  SELECT jsonb_agg(jsonb_build_object('name', label, 'value', cnt) ORDER BY cnt DESC)
  INTO result
  FROM (SELECT label, count(*) cnt FROM agg GROUP BY label ORDER BY count(*) DESC LIMIT 20) t;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------- Leaderboard
-- p_kind: colleges_users | colleges_matches | colleges_messages | departments_users | colleges_growth
CREATE OR REPLACE FUNCTION public.admin_analytics_leaderboard(
  p_kind text,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_kind = 'colleges_users' THEN
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC)
    INTO result FROM (
      SELECT c.name, count(p.id) cnt FROM colleges c
      LEFT JOIN profiles p ON p.college_id = c.id
      GROUP BY c.id, c.name ORDER BY count(p.id) DESC LIMIT p_limit) t;
  ELSIF p_kind = 'colleges_matches' THEN
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC)
    INTO result FROM (
      SELECT c.name, count(m.id) cnt FROM colleges c
      LEFT JOIN profiles p ON p.college_id = c.id
      LEFT JOIN matches m ON (m.user_a = p.id OR m.user_b = p.id)
      GROUP BY c.id, c.name ORDER BY count(m.id) DESC LIMIT p_limit) t;
  ELSIF p_kind = 'colleges_messages' THEN
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC)
    INTO result FROM (
      SELECT c.name, count(ms.id) cnt FROM colleges c
      LEFT JOIN profiles p ON p.college_id = c.id
      LEFT JOIN messages ms ON ms.sender_id = p.id
      GROUP BY c.id, c.name ORDER BY count(ms.id) DESC LIMIT p_limit) t;
  ELSIF p_kind = 'departments_users' THEN
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC)
    INTO result FROM (
      SELECT d.name, count(p.id) cnt FROM departments d
      LEFT JOIN profiles p ON p.department_id = d.id
      GROUP BY d.id, d.name ORDER BY count(p.id) DESC LIMIT p_limit) t;
  ELSIF p_kind = 'colleges_growth' THEN
    SELECT jsonb_agg(jsonb_build_object('name', name, 'value', cnt) ORDER BY cnt DESC)
    INTO result FROM (
      SELECT c.name, count(p.id) cnt FROM colleges c
      LEFT JOIN profiles p ON p.college_id = c.id AND p.created_at >= now() - interval '30 days'
      GROUP BY c.id, c.name ORDER BY count(p.id) DESC LIMIT p_limit) t;
  ELSE
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------- Heatmap
-- p_metric: messages | matches | swipes | signups -> 7x24 dow/hour grid
CREATE OR REPLACE FUNCTION public.admin_analytics_heatmap(
  p_metric text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH ev AS (
    SELECT created_at FROM (
      SELECT created_at FROM messages WHERE p_metric = 'messages'
      UNION ALL SELECT created_at FROM matches WHERE p_metric = 'matches'
      UNION ALL SELECT created_at FROM swipes WHERE p_metric = 'swipes'
      UNION ALL SELECT created_at FROM profiles WHERE p_metric = 'signups'
    ) e WHERE created_at BETWEEN p_start AND p_end
  )
  SELECT jsonb_agg(jsonb_build_object(
    'dow', extract(dow FROM created_at)::int,
    'hour', extract(hour FROM created_at)::int,
    'value', 1
  ))
  INTO result
  FROM (
    SELECT date_trunc('hour', created_at) AS created_at FROM ev
  ) x;

  -- collapse to grid counts
  SELECT jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'value', cnt))
  INTO result
  FROM (
    SELECT extract(dow FROM created_at)::int dow, extract(hour FROM created_at)::int hr, count(*) cnt
    FROM ev GROUP BY 1, 2
  ) g;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------- Moderation
CREATE OR REPLACE FUNCTION public.admin_analytics_moderation(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  result := jsonb_build_object(
    'totalReports', (SELECT count(*) FROM reports WHERE created_at BETWEEN p_start AND p_end),
    'byCategory', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', COALESCE(category::text,'other'), 'value', cnt) ORDER BY cnt DESC)
      FROM (SELECT category, count(*) cnt FROM reports WHERE created_at BETWEEN p_start AND p_end GROUP BY category) t
    ), '[]'::jsonb),
    'byStatus', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', COALESCE(status::text,'pending'), 'value', cnt) ORDER BY cnt DESC)
      FROM (SELECT status, count(*) cnt FROM reports WHERE created_at BETWEEN p_start AND p_end GROUP BY status) t
    ), '[]'::jsonb),
    'avgResolutionHours', (
      SELECT COALESCE(round(avg(extract(epoch FROM (resolved_at - created_at)) / 3600)::numeric, 1), 0)
      FROM reports WHERE resolved_at IS NOT NULL AND created_at BETWEEN p_start AND p_end
    ),
    'suspensions', (SELECT count(*) FROM moderation_actions WHERE action::text ILIKE '%suspend%' AND created_at BETWEEN p_start AND p_end),
    'bans', (SELECT count(*) FROM moderation_actions WHERE action::text ILIKE '%ban%' AND created_at BETWEEN p_start AND p_end),
    'warnings', (SELECT count(*) FROM moderation_actions WHERE action::text ILIKE '%warn%' AND created_at BETWEEN p_start AND p_end),
    'repeatOffenders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', COALESCE(pr.display_name, 'User'), 'value', cnt) ORDER BY cnt DESC)
      FROM (SELECT reported_id, count(*) cnt FROM reports WHERE reported_id IS NOT NULL GROUP BY reported_id HAVING count(*) > 1 ORDER BY count(*) DESC LIMIT 10) r
      LEFT JOIN profiles pr ON pr.id = r.reported_id
    ), '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Grants
GRANT EXECUTE ON FUNCTION public.admin_analytics_kpis(timestamptz, timestamptz, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_timeseries(text, timestamptz, timestamptz, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_distribution(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_leaderboard(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_heatmap(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_moderation(timestamptz, timestamptz) TO authenticated;