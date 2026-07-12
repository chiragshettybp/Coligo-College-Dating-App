
-- ============================================================
-- Phase 0: Home module backend foundation
-- ============================================================

-- 1) College presentation columns (branding for detail page)
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Announcements ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live announcements"
ON public.announcements
FOR SELECT
USING (
  is_active = true
  AND published_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS announcements_live_idx
  ON public.announcements (is_pinned DESC, priority DESC, published_at DESC);

-- 3) Matches ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_distinct_users CHECK (user_a <> user_b),
  CONSTRAINT matches_unique_pair UNIQUE (user_a, user_b)
);

GRANT SELECT, INSERT, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
ON public.matches
FOR SELECT
TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE INDEX IF NOT EXISTS matches_user_a_idx ON public.matches (user_a);
CREATE INDEX IF NOT EXISTS matches_user_b_idx ON public.matches (user_b);
CREATE INDEX IF NOT EXISTS matches_created_idx ON public.matches (created_at);

-- Supporting index for member counts / rankings
CREATE INDEX IF NOT EXISTS profiles_member_idx
  ON public.profiles (college_id)
  WHERE account_status = 'active' AND onboarding_completed = true;

-- 4) Aggregate helper functions (SECURITY DEFINER, no row exposure) -----------

-- Per-college statistics
CREATE OR REPLACE FUNCTION public.college_stats(_college_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH members AS (
    SELECT * FROM public.profiles p
    WHERE p.college_id = _college_id
      AND p.account_status = 'active'
      AND p.onboarding_completed = true
  )
  SELECT jsonb_build_object(
    'member_count', (SELECT count(*) FROM members),
    'gender', COALESCE((
      SELECT jsonb_object_agg(g, c)
      FROM (
        SELECT COALESCE(gender::text, 'unspecified') AS g, count(*) AS c
        FROM members GROUP BY 1
      ) gg
    ), '{}'::jsonb),
    'department_count', (SELECT count(DISTINCT department_id) FROM members WHERE department_id IS NOT NULL),
    'grad_years', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('year', year, 'count', c) ORDER BY year)
      FROM (
        SELECT graduation_year AS year, count(*) AS c
        FROM members WHERE graduation_year IS NOT NULL GROUP BY 1
      ) gy
    ), '[]'::jsonb),
    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', d.name, 'count', dc.c) ORDER BY dc.c DESC)
      FROM (
        SELECT department_id, count(*) AS c
        FROM members WHERE department_id IS NOT NULL GROUP BY 1
      ) dc
      JOIN public.departments d ON d.id = dc.department_id
    ), '[]'::jsonb),
    'top_interests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT i.name, count(*) AS c
        FROM public.user_interests ui
        JOIN members m ON m.id = ui.user_id
        JOIN public.interests i ON i.id = ui.interest_id
        GROUP BY i.name
        ORDER BY c DESC
        LIMIT 8
      ) ti
    ), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.college_stats(uuid) TO authenticated;

-- Ranked, searchable, paginated college list
CREATE OR REPLACE FUNCTION public.college_rankings(_search text DEFAULT '', _limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  logo_url text,
  member_count bigint,
  growth_30d bigint,
  rank bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT c.id, c.name, c.city, c.logo_url,
      COALESCE(m.cnt, 0) AS member_count,
      COALESCE(g.cnt, 0) AS growth_30d
    FROM public.colleges c
    LEFT JOIN (
      SELECT college_id, count(*) AS cnt
      FROM public.profiles
      WHERE account_status = 'active' AND onboarding_completed = true
      GROUP BY college_id
    ) m ON m.college_id = c.id
    LEFT JOIN (
      SELECT college_id, count(*) AS cnt
      FROM public.profiles
      WHERE account_status = 'active' AND onboarding_completed = true
        AND created_at > now() - interval '30 days'
      GROUP BY college_id
    ) g ON g.college_id = c.id
    WHERE c.is_active = true
  ),
  ranked AS (
    SELECT *, rank() OVER (ORDER BY member_count DESC, name ASC) AS rank
    FROM counts
  )
  SELECT id, name, city, logo_url, member_count, growth_30d, rank
  FROM ranked
  WHERE (_search = '' OR name ILIKE '%' || _search || '%' OR COALESCE(city,'') ILIKE '%' || _search || '%')
  ORDER BY rank ASC
  LIMIT GREATEST(_limit, 0) OFFSET GREATEST(_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION public.college_rankings(text, integer, integer) TO authenticated;

-- Single college rank (for the user's own college card)
CREATE OR REPLACE FUNCTION public.college_rank(_college_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT c.id, COALESCE(m.cnt, 0) AS member_count, c.name
    FROM public.colleges c
    LEFT JOIN (
      SELECT college_id, count(*) AS cnt
      FROM public.profiles
      WHERE account_status = 'active' AND onboarding_completed = true
      GROUP BY college_id
    ) m ON m.college_id = c.id
    WHERE c.is_active = true
  ),
  ranked AS (
    SELECT id, rank() OVER (ORDER BY member_count DESC, name ASC) AS rank
    FROM counts
  )
  SELECT rank FROM ranked WHERE id = _college_id;
$$;
GRANT EXECUTE ON FUNCTION public.college_rank(uuid) TO authenticated;

-- Platform-wide statistics
CREATE OR REPLACE FUNCTION public.platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_students', (
      SELECT count(*) FROM public.profiles
      WHERE account_status = 'active' AND onboarding_completed = true
    ),
    'participating_colleges', (
      SELECT count(DISTINCT college_id) FROM public.profiles
      WHERE account_status = 'active' AND onboarding_completed = true AND college_id IS NOT NULL
    ),
    'active_users', (
      SELECT count(*) FROM public.profiles
      WHERE account_status = 'active' AND last_login_at > now() - interval '24 hours'
    ),
    'matches_today', (
      SELECT count(*) FROM public.matches
      WHERE created_at >= date_trunc('day', now())
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.platform_stats() TO authenticated;

-- Personal + total matches today
CREATE OR REPLACE FUNCTION public.my_matches_today(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.matches WHERE created_at >= date_trunc('day', now())),
    'mine', (SELECT count(*) FROM public.matches
             WHERE created_at >= date_trunc('day', now())
               AND (user_a = _user_id OR user_b = _user_id))
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_matches_today(uuid) TO authenticated;

-- Recently joined members (safe public fields only)
CREATE OR REPLACE FUNCTION public.new_members(_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  college_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, c.name AS college_name, p.created_at
  FROM public.profiles p
  LEFT JOIN public.colleges c ON c.id = p.college_id
  WHERE p.account_status = 'active' AND p.onboarding_completed = true
  ORDER BY p.created_at DESC
  LIMIT GREATEST(_limit, 0);
$$;
GRANT EXECUTE ON FUNCTION public.new_members(integer) TO authenticated;

-- 5) Realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
