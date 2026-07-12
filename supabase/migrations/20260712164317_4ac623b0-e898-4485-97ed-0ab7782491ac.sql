-- ============================================================================
-- Matches module: unmatch state, notifications, preferences, and RPCs.
-- ============================================================================

-- 1. matches: unmatch/archive state --------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS unmatched_by uuid,
  ADD COLUMN IF NOT EXISTS unmatched_at timestamptz;

DO $$ BEGIN
  CREATE POLICY "Participants update their own matches"
    ON public.matches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_a OR auth.uid() = user_b)
    WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. notifications -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read their own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update their own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. settings: persisted match preferences ------------------------------------
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS match_sort text NOT NULL DEFAULT 'recent_activity',
  ADD COLUMN IF NOT EXISTS match_filters jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. RPCs ----------------------------------------------------------------------

-- List of active matches with participant + latest message + unread count.
CREATE OR REPLACE FUNCTION public.my_matches()
RETURNS TABLE(
  match_id uuid,
  created_at timestamptz,
  last_message_at timestamptz,
  other_id uuid,
  full_name text,
  age int,
  college_id uuid,
  college_name text,
  department_name text,
  primary_photo text,
  last_login_at timestamptz,
  same_college boolean,
  last_message_body text,
  last_message_sender uuid,
  last_message_at_msg timestamptz,
  unread_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT id, college_id FROM public.profiles WHERE id = auth.uid()
  ),
  mine AS (
    SELECT m.id, m.created_at, m.last_message_at,
      CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END AS other
    FROM public.matches m
    WHERE m.status = 'active'
      AND auth.uid() IN (m.user_a, m.user_b)
  )
  SELECT
    mn.id, mn.created_at, mn.last_message_at,
    p.id, p.full_name,
    date_part('year', age(p.date_of_birth))::int,
    p.college_id, c.name, d.name,
    (SELECT ph.storage_path FROM public.photos ph
       WHERE ph.user_id = p.id ORDER BY ph.is_primary DESC, ph.position LIMIT 1),
    p.last_login_at,
    (p.college_id IS NOT DISTINCT FROM (SELECT college_id FROM me)),
    lm.body, lm.sender_id, lm.created_at,
    COALESCE((SELECT count(*) FROM public.messages msg
       WHERE msg.match_id = mn.id AND msg.sender_id <> auth.uid() AND msg.read_at IS NULL), 0)
  FROM mine mn
  JOIN public.profiles p ON p.id = mn.other
  LEFT JOIN public.colleges c ON c.id = p.college_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  LEFT JOIN LATERAL (
    SELECT body, sender_id, created_at FROM public.messages
    WHERE match_id = mn.id ORDER BY created_at DESC LIMIT 1
  ) lm ON true
  WHERE p.account_status = 'active'
    AND NOT EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()))
  ORDER BY COALESCE(mn.last_message_at, mn.created_at) DESC;
$function$;

-- Full detail for a single match (validates ownership).
CREATE OR REPLACE FUNCTION public.match_detail(_match_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH m AS (
    SELECT * FROM public.matches
    WHERE id = _match_id AND status = 'active' AND auth.uid() IN (user_a, user_b)
  ),
  me AS (SELECT id, college_id FROM public.profiles WHERE id = auth.uid()),
  other AS (
    SELECT p.*, c.name AS college_name, d.name AS department_name
    FROM public.profiles p
    LEFT JOIN public.colleges c ON c.id = p.college_id
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = (SELECT CASE WHEN user_a = auth.uid() THEN user_b ELSE user_a END FROM m)
  )
  SELECT CASE WHEN (SELECT id FROM m) IS NULL OR (SELECT id FROM other) IS NULL
    OR EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = (SELECT id FROM other))
         OR (b.blocker_id = (SELECT id FROM other) AND b.blocked_id = auth.uid()))
    OR (SELECT account_status FROM other) <> 'active'
  THEN NULL ELSE jsonb_build_object(
    'matchId', (SELECT id FROM m),
    'createdAt', (SELECT created_at FROM m),
    'lastMessageAt', (SELECT last_message_at FROM m),
    'hasConversation', EXISTS (SELECT 1 FROM public.messages WHERE match_id = (SELECT id FROM m)),
    'noteSent', EXISTS (SELECT 1 FROM public.messages WHERE match_id = (SELECT id FROM m) AND sender_id = auth.uid()),
    'other', jsonb_build_object(
      'id', (SELECT id FROM other),
      'fullName', (SELECT full_name FROM other),
      'age', (SELECT date_part('year', age(date_of_birth))::int FROM other),
      'bio', (SELECT bio FROM other),
      'gender', (SELECT gender FROM other),
      'collegeName', (SELECT college_name FROM other),
      'departmentName', (SELECT department_name FROM other),
      'semester', (SELECT semester FROM other),
      'graduationYear', (SELECT graduation_year FROM other),
      'lastLoginAt', (SELECT last_login_at FROM other),
      'sameCollege', ((SELECT college_id FROM other) IS NOT DISTINCT FROM (SELECT college_id FROM me)),
      'photos', (SELECT coalesce(jsonb_agg(jsonb_build_object('path', ph.storage_path, 'isPrimary', ph.is_primary, 'position', ph.position)
          ORDER BY ph.is_primary DESC, ph.position), '[]'::jsonb)
          FROM public.photos ph WHERE ph.user_id = (SELECT id FROM other)),
      'interests', (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
          FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id
          WHERE ui.user_id = (SELECT id FROM other)),
      'mutualInterests', (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
          FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id
          WHERE ui.user_id = (SELECT id FROM other)
            AND ui.interest_id IN (SELECT interest_id FROM public.user_interests WHERE user_id = auth.uid()))
    )
  ) END;
$function$;

-- Unmatch (archives, keeps messages).
CREATE OR REPLACE FUNCTION public.unmatch(_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.matches
    SET status = 'unmatched', unmatched_by = auth.uid(), unmatched_at = now()
    WHERE id = _match_id AND status = 'active' AND auth.uid() IN (user_a, user_b);
  RETURN FOUND;
END;
$function$;

-- Whether the current user already sent their first note in a match.
CREATE OR REPLACE FUNCTION public.note_status(_match_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.match_id = _match_id
      AND msg.sender_id = auth.uid()
      AND auth.uid() IN (m.user_a, m.user_b)
  );
$function$;

-- 5. Notification triggers -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (NEW.user_a, 'match', 'New match', 'You have a new match!', jsonb_build_object('matchId', NEW.id, 'otherId', NEW.user_b)),
    (NEW.user_b, 'match', 'New match', 'You have a new match!', jsonb_build_object('matchId', NEW.id, 'otherId', NEW.user_a));
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_match ON public.matches;
CREATE TRIGGER trg_notify_on_match
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  recipient uuid;
  is_first boolean;
BEGIN
  SELECT CASE WHEN m.user_a = NEW.sender_id THEN m.user_b ELSE m.user_a END
    INTO recipient FROM public.matches m WHERE m.id = NEW.match_id;
  IF recipient IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) = 1 INTO is_first FROM public.messages WHERE match_id = NEW.match_id;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (recipient,
    CASE WHEN is_first THEN 'note' ELSE 'message' END,
    CASE WHEN is_first THEN 'New note' ELSE 'New message' END,
    left(NEW.body, 140),
    jsonb_build_object('matchId', NEW.match_id, 'senderId', NEW.sender_id));
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();