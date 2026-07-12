-- ============================================================================
-- Admin Match Management Module
-- ============================================================================

-- 1. Extend matches -----------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_source text NOT NULL DEFAULT 'discovery',
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS investigation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS conversation_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS admin_note text;

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created ON public.matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_flagged ON public.matches(flagged) WHERE flagged;
CREATE INDEX IF NOT EXISTS idx_matches_suspicious ON public.matches(suspicious) WHERE suspicious;
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);

-- 2. match_admin_actions (immutable audit trail) -----------------------------
CREATE TABLE IF NOT EXISTS public.match_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.match_admin_actions TO authenticated;
GRANT ALL ON public.match_admin_actions TO service_role;
ALTER TABLE public.match_admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read match actions" ON public.match_admin_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_match_admin_actions_match ON public.match_admin_actions(match_id);

-- 3. Realtime ----------------------------------------------------------------
ALTER TABLE public.match_admin_actions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_admin_actions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Internal audit helper ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_log_match_action(
  _match_id uuid, _action text, _reason text,
  _previous jsonb, _new jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.match_admin_actions(match_id, admin_id, action, reason, previous_state, new_state)
  VALUES (_match_id, auth.uid(), _action, _reason, COALESCE(_previous,'{}'::jsonb), COALESCE(_new,'{}'::jsonb));
END $$;

-- 5. Stats -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_match_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH m AS (
    SELECT mt.*,
      (SELECT count(*) FROM public.messages msg WHERE msg.match_id = mt.id) AS msg_count,
      (SELECT min(msg.created_at) FROM public.messages msg WHERE msg.match_id = mt.id) AS first_msg
    FROM public.matches mt WHERE mt.deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM m),
    'active', (SELECT count(*) FROM m WHERE status = 'active'),
    'archived', (SELECT count(*) FROM m WHERE status = 'archived'),
    'unmatched', (SELECT count(*) FROM m WHERE status = 'unmatched'),
    'today', (SELECT count(*) FROM m WHERE created_at >= date_trunc('day', now())),
    'week', (SELECT count(*) FROM m WHERE created_at >= now() - interval '7 days'),
    'month', (SELECT count(*) FROM m WHERE created_at >= now() - interval '30 days'),
    'withConversations', (SELECT count(*) FROM m WHERE msg_count > 0),
    'withoutMessages', (SELECT count(*) FROM m WHERE msg_count = 0),
    'totalMessages', (SELECT COALESCE(sum(msg_count),0) FROM m),
    'avgDurationHours', (SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (COALESCE(unmatched_at, now()) - created_at)) / 3600)::numeric, 1),0) FROM m),
    'avgTimeToFirstMsgMins', (SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (first_msg - created_at)) / 60)::numeric, 1),0) FROM m WHERE first_msg IS NOT NULL),
    'successRate', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE msg_count > 0) / count(*), 1) END FROM m),
    'failureRate', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE msg_count = 0) / count(*), 1) END FROM m),
    'suspicious', (SELECT count(*) FROM m WHERE suspicious),
    'flagged', (SELECT count(*) FROM m WHERE flagged),
    'underInvestigation', (SELECT count(*) FROM m WHERE investigation_status = 'investigating')
  ) INTO res;
  RETURN res;
END $$;

-- 6. List --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_matches(
  _search text DEFAULT '', _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest', _limit int DEFAULT 25, _offset int DEFAULT 0
) RETURNS TABLE (
  id uuid, user_a uuid, user_b uuid,
  user_a_name text, user_b_name text, user_a_avatar text, user_b_avatar text,
  college_a text, college_b text, dept_a text, dept_b text,
  created_at timestamptz, first_message_at timestamptz, last_activity timestamptz,
  total_messages bigint, media_count bigint, status text, conversation_status text,
  reports_count bigint, flagged boolean, suspicious boolean, investigation_status text,
  match_duration_secs numeric, total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
#variable_conflict use_column
DECLARE
  f_status text := NULLIF(_filters->>'status','');
  f_dept uuid := NULLIF(_filters->>'department_id','')::uuid;
  f_same text := NULLIF(_filters->>'college','');
  f_activity text := NULLIF(_filters->>'activity','');
  f_flag boolean := (_filters->>'flagged')::boolean;
  f_susp boolean := (_filters->>'suspicious')::boolean;
  f_reported boolean := (_filters->>'reported')::boolean;
  f_media boolean := (_filters->>'has_media')::boolean;
  f_from timestamptz := NULLIF(_filters->>'date_from','')::timestamptz;
  f_to timestamptz := NULLIF(_filters->>'date_to','')::timestamptz;
  s text := lower(trim(COALESCE(_search,'')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT mt.id, mt.user_a, mt.user_b, mt.created_at, mt.status,
      mt.flagged, mt.suspicious, mt.investigation_status, mt.last_message_at, mt.unmatched_at,
      pa.display_name AS user_a_name, pb.display_name AS user_b_name,
      pa.avatar_url AS user_a_avatar, pb.avatar_url AS user_b_avatar,
      pa.phone AS phone_a, pb.phone AS phone_b,
      ca.name AS college_a, cb.name AS college_b,
      da.name AS dept_a, db.name AS dept_b,
      pa.college_id AS college_a_id, pb.college_id AS college_b_id,
      (SELECT count(*) FROM public.messages msg WHERE msg.match_id = mt.id) AS msg_total,
      (SELECT count(*) FROM public.messages msg WHERE msg.match_id = mt.id AND (msg.image_path IS NOT NULL OR msg.audio_path IS NOT NULL)) AS media_total,
      (SELECT min(msg.created_at) FROM public.messages msg WHERE msg.match_id = mt.id) AS first_msg,
      (SELECT count(*) FROM public.reports r WHERE r.reported_id IN (mt.user_a, mt.user_b)) AS rep_count
    FROM public.matches mt
      LEFT JOIN public.profiles pa ON pa.id = mt.user_a
      LEFT JOIN public.profiles pb ON pb.id = mt.user_b
      LEFT JOIN public.colleges ca ON ca.id = pa.college_id
      LEFT JOIN public.colleges cb ON cb.id = pb.college_id
      LEFT JOIN public.departments da ON da.id = pa.department_id
      LEFT JOIN public.departments db ON db.id = pb.department_id
    WHERE mt.deleted_at IS NULL
  ), filtered AS (
    SELECT * FROM base b
    WHERE (f_status IS NULL OR b.status = f_status)
      AND (f_dept IS NULL OR b.dept_a = (SELECT name FROM public.departments WHERE id = f_dept) OR b.dept_b = (SELECT name FROM public.departments WHERE id = f_dept))
      AND (f_flag IS NULL OR b.flagged = f_flag)
      AND (f_susp IS NULL OR b.suspicious = f_susp)
      AND (f_reported IS NULL OR (b.rep_count > 0) = f_reported)
      AND (f_media IS NULL OR (b.media_total > 0) = f_media)
      AND (f_from IS NULL OR b.created_at >= f_from)
      AND (f_to IS NULL OR b.created_at <= f_to)
      AND (f_same IS NULL OR
           (f_same = 'same' AND b.college_a_id IS NOT DISTINCT FROM b.college_b_id) OR
           (f_same = 'different' AND b.college_a_id IS DISTINCT FROM b.college_b_id))
      AND (f_activity IS NULL OR
           (f_activity = 'none' AND b.msg_total = 0) OR
           (f_activity = 'has' AND b.msg_total > 0) OR
           (f_activity = 'high' AND b.msg_total >= 20) OR
           (f_activity = 'low' AND b.msg_total BETWEEN 1 AND 19))
      AND (s = '' OR
           b.id::text = s OR
           b.id::text LIKE s || '%' OR
           lower(COALESCE(b.user_a_name,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.user_b_name,'')) LIKE '%'||s||'%' OR
           COALESCE(b.phone_a,'') LIKE '%'||s||'%' OR
           COALESCE(b.phone_b,'') LIKE '%'||s||'%' OR
           lower(COALESCE(b.college_a,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.college_b,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.dept_a,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.dept_b,'')) LIKE '%'||s||'%')
  ), counted AS (
    SELECT f.*, count(*) OVER() AS total_count FROM filtered f
  )
  SELECT
    c.id, c.user_a, c.user_b, c.user_a_name, c.user_b_name, c.user_a_avatar, c.user_b_avatar,
    c.college_a, c.college_b, c.dept_a, c.dept_b,
    c.created_at, c.first_msg AS first_message_at,
    COALESCE(c.last_message_at, c.created_at) AS last_activity,
    c.msg_total AS total_messages, c.media_total AS media_count, c.status,
    CASE WHEN c.msg_total = 0 THEN 'no_messages' ELSE 'active' END AS conversation_status,
    c.rep_count AS reports_count, c.flagged, c.suspicious, c.investigation_status,
    EXTRACT(EPOCH FROM (COALESCE(c.unmatched_at, now()) - c.created_at))::numeric AS match_duration_secs,
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN _sort = 'newest' THEN c.created_at END DESC NULLS LAST,
    CASE WHEN _sort = 'oldest' THEN c.created_at END ASC NULLS LAST,
    CASE WHEN _sort = 'most_messages' THEN c.msg_total END DESC NULLS LAST,
    CASE WHEN _sort = 'least_messages' THEN c.msg_total END ASC NULLS LAST,
    CASE WHEN _sort = 'most_reports' THEN c.rep_count END DESC NULLS LAST,
    CASE WHEN _sort = 'least_reports' THEN c.rep_count END ASC NULLS LAST,
    CASE WHEN _sort = 'last_activity' THEN COALESCE(c.last_message_at, c.created_at) END DESC NULLS LAST,
    CASE WHEN _sort IN ('longest_active','match_duration') THEN EXTRACT(EPOCH FROM (COALESCE(c.unmatched_at, now()) - c.created_at)) END DESC NULLS LAST,
    CASE WHEN _sort = 'shortest_active' THEN EXTRACT(EPOCH FROM (COALESCE(c.unmatched_at, now()) - c.created_at)) END ASC NULLS LAST,
    c.created_at DESC
  LIMIT _limit OFFSET _offset;
END $$;

-- 7. Detail ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_match_detail(_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb; mt record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO mt FROM public.matches WHERE id = _match_id;
  IF mt IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', mt.id,
    'status', mt.status,
    'matchSource', mt.match_source,
    'createdAt', mt.created_at,
    'lastActivity', COALESCE(mt.last_message_at, mt.created_at),
    'unmatchedAt', mt.unmatched_at,
    'unmatchedBy', mt.unmatched_by,
    'archivedAt', mt.archived_at,
    'deletedAt', mt.deleted_at,
    'flagged', mt.flagged,
    'suspicious', mt.suspicious,
    'investigationStatus', mt.investigation_status,
    'conversationDisabled', mt.conversation_disabled,
    'adminNote', mt.admin_note,
    'firstLikeAt', (SELECT min(created_at) FROM public.swipes WHERE (actor_id = mt.user_a AND target_id = mt.user_b) OR (actor_id = mt.user_b AND target_id = mt.user_a)),
    'mutualLikeAt', mt.created_at,
    'participantA', public.admin_match_participant(mt.user_a),
    'participantB', public.admin_match_participant(mt.user_b),
    'conversation', (
      SELECT jsonb_build_object(
        'total', count(*),
        'text', count(*) FILTER (WHERE msg.body IS NOT NULL AND msg.image_path IS NULL AND msg.audio_path IS NULL),
        'images', count(*) FILTER (WHERE msg.image_path IS NOT NULL),
        'voice', count(*) FILTER (WHERE msg.audio_path IS NOT NULL),
        'replies', count(*) FILTER (WHERE msg.reply_to IS NOT NULL),
        'read', count(*) FILTER (WHERE msg.read_at IS NOT NULL),
        'firstAt', min(msg.created_at),
        'lastAt', max(msg.created_at),
        'startedBy', (SELECT sender_id FROM public.messages m2 WHERE m2.match_id = mt.id ORDER BY m2.created_at ASC LIMIT 1)
      ) FROM public.messages msg WHERE msg.match_id = mt.id
    ),
    'firstNote', (
      SELECT jsonb_build_object('sender', msg.sender_id, 'timestamp', msg.created_at, 'content', msg.body)
      FROM public.messages msg WHERE msg.match_id = mt.id ORDER BY msg.created_at ASC LIMIT 1
    ),
    'recentMessages', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.created_at DESC), '[]'::jsonb) FROM (
        SELECT msg.id, msg.sender_id, msg.body, msg.image_path, msg.audio_path, msg.created_at
        FROM public.messages msg WHERE msg.match_id = mt.id ORDER BY msg.created_at DESC LIMIT 20
      ) x
    ),
    'reports', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'reporterId', r.reporter_id, 'reportedId', r.reported_id,
        'reason', r.reason, 'status', r.status, 'createdAt', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.reports r WHERE r.reported_id IN (mt.user_a, mt.user_b)
    )
  ) INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_match_participant(_uid uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'id', p.id, 'name', COALESCE(p.display_name, p.full_name), 'phone', p.phone,
    'avatar', p.avatar_url, 'college', c.name, 'department', d.name,
    'semester', p.semester, 'graduationYear', p.graduation_year,
    'accountStatus', p.account_status, 'verificationStatus', p.verification_status,
    'onboardingCompleted', p.onboarding_completed
  ) FROM public.profiles p
    LEFT JOIN public.colleges c ON c.id = p.college_id
    LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = _uid;
$$;

-- 8. Actions history ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_match_actions(_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id, 'action', a.action, 'reason', a.reason,
    'previousState', a.previous_state, 'newState', a.new_state,
    'adminName', COALESCE(pr.display_name, pr.full_name),
    'createdAt', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO res FROM public.match_admin_actions a
    LEFT JOIN public.profiles pr ON pr.id = a.admin_id
  WHERE a.match_id = _match_id;
  RETURN res;
END $$;

-- 9. Analytics ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_match_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'byDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(d.day,'Mon DD'), 'count', d.c) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at) AS day, count(*) AS c
        FROM public.matches WHERE deleted_at IS NULL AND created_at >= now() - interval '30 days'
        GROUP BY 1
      ) d
    ),
    'byCollege', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.name, 'count', x.c) ORDER BY x.c DESC), '[]'::jsonb)
      FROM (
        SELECT c.name, count(*) AS c
        FROM public.matches mt
          LEFT JOIN public.profiles p ON p.id = mt.user_a
          LEFT JOIN public.colleges c ON c.id = p.college_id
        WHERE mt.deleted_at IS NULL AND c.name IS NOT NULL
        GROUP BY c.name ORDER BY c DESC LIMIT 8
      ) x
    ),
    'unmatchByDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(d.day,'Mon DD'), 'count', d.c) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', unmatched_at) AS day, count(*) AS c
        FROM public.matches WHERE unmatched_at IS NOT NULL AND unmatched_at >= now() - interval '30 days'
        GROUP BY 1
      ) d
    )
  ) INTO res;
  RETURN res;
END $$;

-- 10. Mutations --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_archive_match(_match_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF prev = 'archived' THEN RAISE EXCEPTION 'Match already archived'; END IF;
  UPDATE public.matches SET status = 'archived', archived_at = now(), archived_by = auth.uid() WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, 'archive', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','archived'));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_restore_match(_match_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  UPDATE public.matches SET status = 'active', archived_at = NULL, archived_by = NULL, deleted_at = NULL, deleted_by = NULL WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, 'restore', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','active'));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_match(_match_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  UPDATE public.matches SET status = 'deleted', deleted_at = now(), deleted_by = auth.uid() WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, 'delete', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','deleted'));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_force_unmatch(_match_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF prev = 'unmatched' THEN RAISE EXCEPTION 'Already unmatched'; END IF;
  UPDATE public.matches SET status = 'unmatched', unmatched_at = now(), unmatched_by = auth.uid(), conversation_disabled = true WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, 'force_unmatch', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','unmatched'));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_conversation(_match_id uuid, _disabled boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT conversation_disabled INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  UPDATE public.matches SET conversation_disabled = _disabled WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, CASE WHEN _disabled THEN 'disable_conversation' ELSE 'enable_conversation' END, _reason, jsonb_build_object('conversation_disabled', prev), jsonb_build_object('conversation_disabled', _disabled));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_flag_match(_match_id uuid, _flagged boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT flagged INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  UPDATE public.matches SET flagged = _flagged WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, CASE WHEN _flagged THEN 'flag' ELSE 'unflag' END, _reason, jsonb_build_object('flagged', prev), jsonb_build_object('flagged', _flagged));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_suspicious(_match_id uuid, _suspicious boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT suspicious INTO prev FROM public.matches WHERE id = _match_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  UPDATE public.matches SET suspicious = _suspicious, investigation_status = CASE WHEN _suspicious THEN 'investigating' ELSE 'none' END WHERE id = _match_id;
  PERFORM public.admin_log_match_action(_match_id, CASE WHEN _suspicious THEN 'mark_suspicious' ELSE 'clear_suspicious' END, _reason, jsonb_build_object('suspicious', prev), jsonb_build_object('suspicious', _suspicious));
  RETURN jsonb_build_object('ok', true);
END $$;