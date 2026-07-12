-- Settings module: privacy columns on the per-user settings row
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS profile_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_profile_preview boolean NOT NULL DEFAULT true;

-- Realtime for notification preferences (settings + blocks already published)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;

-- Discovery must respect profile visibility immediately
CREATE OR REPLACE FUNCTION public.discover_candidates(_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, age integer, bio text, gender gender_option, college_id uuid, college_name text, department_id uuid, department_name text, semester integer, graduation_year integer, same_college boolean, shared_interests bigint, last_login_at timestamp with time zone, photos jsonb, interests jsonb, mutual_interests jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND s.profile_visible = true
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
$function$;