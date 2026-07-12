
-- ============================================================ admin_logs
CREATE TABLE public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  ip text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read admin logs" ON public.admin_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert admin logs" ON public.admin_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());
CREATE INDEX admin_logs_created_at_idx ON public.admin_logs (created_at DESC);

-- ================================================== admin_login_attempts
CREATE TABLE public.admin_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_login_attempts TO authenticated;
GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read login attempts" ON public.admin_login_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_login_attempts_phone_idx ON public.admin_login_attempts (phone, created_at DESC);

-- ================================================== dashboard stats
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM profiles),
    'verifiedUsers', (SELECT count(*) FROM profiles WHERE verification_status = 'verified'),
    'activeToday', (SELECT count(*) FROM profiles WHERE last_login_at >= date_trunc('day', now())),
    'usersOnline', (SELECT count(*) FROM profiles WHERE last_login_at > now() - interval '5 minutes'),
    'newToday', (SELECT count(*) FROM profiles WHERE created_at >= date_trunc('day', now())),
    'maleUsers', (SELECT count(*) FROM profiles WHERE gender = 'man'),
    'femaleUsers', (SELECT count(*) FROM profiles WHERE gender = 'woman'),
    'totalColleges', (SELECT count(*) FROM colleges),
    'totalDepartments', (SELECT count(*) FROM departments),
    'totalSwipes', (SELECT count(*) FROM swipes),
    'totalLikes', (SELECT count(*) FROM swipes WHERE action IN ('like','super')),
    'totalPasses', (SELECT count(*) FROM swipes WHERE action = 'pass'),
    'totalMatches', (SELECT count(*) FROM matches WHERE status = 'active'),
    'matchesToday', (SELECT count(*) FROM matches WHERE created_at >= date_trunc('day', now())),
    'messagesToday', (SELECT count(*) FROM messages WHERE created_at >= date_trunc('day', now())),
    'totalConversations', (SELECT count(DISTINCT match_id) FROM messages),
    'imagesUploaded', (SELECT count(*) FROM photos) + (SELECT count(*) FROM messages WHERE image_path IS NOT NULL),
    'reportsPending', (SELECT count(*) FROM reports WHERE status = 'pending'),
    'blockedUsers', (SELECT count(DISTINCT blocked_id) FROM blocks),
    'deletedAccounts', (SELECT count(*) FROM profiles WHERE account_status = 'deleted'),
    'suspendedAccounts', (SELECT count(*) FROM profiles WHERE account_status = 'suspended')
  ) INTO result;
  RETURN result;
END;
$$;

-- ================================================== timeseries
CREATE OR REPLACE FUNCTION public.admin_timeseries(_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  WITH days AS (
    SELECT generate_series(date_trunc('day', now()) - ((_days - 1) || ' days')::interval,
                           date_trunc('day', now()), '1 day')::date AS day
  )
  SELECT jsonb_agg(jsonb_build_object(
    'day', d.day,
    'signups', (SELECT count(*) FROM profiles p WHERE p.created_at::date = d.day),
    'matches', (SELECT count(*) FROM matches m WHERE m.created_at::date = d.day),
    'messages', (SELECT count(*) FROM messages msg WHERE msg.created_at::date = d.day),
    'activeUsers', (SELECT count(*) FROM profiles p WHERE p.last_login_at::date = d.day),
    'photos', (SELECT count(*) FROM photos ph WHERE ph.created_at::date = d.day)
  ) ORDER BY d.day) INTO result FROM days d;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ================================================== distributions
CREATE OR REPLACE FUNCTION public.admin_distribution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'gender', COALESCE((
      SELECT jsonb_object_agg(g, c) FROM (
        SELECT COALESCE(gender::text, 'unspecified') AS g, count(*) AS c
        FROM profiles GROUP BY 1
      ) x
    ), '{}'::jsonb),
    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT d.name, count(*) AS c
        FROM profiles p JOIN departments d ON d.id = p.department_id
        GROUP BY d.name ORDER BY c DESC LIMIT 8
      ) dd
    ), '[]'::jsonb),
    'topColleges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT c.name, count(p.id) AS c
        FROM colleges c LEFT JOIN profiles p ON p.college_id = c.id
        GROUP BY c.name ORDER BY c DESC LIMIT 8
      ) cc
    ), '[]'::jsonb),
    'profileCompletion', jsonb_build_object(
      'completed', (SELECT count(*) FROM profiles WHERE onboarding_completed = true),
      'incomplete', (SELECT count(*) FROM profiles WHERE onboarding_completed = false)
    ),
    'collegeGrowth30d', (SELECT count(DISTINCT college_id) FROM profiles WHERE created_at > now() - interval '30 days' AND college_id IS NOT NULL)
  ) INTO result;
  RETURN result;
END;
$$;

-- ================================================== recent activity
CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  WITH events AS (
    SELECT 'registration' AS type, COALESCE(full_name, display_name, 'New user') AS title, created_at AS ts, id FROM profiles
    UNION ALL
    SELECT 'match', 'New match', created_at, id FROM matches
    UNION ALL
    SELECT 'message', 'New message', created_at, id FROM messages
    UNION ALL
    SELECT 'report', 'New report', created_at, id FROM reports
    UNION ALL
    SELECT 'block', 'User blocked', created_at, id FROM blocks
    UNION ALL
    SELECT 'admin_action', action, created_at, id FROM admin_logs
  )
  SELECT jsonb_agg(jsonb_build_object('type', type, 'title', title, 'ts', ts, 'id', id) ORDER BY ts DESC)
  INTO result
  FROM (SELECT * FROM events ORDER BY ts DESC LIMIT GREATEST(_limit, 0)) e;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ================================================== search
CREATE OR REPLACE FUNCTION public.admin_search(_q text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb; q text := '%' || COALESCE(_q, '') || '%';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF length(COALESCE(_q, '')) < 2 THEN
    RETURN jsonb_build_object('users', '[]'::jsonb, 'colleges', '[]'::jsonb, 'reports', '[]'::jsonb);
  END IF;
  SELECT jsonb_build_object(
    'users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', COALESCE(full_name, display_name), 'phone', phone, 'status', account_status))
      FROM (SELECT id, full_name, display_name, phone, account_status FROM profiles
            WHERE full_name ILIKE q OR display_name ILIKE q OR phone ILIKE q LIMIT 10) u
    ), '[]'::jsonb),
    'colleges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'city', city))
      FROM (SELECT id, name, city FROM colleges WHERE name ILIKE q OR COALESCE(city,'') ILIKE q LIMIT 10) c
    ), '[]'::jsonb),
    'reports', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'reason', reason, 'status', status))
      FROM (SELECT id, reason, status FROM reports WHERE reason ILIKE q OR COALESCE(details,'') ILIKE q LIMIT 10) r
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- ================================================== audit logging
CREATE OR REPLACE FUNCTION public.admin_log_action(_action text, _target_table text DEFAULT NULL, _target_id uuid DEFAULT NULL, _ip text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, ip, metadata)
  VALUES (auth.uid(), _action, _target_table, _target_id, _ip, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- ================================================== realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
