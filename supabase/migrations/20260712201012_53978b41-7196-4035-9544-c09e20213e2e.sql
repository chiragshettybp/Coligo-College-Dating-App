
-- ============================================================================
-- 1. Extend reports
-- ============================================================================
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS source_module text NOT NULL DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS action_taken text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

UPDATE public.reports SET category = COALESCE(category, reason) WHERE category IS NULL;
UPDATE public.reports SET status = 'open' WHERE status IS NULL OR status NOT IN
  ('open','under_review','escalated','resolved','rejected','archived');

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_assigned ON public.reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);

-- keep updated_at fresh
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. report_evidence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'image',
  storage_path text,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_evidence TO authenticated;
GRANT ALL ON public.report_evidence TO service_role;
ALTER TABLE public.report_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage report evidence" ON public.report_evidence
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_report_evidence_report ON public.report_evidence(report_id);

-- ============================================================================
-- 3. moderation_notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_notes TO authenticated;
GRANT ALL ON public.moderation_notes TO service_role;
ALTER TABLE public.moderation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage moderation notes" ON public.moderation_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_moderation_notes_report ON public.moderation_notes(report_id);
DROP TRIGGER IF EXISTS update_moderation_notes_updated_at ON public.moderation_notes;
CREATE TRIGGER update_moderation_notes_updated_at BEFORE UPDATE ON public.moderation_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. moderation_actions (immutable audit trail of moderation decisions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  target_user_id uuid,
  previous_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read moderation actions" ON public.moderation_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON public.moderation_actions(report_id);

-- ============================================================================
-- 5. Realtime
-- ============================================================================
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.moderation_notes REPLICA IDENTITY FULL;
ALTER TABLE public.moderation_actions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_notes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_actions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 6. RPCs
-- ============================================================================

-- ---- dashboard stat cards ----
CREATE OR REPLACE FUNCTION public.admin_report_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM reports),
    'open', (SELECT count(*) FROM reports WHERE status = 'open'),
    'underReview', (SELECT count(*) FROM reports WHERE status = 'under_review'),
    'awaitingAssignment', (SELECT count(*) FROM reports WHERE assigned_to IS NULL AND status NOT IN ('resolved','rejected','archived')),
    'escalated', (SELECT count(*) FROM reports WHERE status = 'escalated'),
    'high', (SELECT count(*) FROM reports WHERE priority = 'high' AND status NOT IN ('resolved','rejected','archived')),
    'critical', (SELECT count(*) FROM reports WHERE priority = 'critical' AND status NOT IN ('resolved','rejected','archived')),
    'resolvedToday', (SELECT count(*) FROM reports WHERE status = 'resolved' AND resolved_at >= date_trunc('day', now())),
    'rejectedToday', (SELECT count(*) FROM reports WHERE status = 'rejected' AND updated_at >= date_trunc('day', now())),
    'avgResolutionHours', COALESCE((SELECT round(avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1) FROM reports WHERE resolved_at IS NOT NULL), 0),
    'repeatOffenders', (SELECT count(*) FROM (SELECT reported_id FROM reports WHERE reported_id IS NOT NULL GROUP BY reported_id HAVING count(*) > 1) t),
    'last24h', (SELECT count(*) FROM reports WHERE created_at >= now() - interval '24 hours'),
    'last7d', (SELECT count(*) FROM reports WHERE created_at >= now() - interval '7 days')
  ) INTO res;
  RETURN res;
END; $$;

-- ---- paginated list + search + filters + sort ----
CREATE OR REPLACE FUNCTION public.admin_list_reports(
  _search text DEFAULT '',
  _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest',
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, reporter_id uuid, reporter_name text,
  reported_id uuid, reported_name text, reported_avatar text,
  reason text, category text, priority text, status text,
  created_at timestamptz, updated_at timestamptz,
  assigned_to uuid, assigned_name text,
  college_name text, source_module text, action_taken text,
  evidence_count bigint, previous_reports bigint, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  f_status text := NULLIF(_filters->>'status','');
  f_category text := NULLIF(_filters->>'category','');
  f_priority text := NULLIF(_filters->>'priority','');
  f_college uuid := NULLIF(_filters->>'college_id','')::uuid;
  f_moderator uuid := NULLIF(_filters->>'moderator','')::uuid;
  f_repeat boolean := COALESCE((_filters->>'repeat_offender')::boolean, false);
  f_from timestamptz := NULLIF(_filters->>'date_from','')::timestamptz;
  f_to timestamptz := NULLIF(_filters->>'date_to','')::timestamptz;
  q text := '%' || lower(coalesce(_search,'')) || '%';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT r.*,
      rp.full_name AS f_reporter,
      tp.full_name AS f_reported, tp.avatar_url AS f_avatar, tp.college_id AS f_college_id,
      cg.name AS f_college,
      ap.full_name AS f_assigned,
      (SELECT count(*) FROM report_evidence e WHERE e.report_id = r.id) AS f_evidence,
      (SELECT count(*) FROM reports r2 WHERE r2.reported_id = r.reported_id) AS f_prev
    FROM reports r
    LEFT JOIN profiles rp ON rp.id = r.reporter_id
    LEFT JOIN profiles tp ON tp.id = r.reported_id
    LEFT JOIN colleges cg ON cg.id = tp.college_id
    LEFT JOIN profiles ap ON ap.id = r.assigned_to
  ), filtered AS (
    SELECT * FROM base b
    WHERE (f_status IS NULL OR b.status = f_status)
      AND (f_category IS NULL OR b.category = f_category)
      AND (f_priority IS NULL OR b.priority = f_priority)
      AND (f_college IS NULL OR b.f_college_id = f_college)
      AND (f_moderator IS NULL OR b.assigned_to = f_moderator)
      AND (f_from IS NULL OR b.created_at >= f_from)
      AND (f_to IS NULL OR b.created_at <= f_to)
      AND (NOT f_repeat OR b.f_prev > 1)
      AND (
        coalesce(_search,'') = '' OR
        b.id::text ILIKE q OR
        lower(coalesce(b.f_reporter,'')) LIKE q OR
        lower(coalesce(b.f_reported,'')) LIKE q OR
        lower(coalesce(b.f_college,'')) LIKE q OR
        lower(coalesce(b.category,'')) LIKE q OR
        lower(coalesce(b.reason,'')) LIKE q OR
        lower(coalesce(b.f_assigned,'')) LIKE q
      )
  ), counted AS (
    SELECT *, count(*) OVER () AS f_total FROM filtered
  )
  SELECT
    c.id, c.reporter_id, c.f_reporter,
    c.reported_id, c.f_reported, c.f_avatar,
    c.reason, c.category, c.priority, c.status,
    c.created_at, c.updated_at,
    c.assigned_to, c.f_assigned,
    c.f_college, c.source_module, c.action_taken,
    c.f_evidence, c.f_prev, c.f_total
  FROM counted c
  ORDER BY
    CASE WHEN _sort = 'oldest' THEN c.created_at END ASC,
    CASE WHEN _sort = 'recently_updated' THEN c.updated_at END DESC,
    CASE WHEN _sort = 'longest_pending' AND c.status NOT IN ('resolved','rejected','archived') THEN c.created_at END ASC,
    CASE WHEN _sort = 'most_reported' THEN c.f_prev END DESC,
    CASE WHEN _sort = 'priority_high' THEN
      (CASE c.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) END DESC,
    CASE WHEN _sort = 'priority_low' THEN
      (CASE c.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) END ASC,
    c.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

-- ---- full detail ----
CREATE OR REPLACE FUNCTION public.admin_report_detail(_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'id', r.id,
    'reason', r.reason,
    'category', r.category,
    'priority', r.priority,
    'status', r.status,
    'sourceModule', r.source_module,
    'resolution', r.resolution,
    'actionTaken', r.action_taken,
    'createdAt', r.created_at,
    'updatedAt', r.updated_at,
    'reviewedAt', r.reviewed_at,
    'resolvedAt', r.resolved_at,
    'details', r.details,
    'assignedTo', r.assigned_to,
    'assignedName', (SELECT full_name FROM profiles WHERE id = r.assigned_to),
    'reporter', CASE WHEN r.reporter_id IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object('id', p.id, 'name', p.full_name, 'avatar', p.avatar_url,
        'college', (SELECT name FROM colleges WHERE id = p.college_id),
        'accountStatus', p.account_status, 'createdAt', p.created_at,
        'reportsSubmitted', (SELECT count(*) FROM reports x WHERE x.reporter_id = p.id),
        'matches', (SELECT count(*) FROM matches m WHERE m.user_a = p.id OR m.user_b = p.id))
      FROM profiles p WHERE p.id = r.reporter_id) END,
    'reported', CASE WHEN r.reported_id IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object('id', p.id, 'name', p.full_name, 'avatar', p.avatar_url, 'bio', p.bio,
        'college', (SELECT name FROM colleges WHERE id = p.college_id),
        'accountStatus', p.account_status, 'verificationStatus', p.verification_status,
        'createdAt', p.created_at,
        'reportsReceived', (SELECT count(*) FROM reports x WHERE x.reported_id = p.id),
        'photos', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ph.id, 'path', ph.storage_path) ORDER BY ph.position) FROM photos ph WHERE ph.user_id = p.id), '[]'::jsonb))
      FROM profiles p WHERE p.id = r.reported_id) END,
    'evidence', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'path', e.storage_path, 'content', e.content, 'metadata', e.metadata, 'createdAt', e.created_at) ORDER BY e.created_at) FROM report_evidence e WHERE e.report_id = r.id), '[]'::jsonb)
  ) INTO res
  FROM reports r WHERE r.id = _report_id;
  RETURN res;
END; $$;

-- ---- notes ----
CREATE OR REPLACE FUNCTION public.admin_report_notes(_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'authorId', n.author_id,
      'authorName', (SELECT full_name FROM profiles WHERE id = n.author_id),
      'createdAt', n.created_at, 'updatedAt', n.updated_at) ORDER BY n.created_at DESC)
    FROM moderation_notes n WHERE n.report_id = _report_id
  ), '[]'::jsonb);
END; $$;

-- ---- action timeline ----
CREATE OR REPLACE FUNCTION public.admin_report_actions(_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action, 'reason', a.reason,
      'previousStatus', a.previous_status, 'newStatus', a.new_status,
      'adminName', (SELECT full_name FROM profiles WHERE id = a.admin_id),
      'metadata', a.metadata, 'createdAt', a.created_at) ORDER BY a.created_at DESC)
    FROM moderation_actions a WHERE a.report_id = _report_id
  ), '[]'::jsonb);
END; $$;

-- ---- analytics ----
CREATE OR REPLACE FUNCTION public.admin_report_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'byDay', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'count', d.c) ORDER BY d.day)
      FROM (SELECT date_trunc('day', created_at) AS day, count(*) AS c FROM reports
            WHERE created_at >= now() - interval '30 days' GROUP BY 1) d), '[]'::jsonb),
    'byCategory', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', coalesce(category,'other'), 'count', c) ORDER BY c DESC)
      FROM (SELECT category, count(*) AS c FROM reports GROUP BY category) t), '[]'::jsonb),
    'byStatus', COALESCE((
      SELECT jsonb_object_agg(status, c) FROM (SELECT status, count(*) AS c FROM reports GROUP BY status) t), '{}'::jsonb),
    'byCollege', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'count', c) ORDER BY c DESC)
      FROM (SELECT cg.name, count(*) AS c FROM reports r JOIN profiles p ON p.id = r.reported_id JOIN colleges cg ON cg.id = p.college_id GROUP BY cg.name ORDER BY c DESC LIMIT 8) t), '[]'::jsonb),
    'repeatOffenders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name, 'count', t.c) ORDER BY t.c DESC)
      FROM (SELECT reported_id, count(*) AS c FROM reports WHERE reported_id IS NOT NULL GROUP BY reported_id HAVING count(*) > 1 ORDER BY count(*) DESC LIMIT 10) t
      JOIN profiles p ON p.id = t.reported_id), '[]'::jsonb),
    'avgResolutionHours', COALESCE((SELECT round(avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1) FROM reports WHERE resolved_at IS NOT NULL), 0)
  ) INTO res;
  RETURN res;
END; $$;

-- ---- mutations ----
CREATE OR REPLACE FUNCTION public.admin_assign_report(_report_id uuid, _moderator_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO prev FROM reports WHERE id = _report_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  UPDATE reports SET assigned_to = _moderator_id,
    status = CASE WHEN status = 'open' THEN 'under_review' ELSE status END,
    reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = _report_id;
  INSERT INTO moderation_actions (report_id, admin_id, action, target_user_id, previous_status, new_status, metadata)
  VALUES (_report_id, auth.uid(), 'assign', _moderator_id, prev,
    (SELECT status FROM reports WHERE id = _report_id), jsonb_build_object('moderator', _moderator_id));
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'assign_report', 'reports', _report_id, jsonb_build_object('moderator', _moderator_id));
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_report_priority(_report_id uuid, _priority text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _priority NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid priority'; END IF;
  UPDATE reports SET priority = _priority WHERE id = _report_id;
  INSERT INTO moderation_actions (report_id, admin_id, action, metadata)
  VALUES (_report_id, auth.uid(), 'set_priority', jsonb_build_object('priority', _priority));
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'set_report_priority', 'reports', _report_id, jsonb_build_object('priority', _priority));
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_report_status(_report_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('open','under_review','escalated','resolved','rejected','archived') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT status INTO prev FROM reports WHERE id = _report_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  UPDATE reports SET status = _status,
    resolved_at = CASE WHEN _status = 'resolved' THEN now() ELSE resolved_at END,
    reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = _report_id;
  INSERT INTO moderation_actions (report_id, admin_id, action, reason, previous_status, new_status)
  VALUES (_report_id, auth.uid(), 'set_status', _reason, prev, _status);
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'set_report_status', 'reports', _report_id, jsonb_build_object('from', prev, 'to', _status, 'reason', _reason));
  RETURN jsonb_build_object('ok', true, 'from', prev, 'to', _status);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_add_moderation_note(_report_id uuid, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF coalesce(trim(_body),'') = '' THEN RAISE EXCEPTION 'Note cannot be empty'; END IF;
  INSERT INTO moderation_notes (report_id, author_id, body) VALUES (_report_id, auth.uid(), trim(_body)) RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok', true, 'id', new_id);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(_report_id uuid, _action text, _resolution text, _target_status text DEFAULT 'resolved')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text; rep uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _target_status NOT IN ('resolved','rejected','archived') THEN RAISE EXCEPTION 'Invalid resolution status'; END IF;
  IF coalesce(trim(_resolution),'') = '' THEN RAISE EXCEPTION 'A resolution note is required'; END IF;
  SELECT status, reported_id INTO prev, rep FROM reports WHERE id = _report_id;
  IF prev IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  UPDATE reports SET status = _target_status, action_taken = _action, resolution = _resolution,
    resolved_at = now(), reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = _report_id;

  -- Apply enforcement to the reported user where relevant.
  IF rep IS NOT NULL AND _action IN ('suspend','ban') THEN
    UPDATE profiles SET account_status = (CASE WHEN _action = 'ban' THEN 'banned' ELSE 'suspended' END)::account_status, updated_at = now() WHERE id = rep;
    UPDATE settings SET discovery_enabled = false, profile_visible = false, updated_at = now() WHERE user_id = rep;
    IF _action = 'ban' THEN
      UPDATE device_sessions SET revoked = true WHERE user_id = rep AND revoked = false;
    END IF;
  END IF;

  INSERT INTO moderation_actions (report_id, admin_id, action, reason, target_user_id, previous_status, new_status, metadata)
  VALUES (_report_id, auth.uid(), _action, _resolution, rep, prev, _target_status, jsonb_build_object('resolution', _resolution));
  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'resolve_report', 'reports', _report_id, jsonb_build_object('action', _action, 'status', _target_status));
  RETURN jsonb_build_object('ok', true);
END; $$;
