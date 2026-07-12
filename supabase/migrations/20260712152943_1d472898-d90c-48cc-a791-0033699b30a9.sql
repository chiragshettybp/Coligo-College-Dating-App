
-- Rebuild discover_candidates to also return photos, interests, mutual interests
DROP FUNCTION IF EXISTS public.discover_candidates(integer);
CREATE OR REPLACE FUNCTION public.discover_candidates(_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, full_name text, avatar_url text, age integer, bio text,
  gender public.gender_option, college_id uuid, college_name text,
  department_id uuid, department_name text, semester integer,
  graduation_year integer, same_college boolean, shared_interests bigint,
  last_login_at timestamptz, photos jsonb, interests jsonb, mutual_interests jsonb
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
    p.last_login_at,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('path', ph.storage_path, 'isPrimary', ph.is_primary, 'position', ph.position)
       ORDER BY ph.is_primary DESC, ph.position), '[]'::jsonb)
       FROM public.photos ph WHERE ph.user_id = p.id) AS photos,
    (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
       FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id
       WHERE ui.user_id = p.id) AS interests,
    (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
       FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id
       WHERE ui.user_id = p.id AND ui.interest_id IN (SELECT interest_id FROM my_interests)) AS mutual_interests
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
GRANT EXECUTE ON FUNCTION public.discover_candidates(integer) TO authenticated;

-- Single eligible profile for the preview page
CREATE OR REPLACE FUNCTION public.discover_profile(_target uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT p.id, p.college_id FROM public.profiles p WHERE p.id = auth.uid()
  ),
  my_interests AS (
    SELECT interest_id FROM public.user_interests WHERE user_id = auth.uid()
  )
  SELECT CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', p.id,
    'fullName', p.full_name,
    'avatarUrl', p.avatar_url,
    'age', date_part('year', age(p.date_of_birth))::int,
    'bio', p.bio,
    'gender', p.gender,
    'collegeName', c.name,
    'departmentName', d.name,
    'semester', p.semester,
    'graduationYear', p.graduation_year,
    'sameCollege', (p.college_id IS NOT DISTINCT FROM (SELECT college_id FROM me)),
    'lastLoginAt', p.last_login_at,
    'photos', (SELECT coalesce(jsonb_agg(jsonb_build_object('path', ph.storage_path, 'isPrimary', ph.is_primary, 'position', ph.position)
        ORDER BY ph.is_primary DESC, ph.position), '[]'::jsonb) FROM public.photos ph WHERE ph.user_id = p.id),
    'interests', (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
        FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id WHERE ui.user_id = p.id),
    'mutualInterests', (SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb)
        FROM public.user_interests ui JOIN public.interests i ON i.id = ui.interest_id
        WHERE ui.user_id = p.id AND ui.interest_id IN (SELECT interest_id FROM my_interests)),
    'alreadySwiped', EXISTS (SELECT 1 FROM public.swipes sw WHERE sw.actor_id = (SELECT id FROM me) AND sw.target_id = p.id)
  ) END
  FROM public.profiles p
  LEFT JOIN public.colleges c ON c.id = p.college_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = _target
    AND p.id <> auth.uid()
    AND p.account_status = 'active'
    AND p.onboarding_completed = true
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id) OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()));
$$;
GRANT EXECUTE ON FUNCTION public.discover_profile(uuid) TO authenticated;

-- Full match screen payload for the celebration
CREATE OR REPLACE FUNCTION public.match_screen(_match_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH m AS (
    SELECT * FROM public.matches WHERE id = _match_id AND auth.uid() IN (user_a, user_b)
  ),
  other AS (
    SELECT p.*, c.name AS college_name
    FROM public.profiles p LEFT JOIN public.colleges c ON c.id = p.college_id
    WHERE p.id = (SELECT CASE WHEN user_a = auth.uid() THEN user_b ELSE user_a END FROM m)
  ),
  me AS (
    SELECT p.* FROM public.profiles p WHERE p.id = auth.uid()
  ),
  shared AS (
    SELECT coalesce(jsonb_agg(i.name ORDER BY i.name), '[]'::jsonb) AS names, count(*) AS cnt
    FROM public.user_interests a
    JOIN public.user_interests b2 ON a.interest_id = b2.interest_id
    JOIN public.interests i ON i.id = a.interest_id
    WHERE a.user_id = auth.uid() AND b2.user_id = (SELECT id FROM other)
  )
  SELECT CASE WHEN (SELECT id FROM m) IS NULL THEN NULL ELSE jsonb_build_object(
    'matchId', (SELECT id FROM m),
    'createdAt', (SELECT created_at FROM m),
    'me', jsonb_build_object('id', (SELECT id FROM me), 'name', (SELECT full_name FROM me), 'avatarUrl', (SELECT avatar_url FROM me)),
    'other', jsonb_build_object('id', (SELECT id FROM other), 'name', (SELECT full_name FROM other),
        'avatarUrl', (SELECT avatar_url FROM other), 'collegeName', (SELECT college_name FROM other),
        'semester', (SELECT semester FROM other)),
    'sharedInterests', (SELECT names FROM shared),
    'compatibility', LEAST(99, 62 + (SELECT cnt FROM shared) * 8 +
        (CASE WHEN (SELECT college_id FROM me) IS NOT DISTINCT FROM (SELECT college_id FROM other) THEN 10 ELSE 0 END))::int
  ) END;
$$;
GRANT EXECUTE ON FUNCTION public.match_screen(uuid) TO authenticated;
