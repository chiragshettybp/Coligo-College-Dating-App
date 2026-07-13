CREATE OR REPLACE FUNCTION public.admin_analytics_kpis(
  p_start timestamptz,
  p_end timestamptz,
  p_college uuid DEFAULT NULL,
  p_department uuid DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_verification text DEFAULT NULL
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

  WITH fp AS (
    SELECT p.id, p.college_id, p.department_id, p.gender, p.verification_status,
           p.account_status, p.last_login_at, p.created_at, p.onboarding_completed, p.onboarding_step
    FROM profiles p
    WHERE (p_college IS NULL OR p.college_id = p_college)
      AND (p_department IS NULL OR p.department_id = p_department)
      AND (p_gender IS NULL OR p.gender::text = p_gender)
      AND (p_verification IS NULL OR p.verification_status::text = p_verification)
  ),
  agg AS (
    SELECT
      (SELECT count(*) FROM swipes s WHERE s.created_at BETWEEN p_start AND p_end AND s.actor_id IN (SELECT id FROM fp)) AS swiped,
      (SELECT count(*) FROM matches m WHERE m.created_at BETWEEN p_start AND p_end AND (m.user_a IN (SELECT id FROM fp) OR m.user_b IN (SELECT id FROM fp))) AS matched
  )
  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM fp),
    'verifiedUsers', (SELECT count(*) FROM fp WHERE verification_status::text = 'verified'),
    'activeUsers', (SELECT count(*) FROM fp WHERE last_login_at >= now() - interval '7 days'),
    'usersOnline', (SELECT count(*) FROM fp WHERE last_login_at > now() - interval '5 minutes'),
    'newToday', (SELECT count(*) FROM fp WHERE created_at >= date_trunc('day', now())),
    'newThisWeek', (SELECT count(*) FROM fp WHERE created_at >= date_trunc('week', now())),
    'newThisMonth', (SELECT count(*) FROM fp WHERE created_at >= date_trunc('month', now())),
    'newInRange', (SELECT count(*) FROM fp WHERE created_at BETWEEN p_start AND p_end),
    'totalColleges', (SELECT count(*) FROM colleges),
    'totalDepartments', (SELECT count(*) FROM departments),
    'totalSwipes', (SELECT swiped FROM agg),
    'totalLikes', (SELECT count(*) FROM swipes s WHERE s.created_at BETWEEN p_start AND p_end AND s.action IN ('like','super') AND s.actor_id IN (SELECT id FROM fp)),
    'totalPasses', (SELECT count(*) FROM swipes s WHERE s.created_at BETWEEN p_start AND p_end AND s.action = 'pass' AND s.actor_id IN (SELECT id FROM fp)),
    'totalMatches', (SELECT matched FROM agg),
    'matchRate', (SELECT CASE WHEN swiped > 0 THEN round((matched::numeric / swiped) * 100, 1) ELSE 0 END FROM agg),
    'messages', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.sender_id IN (SELECT id FROM fp)),
    'imagesShared', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.image_path IS NOT NULL AND ms.sender_id IN (SELECT id FROM fp)),
    'voiceNotes', (SELECT count(*) FROM messages ms WHERE ms.created_at BETWEEN p_start AND p_end AND ms.audio_path IS NOT NULL AND ms.sender_id IN (SELECT id FROM fp)),
    'reports', (SELECT count(*) FROM reports r WHERE r.created_at BETWEEN p_start AND p_end),
    'reportsPending', (SELECT count(*) FROM reports r WHERE r.status = 'pending'),
    'bannedUsers', (SELECT count(*) FROM fp WHERE account_status::text = 'banned'),
    'suspendedUsers', (SELECT count(*) FROM fp WHERE account_status::text = 'suspended'),
    'deletedUsers', (SELECT count(*) FROM fp WHERE account_status::text = 'deleted'),
    'activeConversations', (SELECT count(DISTINCT m.match_id) FROM messages m WHERE m.created_at >= now() - interval '7 days'),
    'dau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT sender_id) FROM messages WHERE created_at >= now() - interval '30 days'),
    'avgProfileCompletion', (SELECT COALESCE(round(avg(CASE WHEN onboarding_completed THEN 100 ELSE (COALESCE(onboarding_step,0) * 20) END)::numeric, 0), 0) FROM fp)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_analytics_kpis(timestamptz, timestamptz, uuid, uuid, text, text) TO authenticated;