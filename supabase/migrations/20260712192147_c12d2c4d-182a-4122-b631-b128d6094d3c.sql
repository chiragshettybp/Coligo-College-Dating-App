-- ============================================================================
-- ADMIN USER LIST (search + filters + sort + server pagination)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT '',
  _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest',
  _limit integer DEFAULT 25,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, full_name text, phone text, avatar text, gender text, age integer,
  college_name text, department_name text, semester integer, graduation_year integer,
  created_at timestamptz, last_login_at timestamptz, account_status text,
  verification_status text, discovery boolean, online boolean, profile_completion integer,
  matches_count bigint, chats_count bigint, reports_received bigint, device_count bigint,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  order_clause text;
  q text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  order_clause := CASE _sort
    WHEN 'oldest' THEN 'created_at ASC'
    WHEN 'name' THEN 'full_name ASC NULLS LAST'
    WHEN 'last_login' THEN 'last_login_at DESC NULLS LAST'
    WHEN 'most_matches' THEN 'matches_count DESC'
    WHEN 'most_messages' THEN 'chats_count DESC'
    WHEN 'most_reports' THEN 'reports_received DESC'
    WHEN 'profile_completion' THEN 'profile_completion DESC'
    ELSE 'created_at DESC'
  END;

  q := format($q$
    SELECT
      p.id, p.full_name, p.phone,
      (SELECT ph.storage_path FROM public.photos ph WHERE ph.user_id = p.id ORDER BY ph.is_primary DESC, ph.position LIMIT 1) AS avatar,
      p.gender::text,
      CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE date_part('year', age(p.date_of_birth))::int END AS age,
      c.name AS college_name, d.name AS department_name, p.semester, p.graduation_year,
      p.created_at, p.last_login_at, p.account_status::text, p.verification_status,
      COALESCE(s.discovery_enabled, true) AS discovery,
      (p.last_login_at > now() - interval '5 minutes') AS online,
      ((CASE WHEN p.full_name IS NOT NULL AND p.full_name <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN p.bio IS NOT NULL AND p.bio <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN p.gender IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.date_of_birth IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.college_id IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.department_id IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.semester IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.graduation_year IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN p.looking_for IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN EXISTS (SELECT 1 FROM public.photos ph WHERE ph.user_id = p.id) THEN 1 ELSE 0 END)) * 10 AS profile_completion,
      (SELECT count(*) FROM public.matches m WHERE (m.user_a = p.id OR m.user_b = p.id) AND m.status = 'active') AS matches_count,
      (SELECT count(*) FROM public.matches m WHERE (m.user_a = p.id OR m.user_b = p.id) AND m.last_message_at IS NOT NULL) AS chats_count,
      (SELECT count(*) FROM public.reports r WHERE r.reported_id = p.id) AS reports_received,
      (SELECT count(*) FROM public.device_sessions ds WHERE ds.user_id = p.id AND ds.revoked = false) AS device_count,
      count(*) OVER() AS total_count
    FROM public.profiles p
    LEFT JOIN public.colleges c ON c.id = p.college_id
    LEFT JOIN public.departments d ON d.id = p.department_id
    LEFT JOIN public.settings s ON s.user_id = p.id
    WHERE
      ($1 = '' OR p.full_name ILIKE '%%'||$1||'%%' OR COALESCE(p.display_name,'') ILIKE '%%'||$1||'%%'
        OR COALESCE(p.phone,'') ILIKE '%%'||$1||'%%' OR c.name ILIKE '%%'||$1||'%%'
        OR d.name ILIKE '%%'||$1||'%%' OR p.id::text ILIKE '%%'||$1||'%%')
      AND ($2->>'status' IS NULL OR p.account_status::text = $2->>'status')
      AND ($2->>'verification' IS NULL OR p.verification_status = $2->>'verification')
      AND ($2->>'gender' IS NULL OR p.gender::text = $2->>'gender')
      AND ($2->>'college_id' IS NULL OR p.college_id::text = $2->>'college_id')
      AND ($2->>'department_id' IS NULL OR p.department_id::text = $2->>'department_id')
      AND ($2->>'semester' IS NULL OR p.semester = ($2->>'semester')::int)
      AND ($2->>'graduation_year' IS NULL OR p.graduation_year = ($2->>'graduation_year')::int)
      AND ($2->>'online' IS NULL OR ($2->>'online')::bool = (p.last_login_at > now() - interval '5 minutes'))
      AND ($2->>'discovery' IS NULL OR COALESCE(s.discovery_enabled, true) = ($2->>'discovery')::bool)
      AND ($2->>'reported' IS NULL OR ($2->>'reported')::bool = EXISTS (SELECT 1 FROM public.reports r WHERE r.reported_id = p.id))
      AND ($2->>'never_logged_in' IS NULL OR ($2->>'never_logged_in')::bool = (p.last_login_at IS NULL))
    ORDER BY %s
    LIMIT %s OFFSET %s
  $q$, order_clause, GREATEST(_limit, 0), GREATEST(_offset, 0));

  RETURN QUERY EXECUTE q USING _search, COALESCE(_filters, '{}'::jsonb);
END;
$function$;

-- ============================================================================
-- ADMIN USER DETAIL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_detail(_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN NOT public.has_role(auth.uid(), 'admin') THEN
    jsonb_build_object('error', 'Forbidden')
  WHEN p.id IS NULL THEN NULL
  ELSE jsonb_build_object(
    'id', p.id,
    'fullName', p.full_name,
    'displayName', p.display_name,
    'phone', p.phone,
    'avatarUrl', p.avatar_url,
    'bio', p.bio,
    'gender', p.gender,
    'dateOfBirth', p.date_of_birth,
    'age', CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE date_part('year', age(p.date_of_birth))::int END,
    'lookingFor', p.looking_for,
    'collegeName', c.name,
    'departmentName', d.name,
    'semester', p.semester,
    'graduationYear', p.graduation_year,
    'accountStatus', p.account_status,
    'verificationStatus', p.verification_status,
    'onboardingCompleted', p.onboarding_completed,
    'onboardingStep', p.onboarding_step,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at,
    'lastLoginAt', p.last_login_at,
    'online', (p.last_login_at > now() - interval '5 minutes'),
    'discoveryEnabled', COALESCE(s.discovery_enabled, true),
    'profileVisible', COALESCE(s.profile_visible, true),
    'showOnlineStatus', COALESCE(s.show_online_status, true),
    'deviceCount', (SELECT count(*) FROM public.device_sessions ds WHERE ds.user_id = p.id AND ds.revoked = false),
    'photos', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.storage_path, 'isPrimary', ph.is_primary, 'position', ph.position, 'createdAt', ph.created_at) ORDER BY ph.is_primary DESC, ph.position), '[]'::jsonb) FROM public.photos ph WHERE ph.user_id = p.id),
    'interests', (SELECT COALESCE(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb) FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id WHERE ui.user_id = p.id)
  ) END
  FROM (SELECT _user_id AS id) k
  LEFT JOIN public.profiles p ON p.id = k.id
  LEFT JOIN public.colleges c ON c.id = p.college_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  LEFT JOIN public.settings s ON s.user_id = p.id;
$function$;

-- ============================================================================
-- ADMIN USER STATISTICS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'totalSwipes', (SELECT count(*) FROM swipes WHERE actor_id = _user_id),
    'likesGiven', (SELECT count(*) FROM swipes WHERE actor_id = _user_id AND action IN ('like','super')),
    'likesReceived', (SELECT count(*) FROM swipes WHERE target_id = _user_id AND action IN ('like','super')),
    'passes', (SELECT count(*) FROM swipes WHERE actor_id = _user_id AND action = 'pass'),
    'matches', (SELECT count(*) FROM matches WHERE (user_a = _user_id OR user_b = _user_id) AND status = 'active'),
    'unmatches', (SELECT count(*) FROM matches WHERE (user_a = _user_id OR user_b = _user_id) AND status = 'unmatched'),
    'messagesSent', (SELECT count(*) FROM messages WHERE sender_id = _user_id),
    'mediaUploaded', (SELECT count(*) FROM photos WHERE user_id = _user_id) + (SELECT count(*) FROM messages WHERE sender_id = _user_id AND image_path IS NOT NULL),
    'reportsReceived', (SELECT count(*) FROM reports WHERE reported_id = _user_id),
    'reportsSubmitted', (SELECT count(*) FROM reports WHERE reporter_id = _user_id),
    'blocksMade', (SELECT count(*) FROM blocks WHERE blocker_id = _user_id),
    'blocksReceived', (SELECT count(*) FROM blocks WHERE blocked_id = _user_id),
    'notifications', (SELECT count(*) FROM notifications WHERE user_id = _user_id AND deleted_at IS NULL)
  );
END;
$function$;

-- ============================================================================
-- ADMIN USER MATCHES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_matches(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'matchId', m.id,
      'status', m.status,
      'createdAt', m.created_at,
      'lastMessageAt', m.last_message_at,
      'messageCount', (SELECT count(*) FROM messages msg WHERE msg.match_id = m.id),
      'other', jsonb_build_object(
        'id', o.id, 'fullName', o.full_name,
        'avatar', (SELECT storage_path FROM photos ph WHERE ph.user_id = o.id ORDER BY is_primary DESC, position LIMIT 1)
      )
    ) ORDER BY m.created_at DESC)
    FROM matches m
    JOIN profiles o ON o.id = CASE WHEN m.user_a = _user_id THEN m.user_b ELSE m.user_a END
    WHERE m.user_a = _user_id OR m.user_b = _user_id
  ), '[]'::jsonb);
END;
$function$;

-- ============================================================================
-- ADMIN USER REPORTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_reports(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'against', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'createdAt', r.created_at,
        'reporter', (SELECT full_name FROM profiles WHERE id = r.reporter_id)) ORDER BY r.created_at DESC)
      FROM reports r WHERE r.reported_id = _user_id
    ), '[]'::jsonb),
    'submitted', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'createdAt', r.created_at,
        'reported', (SELECT full_name FROM profiles WHERE id = r.reported_id)) ORDER BY r.created_at DESC)
      FROM reports r WHERE r.reporter_id = _user_id
    ), '[]'::jsonb)
  );
END;
$function$;

-- ============================================================================
-- ADMIN USER DEVICES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_devices(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', ds.id, 'platform', ds.platform, 'lastSeenAt', ds.last_seen_at,
      'revoked', ds.revoked, 'createdAt', ds.created_at
    ) ORDER BY ds.last_seen_at DESC)
    FROM device_sessions ds WHERE ds.user_id = _user_id
  ), '[]'::jsonb);
END;
$function$;

-- ============================================================================
-- ADMIN USER TIMELINE (derived activity)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_user_timeline(_user_id uuid, _limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH events AS (
    SELECT 'account_created' AS type, 'Account created' AS title, created_at AS ts FROM profiles WHERE id = _user_id
    UNION ALL
    SELECT 'photo_uploaded', 'Photo uploaded', created_at FROM photos WHERE user_id = _user_id
    UNION ALL
    SELECT 'match_created', 'Match created', created_at FROM matches WHERE user_a = _user_id OR user_b = _user_id
    UNION ALL
    SELECT 'message_sent', 'Message sent', created_at FROM messages WHERE sender_id = _user_id
    UNION ALL
    SELECT 'report_submitted', 'Report submitted', created_at FROM reports WHERE reporter_id = _user_id
    UNION ALL
    SELECT 'blocked_user', 'Blocked a user', created_at FROM blocks WHERE blocker_id = _user_id
    UNION ALL
    SELECT 'admin_action', action, created_at FROM admin_logs WHERE target_id = _user_id
  )
  SELECT jsonb_agg(jsonb_build_object('type', type, 'title', title, 'ts', ts) ORDER BY ts DESC)
  INTO result
  FROM (SELECT * FROM events ORDER BY ts DESC LIMIT GREATEST(_limit, 0)) e;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

-- ============================================================================
-- MODERATION: set account status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot moderate your own account'; END IF;
  IF _status NOT IN ('active','suspended','banned','deleted') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT account_status::text INTO prev FROM profiles WHERE id = _user_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF prev = _status THEN RAISE EXCEPTION 'User is already %', _status; END IF;

  UPDATE profiles SET account_status = _status::account_status, updated_at = now() WHERE id = _user_id;

  IF _status IN ('suspended','banned','deleted') THEN
    UPDATE settings SET discovery_enabled = false, profile_visible = false, updated_at = now() WHERE user_id = _user_id;
  ELSIF _status = 'active' THEN
    UPDATE settings SET discovery_enabled = true, profile_visible = true, updated_at = now() WHERE user_id = _user_id;
  END IF;

  IF _status = 'banned' THEN
    UPDATE device_sessions SET revoked = true WHERE user_id = _user_id AND revoked = false;
  END IF;

  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'set_account_status', 'profiles', _user_id,
    jsonb_build_object('from', prev, 'to', _status, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'from', prev, 'to', _status);
END;
$function$;

-- ============================================================================
-- MODERATION: set verification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_verification(_user_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('verified','unverified','pending') THEN RAISE EXCEPTION 'Invalid verification status'; END IF;
  SELECT verification_status INTO prev FROM profiles WHERE id = _user_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  UPDATE profiles SET verification_status = _status, updated_at = now() WHERE id = _user_id;
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'set_verification', 'profiles', _user_id, jsonb_build_object('from', prev, 'to', _status));
  RETURN jsonb_build_object('ok', true, 'from', prev, 'to', _status);
END;
$function$;

-- ============================================================================
-- MODERATION: reset discovery
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_discovery(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE settings SET discovery_enabled = true, profile_visible = true, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'reset_discovery', 'settings', _user_id, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- ============================================================================
-- MODERATION: force logout (revoke all sessions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_force_logout(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE device_sessions SET revoked = true WHERE user_id = _user_id AND revoked = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'force_logout', 'device_sessions', _user_id, jsonb_build_object('sessionsRevoked', n));
  RETURN jsonb_build_object('ok', true, 'sessionsRevoked', n);
END;
$function$;

-- ============================================================================
-- MODERATION: clear reports against a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_clear_reports(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE reports SET status = 'resolved' WHERE reported_id = _user_id AND status <> 'resolved';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'clear_reports', 'reports', _user_id, jsonb_build_object('resolved', n));
  RETURN jsonb_build_object('ok', true, 'resolved', n);
END;
$function$;