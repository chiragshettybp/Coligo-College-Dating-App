-- ============================================================================
-- Admin Chat Management & Moderation Module
-- A "chat" is a match (chatId === matchId). This migration layers a
-- conversation-centric moderation surface over the existing matches/messages
-- data: per-message moderation flags, an immutable chat audit trail, private
-- moderator notes, and admin-gated RPCs for stats/list/detail/history/
-- analytics/mutations. Every RPC re-checks has_role(auth.uid(),'admin').
-- ============================================================================

-- 1. Per-message moderation columns ------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid;

CREATE INDEX IF NOT EXISTS idx_messages_flagged ON public.messages(flagged) WHERE flagged;
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON public.messages(match_id, created_at);

-- Conversation-level moderation flags on matches (lock reuses conversation_disabled)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid;

-- 2. chat_admin_actions (immutable audit trail) ------------------------------
CREATE TABLE IF NOT EXISTS public.chat_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_admin_actions TO authenticated;
GRANT ALL ON public.chat_admin_actions TO service_role;
ALTER TABLE public.chat_admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read chat actions" ON public.chat_admin_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_chat_admin_actions_chat ON public.chat_admin_actions(chat_id);

-- 3. chat_moderator_notes (private notes) ------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_moderator_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_moderator_notes TO authenticated;
GRANT ALL ON public.chat_moderator_notes TO service_role;
ALTER TABLE public.chat_moderator_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read chat notes" ON public.chat_moderator_notes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write chat notes" ON public.chat_moderator_notes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());
CREATE POLICY "Admins update own chat notes" ON public.chat_moderator_notes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND author_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_chat_moderator_notes_chat ON public.chat_moderator_notes(chat_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_chat_notes_updated ON public.chat_moderator_notes;
CREATE TRIGGER trg_chat_notes_updated BEFORE UPDATE ON public.chat_moderator_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Realtime ----------------------------------------------------------------
ALTER TABLE public.chat_admin_actions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_moderator_notes REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_admin_actions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_moderator_notes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Internal audit helper ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_log_chat_action(
  _chat_id uuid, _action text, _reason text, _previous jsonb, _new jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.chat_admin_actions(chat_id, admin_id, action, reason, previous_state, new_state)
  VALUES (_chat_id, auth.uid(), _action, _reason, COALESCE(_previous,'{}'::jsonb), COALESCE(_new,'{}'::jsonb));
  INSERT INTO public.admin_logs(admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'chat_' || _action, 'matches', _chat_id, jsonb_build_object('reason', _reason));
END $$;

-- Count reactions stored in messages.reactions jsonb ({emoji: [userIds]})
CREATE OR REPLACE FUNCTION public.chat_reaction_count(_reactions jsonb)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE((
    SELECT sum(jsonb_array_length(value))::int
    FROM jsonb_each(COALESCE(_reactions, '{}'::jsonb))
    WHERE jsonb_typeof(value) = 'array'
  ), 0);
$$;

-- 6. Stats -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_chat_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH m AS (
    SELECT mt.*,
      (SELECT count(*) FROM public.messages msg WHERE msg.match_id = mt.id) AS msg_count
    FROM public.matches mt WHERE mt.deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'totalConversations', (SELECT count(*) FROM m WHERE msg_count > 0),
    'activeConversations', (SELECT count(*) FROM m WHERE status = 'active' AND NOT conversation_disabled AND msg_count > 0),
    'archivedConversations', (SELECT count(*) FROM m WHERE status = 'archived'),
    'lockedConversations', (SELECT count(*) FROM m WHERE conversation_disabled),
    'messagesToday', (SELECT count(*) FROM public.messages WHERE created_at >= date_trunc('day', now())),
    'messagesWeek', (SELECT count(*) FROM public.messages WHERE created_at >= now() - interval '7 days'),
    'imagesShared', (SELECT count(*) FROM public.messages WHERE image_path IS NOT NULL),
    'voiceNotes', (SELECT count(*) FROM public.messages WHERE audio_path IS NOT NULL),
    'reactions', (SELECT COALESCE(sum(public.chat_reaction_count(reactions)),0) FROM public.messages),
    'replies', (SELECT count(*) FROM public.messages WHERE reply_to IS NOT NULL),
    'reported', (SELECT count(DISTINCT mt.id) FROM m mt JOIN public.reports r ON r.reported_id IN (mt.user_a, mt.user_b)),
    'underReview', (SELECT count(*) FROM m WHERE investigation_status = 'investigating'),
    'avgLength', (SELECT COALESCE(round(avg(msg_count)::numeric, 1), 0) FROM m WHERE msg_count > 0),
    'avgMessagesPerMatch', (SELECT COALESCE(round(avg(msg_count)::numeric, 1), 0) FROM m),
    'activeChatters', (SELECT count(DISTINCT sender_id) FROM public.messages WHERE created_at >= now() - interval '7 days'),
    'chatsToday', (SELECT count(*) FROM m WHERE created_at >= date_trunc('day', now()))
  ) INTO res;
  RETURN res;
END $$;

-- 7. List --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_chats(
  _search text DEFAULT '', _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest', _limit int DEFAULT 25, _offset int DEFAULT 0
) RETURNS TABLE (
  id uuid, user_a uuid, user_b uuid,
  user_a_name text, user_b_name text, user_a_avatar text, user_b_avatar text,
  college_a text, college_b text, dept_a text, dept_b text, same_college boolean,
  created_at timestamptz, last_activity timestamptz,
  total_messages bigint, images bigint, voice bigint, replies bigint, reactions bigint,
  read_count bigint, reports_count bigint,
  status text, conversation_disabled boolean, flagged boolean, investigation_status text,
  total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
#variable_conflict use_column
DECLARE
  f_status text := NULLIF(_filters->>'status','');
  f_same text := NULLIF(_filters->>'college','');
  f_activity text := NULLIF(_filters->>'activity','');
  f_reported boolean := (_filters->>'reported')::boolean;
  f_media boolean := (_filters->>'has_media')::boolean;
  f_voice boolean := (_filters->>'has_voice')::boolean;
  f_replies boolean := (_filters->>'has_replies')::boolean;
  f_reactions boolean := (_filters->>'has_reactions')::boolean;
  f_empty boolean := (_filters->>'no_messages')::boolean;
  f_from timestamptz := NULLIF(_filters->>'date_from','')::timestamptz;
  f_to timestamptz := NULLIF(_filters->>'date_to','')::timestamptz;
  s text := lower(trim(COALESCE(_search,'')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT mt.id, mt.user_a, mt.user_b, mt.created_at, mt.status,
      mt.flagged, mt.investigation_status, mt.conversation_disabled, mt.last_message_at,
      pa.display_name AS user_a_name, pb.display_name AS user_b_name,
      pa.avatar_url AS user_a_avatar, pb.avatar_url AS user_b_avatar,
      pa.phone AS phone_a, pb.phone AS phone_b,
      ca.name AS college_a, cb.name AS college_b,
      da.name AS dept_a, db.name AS dept_b,
      (pa.college_id IS NOT DISTINCT FROM pb.college_id) AS same_college,
      agg.msg_total, agg.img_total, agg.voice_total, agg.reply_total, agg.react_total, agg.read_total, agg.last_msg,
      (SELECT count(*) FROM public.reports r WHERE r.reported_id IN (mt.user_a, mt.user_b)) AS rep_count
    FROM public.matches mt
      LEFT JOIN public.profiles pa ON pa.id = mt.user_a
      LEFT JOIN public.profiles pb ON pb.id = mt.user_b
      LEFT JOIN public.colleges ca ON ca.id = pa.college_id
      LEFT JOIN public.colleges cb ON cb.id = pb.college_id
      LEFT JOIN public.departments da ON da.id = pa.department_id
      LEFT JOIN public.departments db ON db.id = pb.department_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS msg_total,
          count(*) FILTER (WHERE msg.image_path IS NOT NULL) AS img_total,
          count(*) FILTER (WHERE msg.audio_path IS NOT NULL) AS voice_total,
          count(*) FILTER (WHERE msg.reply_to IS NOT NULL) AS reply_total,
          COALESCE(sum(public.chat_reaction_count(msg.reactions)),0) AS react_total,
          count(*) FILTER (WHERE msg.read_at IS NOT NULL) AS read_total,
          max(msg.created_at) AS last_msg
        FROM public.messages msg WHERE msg.match_id = mt.id
      ) agg ON true
    WHERE mt.deleted_at IS NULL
  ), filtered AS (
    SELECT * FROM base b
    WHERE (f_status IS NULL
             OR (f_status = 'active' AND b.status = 'active' AND NOT b.conversation_disabled)
             OR (f_status = 'archived' AND b.status = 'archived')
             OR (f_status = 'locked' AND b.conversation_disabled)
             OR (f_status = 'reported' AND b.rep_count > 0))
      AND (f_reported IS NULL OR (b.rep_count > 0) = f_reported)
      AND (f_media IS NULL OR (b.img_total > 0) = f_media)
      AND (f_voice IS NULL OR (b.voice_total > 0) = f_voice)
      AND (f_replies IS NULL OR (b.reply_total > 0) = f_replies)
      AND (f_reactions IS NULL OR (b.react_total > 0) = f_reactions)
      AND (f_empty IS NULL OR (b.msg_total = 0) = f_empty)
      AND (f_from IS NULL OR b.created_at >= f_from)
      AND (f_to IS NULL OR b.created_at <= f_to)
      AND (f_same IS NULL OR
           (f_same = 'same' AND b.same_college) OR
           (f_same = 'different' AND NOT b.same_college))
      AND (f_activity IS NULL OR
           (f_activity = 'high' AND b.msg_total >= 20) OR
           (f_activity = 'low' AND b.msg_total BETWEEN 1 AND 19))
      AND (s = '' OR
           b.id::text = s OR b.id::text LIKE s || '%' OR
           lower(COALESCE(b.user_a_name,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.user_b_name,'')) LIKE '%'||s||'%' OR
           COALESCE(b.phone_a,'') LIKE '%'||s||'%' OR
           COALESCE(b.phone_b,'') LIKE '%'||s||'%' OR
           lower(COALESCE(b.college_a,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.college_b,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.dept_a,'')) LIKE '%'||s||'%' OR
           lower(COALESCE(b.dept_b,'')) LIKE '%'||s||'%')
  ), counted AS (
    SELECT f.*, count(*) OVER() AS total_c FROM filtered f
  )
  SELECT c.id, c.user_a, c.user_b, c.user_a_name, c.user_b_name, c.user_a_avatar, c.user_b_avatar,
    c.college_a, c.college_b, c.dept_a, c.dept_b, c.same_college,
    c.created_at, COALESCE(c.last_msg, c.last_message_at, c.created_at) AS last_activity,
    c.msg_total, c.img_total, c.voice_total, c.reply_total, c.react_total, c.read_total, c.rep_count,
    c.status, c.conversation_disabled, c.flagged, c.investigation_status, c.total_c
  FROM counted c
  ORDER BY
    CASE WHEN _sort = 'newest' THEN c.created_at END DESC,
    CASE WHEN _sort = 'oldest' THEN c.created_at END ASC,
    CASE WHEN _sort = 'last_activity' THEN COALESCE(c.last_msg, c.last_message_at, c.created_at) END DESC,
    CASE WHEN _sort = 'most_messages' THEN c.msg_total END DESC,
    CASE WHEN _sort = 'least_messages' THEN c.msg_total END ASC,
    CASE WHEN _sort = 'most_media' THEN (c.img_total + c.voice_total) END DESC,
    CASE WHEN _sort = 'most_reports' THEN c.rep_count END DESC,
    c.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
END $$;

-- 8. Detail ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_chat_detail(_chat_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb; mt record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO mt FROM public.matches WHERE id = _chat_id;
  IF mt IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id', mt.id,
    'status', mt.status,
    'matchSource', mt.match_source,
    'createdAt', mt.created_at,
    'lastActivity', COALESCE(mt.last_message_at, mt.created_at),
    'unmatchedAt', mt.unmatched_at,
    'archivedAt', mt.archived_at,
    'deletedAt', mt.deleted_at,
    'lockedAt', mt.locked_at,
    'flagged', mt.flagged,
    'suspicious', mt.suspicious,
    'investigationStatus', mt.investigation_status,
    'conversationDisabled', mt.conversation_disabled,
    'adminNote', mt.admin_note,
    'participantA', public.admin_match_participant(mt.user_a),
    'participantB', public.admin_match_participant(mt.user_b),
    'conversation', (
      SELECT jsonb_build_object(
        'total', count(*),
        'text', count(*) FILTER (WHERE msg.body IS NOT NULL AND msg.image_path IS NULL AND msg.audio_path IS NULL),
        'images', count(*) FILTER (WHERE msg.image_path IS NOT NULL),
        'voice', count(*) FILTER (WHERE msg.audio_path IS NOT NULL),
        'replies', count(*) FILTER (WHERE msg.reply_to IS NOT NULL),
        'reactions', COALESCE(sum(public.chat_reaction_count(msg.reactions)),0),
        'read', count(*) FILTER (WHERE msg.read_at IS NOT NULL),
        'firstAt', min(msg.created_at),
        'lastAt', max(msg.created_at),
        'startedBy', (SELECT sender_id FROM public.messages m2 WHERE m2.match_id = mt.id ORDER BY m2.created_at ASC LIMIT 1)
      ) FROM public.messages msg WHERE msg.match_id = mt.id
    ),
    'timeline', (
      SELECT COALESCE(jsonb_agg(ev ORDER BY ev->>'at'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('type','match_created','at',mt.created_at) AS ev
        UNION ALL SELECT jsonb_build_object('type','first_message','at', min(created_at)) FROM public.messages WHERE match_id = mt.id
        UNION ALL SELECT jsonb_build_object('type','first_image','at', min(created_at)) FROM public.messages WHERE match_id = mt.id AND image_path IS NOT NULL
        UNION ALL SELECT jsonb_build_object('type','first_voice','at', min(created_at)) FROM public.messages WHERE match_id = mt.id AND audio_path IS NOT NULL
        UNION ALL SELECT jsonb_build_object('type','archived','at', mt.archived_at) WHERE mt.archived_at IS NOT NULL
        UNION ALL SELECT jsonb_build_object('type','locked','at', mt.locked_at) WHERE mt.locked_at IS NOT NULL
        UNION ALL SELECT jsonb_build_object('type','unmatched','at', mt.unmatched_at) WHERE mt.unmatched_at IS NOT NULL
      ) t WHERE ev->>'at' IS NOT NULL
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

-- 9. Message history (paginated, oldest window before a cursor) ---------------
CREATE OR REPLACE FUNCTION public.admin_chat_messages(
  _chat_id uuid, _before timestamptz DEFAULT NULL, _limit int DEFAULT 40
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb; lim int := LEAST(GREATEST(_limit,1), 100); rows_found int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH page AS (
    SELECT msg.* FROM public.messages msg
    WHERE msg.match_id = _chat_id
      AND (_before IS NULL OR msg.created_at < _before)
    ORDER BY msg.created_at DESC
    LIMIT lim + 1
  )
  SELECT COALESCE(jsonb_agg(x ORDER BY x.created_at ASC), '[]'::jsonb) INTO res FROM (
    SELECT p.id, p.sender_id, p.body, p.image_path, p.audio_path, p.audio_duration_ms,
      p.kind, p.reply_to, p.reactions, p.read_at, p.delivered_at, p.created_at,
      p.flagged, p.hidden_at,
      (SELECT jsonb_build_object('id', rp.id, 'body', rp.body, 'senderId', rp.sender_id, 'kind', rp.kind)
        FROM public.messages rp WHERE rp.id = p.reply_to) AS reply
    FROM (SELECT * FROM page ORDER BY created_at DESC LIMIT lim) p
  ) x;
  SELECT count(*) INTO rows_found FROM public.messages WHERE match_id = _chat_id AND (_before IS NULL OR created_at < _before);
  RETURN jsonb_build_object('messages', res, 'hasMore', rows_found > lim);
END $$;

-- 10. Analytics --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_chat_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'messagesByDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(d.day,'Mon DD'), 'count', d.c) ORDER BY d.day), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at) AS day, count(*) AS c
        FROM public.messages WHERE created_at >= now() - interval '30 days' GROUP BY 1) d
    ),
    'mediaByDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', to_char(d.day,'Mon DD'), 'images', d.img, 'voice', d.voi) ORDER BY d.day), '[]'::jsonb)
      FROM (SELECT date_trunc('day', created_at) AS day,
              count(*) FILTER (WHERE image_path IS NOT NULL) AS img,
              count(*) FILTER (WHERE audio_path IS NOT NULL) AS voi
        FROM public.messages WHERE created_at >= now() - interval '30 days' GROUP BY 1) d
    ),
    'byCollege', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.name, 'count', x.c) ORDER BY x.c DESC), '[]'::jsonb)
      FROM (SELECT c.name, count(*) AS c
        FROM public.matches mt
          JOIN public.messages msg ON msg.match_id = mt.id
          LEFT JOIN public.profiles p ON p.id = mt.user_a
          LEFT JOIN public.colleges c ON c.id = p.college_id
        WHERE mt.deleted_at IS NULL AND c.name IS NOT NULL
        GROUP BY c.name ORDER BY c DESC LIMIT 8) x
    )
  ) INTO res;
  RETURN res;
END $$;

-- 11. Mutations --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_lock_chat(_chat_id uuid, _lock boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT conversation_disabled INTO prev FROM public.matches WHERE id = _chat_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  IF prev = _lock THEN RAISE EXCEPTION 'Chat already in requested state'; END IF;
  UPDATE public.matches SET conversation_disabled = _lock,
    locked_at = CASE WHEN _lock THEN now() ELSE NULL END,
    locked_by = CASE WHEN _lock THEN auth.uid() ELSE NULL END
  WHERE id = _chat_id;
  PERFORM public.admin_log_chat_action(_chat_id, CASE WHEN _lock THEN 'lock' ELSE 'unlock' END, _reason,
    jsonb_build_object('conversationDisabled', prev), jsonb_build_object('conversationDisabled', _lock));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_archive_chat(_chat_id uuid, _restore boolean DEFAULT false, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _chat_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  IF _restore THEN
    UPDATE public.matches SET status = 'active', archived_at = NULL, archived_by = NULL WHERE id = _chat_id;
    PERFORM public.admin_log_chat_action(_chat_id, 'restore', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','active'));
  ELSE
    IF prev = 'archived' THEN RAISE EXCEPTION 'Chat already archived'; END IF;
    UPDATE public.matches SET status = 'archived', archived_at = now(), archived_by = auth.uid() WHERE id = _chat_id;
    PERFORM public.admin_log_chat_action(_chat_id, 'archive', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','archived'));
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_flag_chat(_chat_id uuid, _flag boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT flagged INTO prev FROM public.matches WHERE id = _chat_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  UPDATE public.matches SET flagged = _flag WHERE id = _chat_id;
  PERFORM public.admin_log_chat_action(_chat_id, CASE WHEN _flag THEN 'flag' ELSE 'unflag' END, _reason,
    jsonb_build_object('flagged', prev), jsonb_build_object('flagged', _flag));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_escalate_chat(_chat_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('none','investigating','resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT investigation_status INTO prev FROM public.matches WHERE id = _chat_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  UPDATE public.matches SET investigation_status = _status, suspicious = (_status = 'investigating') WHERE id = _chat_id;
  PERFORM public.admin_log_chat_action(_chat_id, 'escalate', _reason,
    jsonb_build_object('investigationStatus', prev), jsonb_build_object('investigationStatus', _status));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_chat(_chat_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM public.matches WHERE id = _chat_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Chat not found'; END IF;
  UPDATE public.matches SET status = 'deleted', deleted_at = now(), deleted_by = auth.uid(), conversation_disabled = true WHERE id = _chat_id;
  PERFORM public.admin_log_chat_action(_chat_id, 'delete', _reason, jsonb_build_object('status', prev), jsonb_build_object('status','deleted'));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_flag_message(_message_id uuid, _flag boolean, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO m FROM public.messages WHERE id = _message_id;
  IF m IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  UPDATE public.messages SET flagged = _flag WHERE id = _message_id;
  PERFORM public.admin_log_chat_action(m.match_id, CASE WHEN _flag THEN 'flag_message' ELSE 'unflag_message' END, _reason,
    jsonb_build_object('messageId', _message_id, 'flagged', m.flagged), jsonb_build_object('messageId', _message_id, 'flagged', _flag));
  RETURN jsonb_build_object('ok', true);
END $$;

-- 12. Notes + actions history ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_chat_notes(_chat_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', n.id, 'body', n.body, 'authorName', COALESCE(pr.display_name, pr.full_name),
    'createdAt', n.created_at, 'updatedAt', n.updated_at
  ) ORDER BY n.created_at DESC), '[]'::jsonb)
  INTO res FROM public.chat_moderator_notes n
    LEFT JOIN public.profiles pr ON pr.id = n.author_id
  WHERE n.chat_id = _chat_id;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.admin_chat_actions(_chat_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id, 'action', a.action, 'reason', a.reason,
    'previousState', a.previous_state, 'newState', a.new_state,
    'adminName', COALESCE(pr.display_name, pr.full_name), 'createdAt', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO res FROM public.chat_admin_actions a
    LEFT JOIN public.profiles pr ON pr.id = a.admin_id
  WHERE a.chat_id = _chat_id;
  RETURN res;
END $$;