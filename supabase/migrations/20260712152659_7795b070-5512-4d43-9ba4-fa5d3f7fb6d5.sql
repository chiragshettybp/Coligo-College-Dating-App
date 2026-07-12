
DO $$ BEGIN
  CREATE TYPE public.swipe_action AS ENUM ('like','pass','super');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.swipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action public.swipe_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, target_id),
  CHECK (actor_id <> target_id)
);
CREATE INDEX IF NOT EXISTS idx_swipes_target_action ON public.swipes (target_id, action);
CREATE INDEX IF NOT EXISTS idx_swipes_actor ON public.swipes (actor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own swipes" ON public.swipes;
CREATE POLICY "Users manage their own swipes" ON public.swipes
  FOR ALL TO authenticated USING (auth.uid() = actor_id) WITH CHECK (auth.uid() = actor_id);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_canonical_order;
ALTER TABLE public.matches ADD CONSTRAINT matches_canonical_order CHECK (user_a < user_b);
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_unique_pair;
ALTER TABLE public.matches ADD CONSTRAINT matches_unique_pair UNIQUE (user_a, user_b);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON public.messages (match_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants read match messages" ON public.messages;
CREATE POLICY "Participants read match messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND auth.uid() IN (m.user_a, m.user_b)));
DROP POLICY IF EXISTS "Participants send match messages" ON public.messages;
CREATE POLICY "Participants send match messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND auth.uid() IN (m.user_a, m.user_b)));
DROP POLICY IF EXISTS "Recipients mark messages read" ON public.messages;
CREATE POLICY "Recipients mark messages read" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND auth.uid() IN (m.user_a, m.user_b)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = messages.match_id AND auth.uid() IN (m.user_a, m.user_b)));

CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own blocks" ON public.blocks;
CREATE POLICY "Users manage their own blocks" ON public.blocks
  FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create their own reports" ON public.reports;
CREATE POLICY "Users create their own reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Users read their own reports" ON public.reports;
CREATE POLICY "Users read their own reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins read all reports" ON public.reports;
CREATE POLICY "Admins read all reports" ON public.reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.discover_candidates(_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, full_name text, avatar_url text, age integer, bio text,
  gender public.gender_option, college_id uuid, college_name text,
  department_id uuid, department_name text, semester integer,
  graduation_year integer, same_college boolean, shared_interests bigint,
  last_login_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT p.id, p.gender, p.looking_for, p.college_id
    FROM public.profiles p WHERE p.id = auth.uid()
  ),
  my_interests AS (
    SELECT interest_id FROM public.user_interests WHERE user_id = auth.uid()
  )
  SELECT
    p.id, p.full_name, p.avatar_url,
    date_part('year', age(p.date_of_birth))::int AS age,
    p.bio, p.gender, p.college_id, c.name AS college_name,
    p.department_id, d.name AS department_name, p.semester, p.graduation_year,
    (p.college_id IS NOT DISTINCT FROM (SELECT college_id FROM me)) AS same_college,
    (SELECT count(*) FROM public.user_interests ui
       WHERE ui.user_id = p.id AND ui.interest_id IN (SELECT interest_id FROM my_interests)) AS shared_interests,
    p.last_login_at
  FROM public.profiles p
  JOIN public.settings s ON s.user_id = p.id
  LEFT JOIN public.colleges c ON c.id = p.college_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  CROSS JOIN me
  WHERE p.id <> me.id
    AND p.account_status = 'active'
    AND p.onboarding_completed = true
    AND s.discovery_enabled = true
    AND p.date_of_birth IS NOT NULL
    AND date_part('year', age(p.date_of_birth)) >= 18
    AND (me.looking_for = 'everyone'
      OR (me.looking_for = 'women' AND p.gender = 'woman')
      OR (me.looking_for = 'men' AND p.gender = 'man'))
    AND (p.looking_for = 'everyone'
      OR (p.looking_for = 'women' AND me.gender = 'woman')
      OR (p.looking_for = 'men' AND me.gender = 'man'))
    AND NOT EXISTS (SELECT 1 FROM public.swipes sw WHERE sw.actor_id = me.id AND sw.target_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id = me.id AND b.blocked_id = p.id) OR (b.blocker_id = p.id AND b.blocked_id = me.id))
    AND NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.reporter_id = me.id AND r.reported_id = p.id)
  ORDER BY shared_interests DESC, same_college DESC, p.last_login_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 0);
$$;

CREATE OR REPLACE FUNCTION public.swipe_profile(_target uuid, _action public.swipe_action)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  ua uuid; ub uuid; m_id uuid; reciprocal boolean := false;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _target THEN RAISE EXCEPTION 'Cannot swipe self'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocks b
             WHERE (b.blocker_id = me AND b.blocked_id = _target)
                OR (b.blocker_id = _target AND b.blocked_id = me)) THEN
    RAISE EXCEPTION 'Blocked relationship';
  END IF;
  INSERT INTO public.swipes (actor_id, target_id, action)
  VALUES (me, _target, _action)
  ON CONFLICT (actor_id, target_id) DO UPDATE SET action = EXCLUDED.action, created_at = now();
  IF _action = 'pass' THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.swipes sw
    WHERE sw.actor_id = _target AND sw.target_id = me AND sw.action IN ('like','super')
  ) INTO reciprocal;
  IF NOT reciprocal THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  ua := LEAST(me, _target);
  ub := GREATEST(me, _target);
  PERFORM pg_advisory_xact_lock(hashtextextended(ua::text, 0), hashtextextended(ub::text, 0));
  SELECT id INTO m_id FROM public.matches WHERE user_a = ua AND user_b = ub;
  IF m_id IS NULL THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (ua, ub)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id INTO m_id;
    IF m_id IS NULL THEN
      SELECT id INTO m_id FROM public.matches WHERE user_a = ua AND user_b = ub;
    END IF;
  END IF;
  RETURN jsonb_build_object('matched', true, 'match_id', m_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.match_participants(_match_id uuid)
RETURNS TABLE (
  match_id uuid, created_at timestamptz, user_id uuid, is_me boolean,
  full_name text, avatar_url text, college_name text, semester integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.created_at, p.id AS user_id, (p.id = auth.uid()) AS is_me,
         p.full_name, p.avatar_url, c.name AS college_name, p.semester
  FROM public.matches m
  JOIN public.profiles p ON p.id IN (m.user_a, m.user_b)
  LEFT JOIN public.colleges c ON c.id = p.college_id
  WHERE m.id = _match_id AND auth.uid() IN (m.user_a, m.user_b);
$$;

GRANT EXECUTE ON FUNCTION public.discover_candidates(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.swipe_profile(uuid, public.swipe_action) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_participants(uuid) TO authenticated;

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.blocks REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matches; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
