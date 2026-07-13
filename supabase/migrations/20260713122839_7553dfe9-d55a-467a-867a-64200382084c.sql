-- ============================================================================
-- Admin Logs & Observability Module — unified audit log view + SECURITY DEFINER
-- RPCs. Normalizes every existing audit source into one append-only stream.
-- Every RPC re-checks has_role(auth.uid(),'admin') and raises 'Forbidden'.
-- No new user-data tables; reads existing tables only (append-only by design).
-- ============================================================================

-- Supporting indexes for time-ordered scans (idempotent).
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON public.moderation_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_admin_actions_created_at ON public.chat_admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_admin_actions_created_at ON public.match_admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_created_at ON public.settings_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON public.error_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at ON public.admin_login_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_sessions_created_at ON public.device_sessions (created_at DESC);

-- ---------------------------------------------------------------- unified view
-- Read-only normalizing view. Immutable by construction (no writes possible).
CREATE OR REPLACE VIEW public.unified_logs AS
  -- Admin actions
  SELECT
    'admin_logs'::text AS source,
    ('admin_logs:' || a.id::text) AS log_id,
    a.id AS row_id,
    'admin'::text AS category,
    'info'::text AS severity,
    a.action AS event,
    (a.action || COALESCE(' · ' || a.target_table, '')) AS description,
    NULL::uuid AS user_id,
    a.admin_id AS admin_id,
    a.ip AS ip,
    NULL::text AS device,
    COALESCE(a.target_table, 'admin') AS module,
    NULL::text AS status,
    NULL::text AS request_id,
    a.target_table AS related_entity_type,
    a.target_id::text AS related_entity_id,
    a.metadata AS metadata,
    a.created_at AS created_at
  FROM public.admin_logs a

  UNION ALL
  -- Moderation actions
  SELECT
    'moderation_actions', ('moderation_actions:' || m.id::text), m.id,
    'moderation',
    CASE WHEN m.action IN ('ban','suspend','remove_content','escalate') THEN 'warning' ELSE 'info' END,
    m.action,
    COALESCE(m.reason, m.action),
    m.target_user_id, m.admin_id, NULL, NULL, 'moderation',
    COALESCE(m.new_status, m.previous_status),
    NULL, 'report', m.report_id::text,
    COALESCE(m.metadata, '{}'::jsonb) || jsonb_build_object('previous_status', m.previous_status, 'new_status', m.new_status),
    m.created_at
  FROM public.moderation_actions m

  UNION ALL
  -- Chat moderation actions
  SELECT
    'chat_admin_actions', ('chat_admin_actions:' || c.id::text), c.id,
    'moderation',
    CASE WHEN c.action IN ('lock','remove','delete') THEN 'warning' ELSE 'info' END,
    c.action, COALESCE(c.reason, c.action),
    NULL, c.admin_id, NULL, NULL, 'chat', NULL, NULL,
    'chat', c.chat_id::text,
    COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object('previous_state', c.previous_state, 'new_state', c.new_state),
    c.created_at
  FROM public.chat_admin_actions c

  UNION ALL
  -- Match moderation actions
  SELECT
    'match_admin_actions', ('match_admin_actions:' || ma.id::text), ma.id,
    'moderation', 'info',
    ma.action, COALESCE(ma.reason, ma.action),
    NULL, ma.admin_id, NULL, NULL, 'matches', NULL, NULL,
    'match', ma.match_id::text,
    COALESCE(ma.metadata, '{}'::jsonb) || jsonb_build_object('previous_state', ma.previous_state, 'new_state', ma.new_state),
    ma.created_at
  FROM public.match_admin_actions ma

  UNION ALL
  -- Settings changes
  SELECT
    'settings_audit_log', ('settings_audit_log:' || s.id::text), s.id,
    'system', 'info',
    'setting_changed', (s.category || ' · ' || s.setting_key),
    NULL, s.admin_id, s.ip, NULL, s.category, NULL, NULL,
    'setting', s.setting_key,
    jsonb_build_object('previous_value', s.previous_value, 'new_value', s.new_value, 'reason', s.reason),
    s.created_at
  FROM public.settings_audit_log s

  UNION ALL
  -- Client / application errors
  SELECT
    'error_reports', ('error_reports:' || e.id::text), e.id,
    'system',
    CASE WHEN e.status = 'critical' THEN 'critical' ELSE 'error' END,
    'client_error', e.message,
    e.user_id, NULL, NULL,
    NULLIF(e.device_info->>'platform',''),
    COALESCE(e.route, 'app'),
    e.status, e.error_id, NULL, NULL,
    jsonb_build_object('route', e.route, 'stack', e.stack, 'session_id', e.session_id, 'device_info', e.device_info),
    e.created_at
  FROM public.error_reports e

  UNION ALL
  -- Admin login attempts (security / auth)
  SELECT
    'admin_login_attempts', ('admin_login_attempts:' || al.id::text), al.id,
    'security',
    CASE WHEN al.success THEN 'info' ELSE 'warning' END,
    CASE WHEN al.success THEN 'admin_login_success' ELSE 'admin_login_failed' END,
    CASE WHEN al.success THEN 'Admin login succeeded' ELSE 'Admin login failed' END,
    NULL, NULL, al.ip, NULL, 'auth',
    CASE WHEN al.success THEN 'success' ELSE 'failed' END,
    NULL, NULL, NULL,
    jsonb_build_object('phone', al.phone, 'success', al.success),
    al.created_at
  FROM public.admin_login_attempts al

  UNION ALL
  -- System / user activity events
  SELECT
    'system_logs', ('system_logs:' || sl.id::text), sl.id,
    'user', 'info',
    sl.event_type, sl.event_type,
    sl.user_id, NULL, NULL, NULL, 'app', NULL, NULL,
    NULL, NULL,
    COALESCE(sl.metadata, '{}'::jsonb) || jsonb_build_object('path', sl.path, 'referrer', sl.referrer),
    sl.created_at
  FROM public.system_logs sl

  UNION ALL
  -- Device sessions (auth)
  SELECT
    'device_sessions', ('device_sessions:' || ds.id::text), ds.id,
    'auth', 'info',
    CASE WHEN ds.revoked THEN 'session_revoked' ELSE 'session_created' END,
    CASE WHEN ds.revoked THEN 'Session revoked' ELSE 'Session created' END,
    ds.user_id, NULL, NULL, ds.platform, 'auth',
    CASE WHEN ds.revoked THEN 'revoked' ELSE 'active' END,
    NULL, NULL, NULL,
    jsonb_build_object('platform', ds.platform, 'last_seen_at', ds.last_seen_at, 'revoked', ds.revoked),
    ds.created_at
  FROM public.device_sessions ds;

-- ---------------------------------------------------------------- LIST + search
CREATE OR REPLACE FUNCTION public.admin_logs_list(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_sort text DEFAULT 'newest',
  p_page int DEFAULT 0,
  p_page_size int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start timestamptz := COALESCE((p_filters->>'start')::timestamptz, now() - interval '30 days');
  v_end   timestamptz := COALESCE((p_filters->>'end')::timestamptz, now());
  v_q     text := NULLIF(trim(COALESCE(p_filters->>'q','')), '');
  v_cats  text[] := CASE WHEN p_filters ? 'categories' THEN ARRAY(SELECT jsonb_array_elements_text(p_filters->'categories')) END;
  v_sevs  text[] := CASE WHEN p_filters ? 'severities' THEN ARRAY(SELECT jsonb_array_elements_text(p_filters->'severities')) END;
  v_status text := NULLIF(p_filters->>'status','');
  v_admin uuid := NULLIF(p_filters->>'admin_id','')::uuid;
  v_user  uuid := NULLIF(p_filters->>'user_id','')::uuid;
  v_size  int := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
  v_off   int := GREATEST(COALESCE(p_page, 0), 0) * v_size;
  v_total bigint;
  v_rows  jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  CREATE TEMP TABLE _lg ON COMMIT DROP AS
    SELECT * FROM public.unified_logs u
    WHERE u.created_at BETWEEN v_start AND v_end
      AND (v_cats IS NULL OR u.category = ANY(v_cats))
      AND (v_sevs IS NULL OR u.severity = ANY(v_sevs))
      AND (v_status IS NULL OR u.status = v_status)
      AND (v_admin IS NULL OR u.admin_id = v_admin)
      AND (v_user IS NULL OR u.user_id = v_user)
      AND (
        v_q IS NULL
        OR u.event ILIKE '%'||v_q||'%'
        OR u.description ILIKE '%'||v_q||'%'
        OR u.ip ILIKE '%'||v_q||'%'
        OR u.request_id ILIKE '%'||v_q||'%'
        OR u.log_id ILIKE '%'||v_q||'%'
        OR u.related_entity_id ILIKE '%'||v_q||'%'
        OR u.user_id::text = v_q
        OR u.admin_id::text = v_q
        OR u.metadata::text ILIKE '%'||v_q||'%'
      );

  SELECT count(*) INTO v_total FROM _lg;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows FROM (
    SELECT
      l.log_id, l.source, l.row_id, l.category, l.severity, l.event, l.description,
      l.user_id, l.admin_id, l.ip, l.device, l.module, l.status, l.request_id,
      l.related_entity_type, l.related_entity_id, l.metadata, l.created_at,
      (l.metadata IS NOT NULL AND l.metadata <> '{}'::jsonb) AS has_metadata,
      up.display_name AS user_name, up.phone AS user_phone,
      ap.display_name AS admin_name, ap.phone AS admin_phone
    FROM _lg l
    LEFT JOIN profiles up ON up.id = l.user_id
    LEFT JOIN profiles ap ON ap.id = l.admin_id
    ORDER BY
      CASE WHEN p_sort = 'oldest' THEN l.created_at END ASC,
      CASE WHEN p_sort = 'severity_high' THEN
        (array_position(ARRAY['critical','error','warning','info'], l.severity)) END ASC,
      CASE WHEN p_sort = 'severity_low' THEN
        (array_position(ARRAY['critical','error','warning','info'], l.severity)) END DESC,
      l.created_at DESC
    LIMIT v_size OFFSET v_off
  ) t;

  DROP TABLE IF EXISTS _lg;
  RETURN jsonb_build_object('total', v_total, 'page', GREATEST(COALESCE(p_page,0),0), 'pageSize', v_size, 'rows', v_rows);
END;
$$;

-- ---------------------------------------------------------------- KPIs
CREATE OR REPLACE FUNCTION public.admin_logs_kpis(
  p_start timestamptz DEFAULT (now() - interval '30 days'),
  p_end timestamptz DEFAULT now()
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

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM unified_logs WHERE created_at BETWEEN p_start AND p_end),
    'today', (SELECT count(*) FROM unified_logs WHERE created_at >= date_trunc('day', now())),
    'errorsToday', (SELECT count(*) FROM unified_logs WHERE severity IN ('error','critical') AND created_at >= date_trunc('day', now())),
    'critical', (SELECT count(*) FROM unified_logs WHERE severity = 'critical' AND created_at BETWEEN p_start AND p_end),
    'securityEvents', (SELECT count(*) FROM unified_logs WHERE category = 'security' AND created_at BETWEEN p_start AND p_end),
    'failedLogins', (SELECT count(*) FROM unified_logs WHERE event = 'admin_login_failed' AND created_at BETWEEN p_start AND p_end),
    'successfulLogins', (SELECT count(*) FROM unified_logs WHERE event = 'admin_login_success' AND created_at BETWEEN p_start AND p_end),
    'adminActions', (SELECT count(*) FROM unified_logs WHERE category = 'admin' AND created_at BETWEEN p_start AND p_end),
    'moderationActions', (SELECT count(*) FROM unified_logs WHERE category = 'moderation' AND created_at BETWEEN p_start AND p_end),
    'apiErrors', (SELECT count(*) FROM unified_logs WHERE category = 'api' AND severity IN ('error','critical') AND created_at BETWEEN p_start AND p_end),
    'storageErrors', (SELECT count(*) FROM unified_logs WHERE category = 'storage' AND severity IN ('error','critical') AND created_at BETWEEN p_start AND p_end),
    'realtimeErrors', (SELECT count(*) FROM unified_logs WHERE category = 'realtime' AND severity IN ('error','critical') AND created_at BETWEEN p_start AND p_end),
    'activeSessions', (SELECT count(*) FROM device_sessions WHERE revoked = false),
    'suspicious', (SELECT count(*) FROM unified_logs WHERE severity IN ('warning','critical') AND category IN ('security','moderation') AND created_at BETWEEN p_start AND p_end)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Timeseries
-- p_metric: all | errors | auth | admin | moderation | security
CREATE OR REPLACE FUNCTION public.admin_logs_timeseries(
  p_metric text DEFAULT 'all',
  p_start timestamptz DEFAULT (now() - interval '7 days'),
  p_end timestamptz DEFAULT now(),
  p_bucket text DEFAULT 'day'
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
    FROM unified_logs
    WHERE created_at BETWEEN p_start AND p_end
      AND (
        p_metric = 'all'
        OR (p_metric = 'errors' AND severity IN ('error','critical'))
        OR (p_metric = 'auth' AND category = 'auth')
        OR (p_metric = 'admin' AND category = 'admin')
        OR (p_metric = 'moderation' AND category = 'moderation')
        OR (p_metric = 'security' AND category = 'security')
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bucket', to_char(bk.b, CASE WHEN p_bucket = 'hour' THEN 'MM-DD HH24:00' ELSE 'YYYY-MM-DD' END),
    'value', COALESCE(cnt.c, 0)
  ) ORDER BY bk.b), '[]'::jsonb) INTO result
  FROM buckets bk
  LEFT JOIN (SELECT b, count(*) AS c FROM events GROUP BY b) cnt ON cnt.b = bk.b;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Distribution
-- p_dimension: category | severity | source | module
CREATE OR REPLACE FUNCTION public.admin_logs_distribution(
  p_dimension text DEFAULT 'category',
  p_start timestamptz DEFAULT (now() - interval '30 days'),
  p_end timestamptz DEFAULT now()
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', c) ORDER BY c DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT
      CASE p_dimension
        WHEN 'severity' THEN severity
        WHEN 'source' THEN source
        WHEN 'module' THEN module
        ELSE category
      END AS name,
      count(*) AS c
    FROM unified_logs
    WHERE created_at BETWEEN p_start AND p_end
    GROUP BY 1
    HAVING CASE p_dimension
        WHEN 'severity' THEN severity
        WHEN 'source' THEN source
        WHEN 'module' THEN module
        ELSE category END IS NOT NULL
  ) d;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Detail
CREATE OR REPLACE FUNCTION public.admin_logs_detail(
  p_source text,
  p_id uuid
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

  SELECT row_to_json(t)::jsonb INTO result FROM (
    SELECT
      l.*, 
      up.display_name AS user_name, up.phone AS user_phone,
      ap.display_name AS admin_name, ap.phone AS admin_phone
    FROM unified_logs l
    LEFT JOIN profiles up ON up.id = l.user_id
    LEFT JOIN profiles ap ON ap.id = l.admin_id
    WHERE l.source = p_source AND l.row_id = p_id
    LIMIT 1
  ) t;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------- Investigation
-- p_key_type: user | admin | request | match | chat | report | session
CREATE OR REPLACE FUNCTION public.admin_logs_investigation(
  p_key_type text,
  p_key_value text
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

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT
      l.log_id, l.source, l.row_id, l.category, l.severity, l.event, l.description,
      l.user_id, l.admin_id, l.ip, l.device, l.module, l.status, l.request_id,
      l.related_entity_type, l.related_entity_id, l.metadata, l.created_at
    FROM unified_logs l
    WHERE
      (p_key_type = 'user' AND l.user_id::text = p_key_value)
      OR (p_key_type = 'admin' AND l.admin_id::text = p_key_value)
      OR (p_key_type = 'request' AND l.request_id = p_key_value)
      OR (p_key_type IN ('match','chat','report') AND l.related_entity_type = p_key_type AND l.related_entity_id = p_key_value)
      OR (p_key_type = 'session' AND l.metadata->>'session_id' = p_key_value)
    LIMIT 500
  ) t;

  RETURN result;
END;
$$;

-- Grants: RPCs are admin-gated internally; expose to authenticated only.
REVOKE ALL ON FUNCTION public.admin_logs_list(jsonb, text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs_kpis(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs_timeseries(text, timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs_distribution(text, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs_detail(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_logs_investigation(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_logs_list(jsonb, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_kpis(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_timeseries(text, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_distribution(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_detail(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logs_investigation(text, text) TO authenticated;

-- The view is only ever queried through SECURITY DEFINER RPCs; do not expose it.
REVOKE ALL ON public.unified_logs FROM PUBLIC, anon, authenticated;