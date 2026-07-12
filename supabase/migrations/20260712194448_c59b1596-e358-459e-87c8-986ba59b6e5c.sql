-- ============================================================================
-- Admin College Management Module — schema + RPCs
-- ============================================================================

-- 1. Extend colleges -----------------------------------------------------------
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS discovery_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.colleges SET status = CASE WHEN is_active THEN 'active' ELSE 'disabled' END
WHERE status IS DISTINCT FROM CASE WHEN is_active THEN 'active' ELSE 'disabled' END;

CREATE OR REPLACE FUNCTION public.sync_college_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  IF NEW.status = 'archived' AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
  ELSIF NEW.status <> 'archived' THEN
    NEW.archived_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_college_active ON public.colleges;
CREATE TRIGGER trg_sync_college_active
  BEFORE INSERT OR UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.sync_college_active();

CREATE UNIQUE INDEX IF NOT EXISTS colleges_code_lower_uidx
  ON public.colleges (lower(code)) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS colleges_status_idx ON public.colleges (status);
CREATE INDEX IF NOT EXISTS colleges_created_at_idx ON public.colleges (created_at);
CREATE INDEX IF NOT EXISTS colleges_name_idx ON public.colleges (lower(name));

-- 2. Link departments to a college (nullable = global, backward compatible) -----
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS departments_college_id_idx ON public.departments (college_id);

-- 3. Realtime ------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.colleges;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Summary cards -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_college_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'totalColleges', (SELECT count(*) FROM colleges),
    'activeColleges', (SELECT count(*) FROM colleges WHERE status='active'),
    'disabledColleges', (SELECT count(*) FROM colleges WHERE status='disabled'),
    'archivedColleges', (SELECT count(*) FROM colleges WHERE status='archived'),
    'discoveryEnabled', (SELECT count(*) FROM colleges WHERE discovery_enabled=true AND status='active'),
    'totalStudents', (SELECT count(*) FROM profiles WHERE account_status='active' AND onboarding_completed=true AND college_id IS NOT NULL),
    'studentsToday', (SELECT count(*) FROM profiles WHERE created_at>=date_trunc('day',now()) AND college_id IS NOT NULL),
    'collegesThisMonth', (SELECT count(*) FROM colleges WHERE created_at>=date_trunc('month',now())),
    'verificationPct', COALESCE((
      SELECT round(100.0*count(*) FILTER (WHERE verification_status='verified')/NULLIF(count(*),0))::int
      FROM profiles WHERE college_id IS NOT NULL AND account_status='active'), 0),
    'avgStudentsPerCollege', COALESCE((
      SELECT round(avg(cnt))::int FROM (
        SELECT count(*) AS cnt FROM profiles WHERE account_status='active' AND onboarding_completed=true AND college_id IS NOT NULL GROUP BY college_id
      ) x), 0),
    'topGrowing', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'growth',growth) ORDER BY growth DESC)
      FROM (
        SELECT c.id, c.name, count(p.id) AS growth
        FROM colleges c JOIN profiles p ON p.college_id=c.id
          AND p.created_at>now()-interval '30 days' AND p.account_status='active'
        GROUP BY c.id, c.name ORDER BY growth DESC LIMIT 5
      ) g), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- 5. Paginated list ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_colleges(
  _search text DEFAULT '', _filters jsonb DEFAULT '{}'::jsonb,
  _sort text DEFAULT 'newest', _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, name text, code text, short_name text, city text, state text, country text,
  logo_url text, banner_url text, status text, discovery_enabled boolean,
  created_at timestamptz, updated_at timestamptz,
  total_students bigint, male_students bigint, female_students bigint,
  department_count bigint, active_users bigint, online_users bigint,
  total_matches bigint, messages_sent bigint, profile_completion int,
  growth_30d bigint, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT c.id, c.name, c.code, c.short_name, c.city, c.state, c.country,
      c.logo_url, c.banner_url, c.status, c.discovery_enabled, c.created_at, c.updated_at,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true) AS total_students,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true AND p.gender='man') AS male_students,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true AND p.gender='woman') AS female_students,
      (SELECT count(DISTINCT p.department_id) FROM profiles p WHERE p.college_id=c.id AND p.department_id IS NOT NULL) AS department_count,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.last_login_at>now()-interval '24 hours') AS active_users,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.last_login_at>now()-interval '5 minutes') AS online_users,
      (SELECT count(*) FROM matches m WHERE m.user_a IN (SELECT id FROM profiles WHERE college_id=c.id) OR m.user_b IN (SELECT id FROM profiles WHERE college_id=c.id)) AS total_matches,
      (SELECT count(*) FROM messages msg WHERE msg.sender_id IN (SELECT id FROM profiles WHERE college_id=c.id)) AS messages_sent,
      COALESCE((SELECT round(avg(sc))::int FROM (
        SELECT ((CASE WHEN p.bio IS NOT NULL AND p.bio<>'' THEN 1 ELSE 0 END)
          +(CASE WHEN p.date_of_birth IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.gender IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.department_id IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.semester IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.graduation_year IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.looking_for IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END)
          +(CASE WHEN EXISTS(SELECT 1 FROM photos ph WHERE ph.user_id=p.id) THEN 2 ELSE 0 END))*10 AS sc
        FROM profiles p WHERE p.college_id=c.id AND p.account_status='active' AND p.onboarding_completed=true
      ) s), 0) AS profile_completion,
      (SELECT count(*) FROM profiles p WHERE p.college_id=c.id AND p.created_at>now()-interval '30 days' AND p.account_status='active') AS growth_30d
    FROM colleges c
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (_search='' OR b.name ILIKE '%'||_search||'%' OR COALESCE(b.code,'') ILIKE '%'||_search||'%'
        OR COALESCE(b.city,'') ILIKE '%'||_search||'%' OR COALESCE(b.state,'') ILIKE '%'||_search||'%'
        OR COALESCE(b.country,'') ILIKE '%'||_search||'%')
      AND (_filters->>'status' IS NULL OR b.status = _filters->>'status')
      AND (_filters->>'discovery' IS NULL OR b.discovery_enabled = (_filters->>'discovery')::bool)
      AND (_filters->>'state' IS NULL OR b.state = _filters->>'state')
      AND (_filters->>'city' IS NULL OR b.city = _filters->>'city')
      AND (_filters->>'min_students' IS NULL OR b.total_students >= (_filters->>'min_students')::bigint)
  )
  SELECT f.*, count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN _sort='name' THEN f.name END ASC,
    CASE WHEN _sort='oldest' THEN f.created_at END ASC,
    CASE WHEN _sort='newest' THEN f.created_at END DESC,
    CASE WHEN _sort IN('students','most_students') THEN f.total_students END DESC,
    CASE WHEN _sort='least_students' THEN f.total_students END ASC,
    CASE WHEN _sort='active_users' THEN f.active_users END DESC,
    CASE WHEN _sort='online' THEN f.online_users END DESC,
    CASE WHEN _sort='matches' THEN f.total_matches END DESC,
    CASE WHEN _sort='messages' THEN f.messages_sent END DESC,
    CASE WHEN _sort='completion' THEN f.profile_completion END DESC,
    CASE WHEN _sort='growth' THEN f.growth_30d END DESC,
    f.created_at DESC
  LIMIT GREATEST(_limit,0) OFFSET GREATEST(_offset,0);
END;
$$;

-- 6. College detail ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_college_detail(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT to_jsonb(c) INTO result FROM colleges c WHERE c.id=_id;
  RETURN result;
END;
$$;

-- 7. College stats -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_college_stats(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH members AS (
    SELECT * FROM profiles WHERE college_id=_id AND account_status='active' AND onboarding_completed=true
  )
  SELECT jsonb_build_object(
    'totalStudents', (SELECT count(*) FROM members),
    'activeStudents', (SELECT count(*) FROM members WHERE last_login_at>now()-interval '24 hours'),
    'onlineStudents', (SELECT count(*) FROM members WHERE last_login_at>now()-interval '5 minutes'),
    'maleStudents', (SELECT count(*) FROM members WHERE gender='man'),
    'femaleStudents', (SELECT count(*) FROM members WHERE gender='woman'),
    'departments', (SELECT count(DISTINCT department_id) FROM members WHERE department_id IS NOT NULL),
    'matches', (SELECT count(*) FROM matches m WHERE m.user_a IN (SELECT id FROM members) OR m.user_b IN (SELECT id FROM members)),
    'messages', (SELECT count(*) FROM messages msg WHERE msg.sender_id IN (SELECT id FROM members)),
    'swipes', (SELECT count(*) FROM swipes s WHERE s.actor_id IN (SELECT id FROM members)),
    'likes', (SELECT count(*) FROM swipes s WHERE s.actor_id IN (SELECT id FROM members) AND s.action IN ('like','super')),
    'verified', (SELECT count(*) FROM members WHERE verification_status='verified'),
    'departmentBreakdown', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', d.name, 'count', dc.c) ORDER BY dc.c DESC)
      FROM (SELECT department_id, count(*) c FROM members WHERE department_id IS NOT NULL GROUP BY department_id) dc
      JOIN departments d ON d.id=dc.department_id), '[]'::jsonb),
    'gradYears', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('year', gy.yr, 'count', gy.c) ORDER BY gy.yr)
      FROM (SELECT graduation_year AS yr, count(*) AS c FROM members WHERE graduation_year IS NOT NULL GROUP BY graduation_year) gy), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

-- 8. Timeseries ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_college_timeseries(_id uuid, _days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH days AS (
    SELECT generate_series(date_trunc('day',now())-((_days-1)||' days')::interval, date_trunc('day',now()), '1 day')::date AS day
  )
  SELECT jsonb_agg(jsonb_build_object(
    'day', d.day,
    'registrations', (SELECT count(*) FROM profiles p WHERE p.college_id=_id AND p.created_at::date=d.day),
    'activeUsers', (SELECT count(*) FROM profiles p WHERE p.college_id=_id AND p.last_login_at::date=d.day)
  ) ORDER BY d.day) INTO result FROM days d;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 9. Student directory ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_college_students(
  _id uuid, _search text DEFAULT '', _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE(id uuid, full_name text, avatar text, gender text, age int,
  department_name text, semester int, account_status text, verification_status text,
  last_login_at timestamptz, created_at timestamptz, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name,
    (SELECT ph.storage_path FROM photos ph WHERE ph.user_id=p.id ORDER BY ph.is_primary DESC, ph.position LIMIT 1),
    p.gender::text,
    CASE WHEN p.date_of_birth IS NULL THEN NULL ELSE date_part('year',age(p.date_of_birth))::int END,
    d.name, p.semester, p.account_status::text, p.verification_status,
    p.last_login_at, p.created_at, count(*) OVER() AS total_count
  FROM profiles p
  LEFT JOIN departments d ON d.id=p.department_id
  WHERE p.college_id=_id
    AND (_search='' OR p.full_name ILIKE '%'||_search||'%' OR COALESCE(p.display_name,'') ILIKE '%'||_search||'%')
  ORDER BY p.created_at DESC
  LIMIT GREATEST(_limit,0) OFFSET GREATEST(_offset,0);
END;
$$;

-- 10. Moderation writes --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_college_status(_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('active','disabled','archived') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT status INTO old_status FROM colleges WHERE id=_id;
  IF old_status IS NULL THEN RAISE EXCEPTION 'College not found'; END IF;
  UPDATE colleges SET status=_status, updated_at=now() WHERE id=_id;
  INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'college_status_'||_status, 'colleges', _id,
    jsonb_build_object('from', old_status, 'to', _status, 'reason', _reason));
  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_college_discovery(_id uuid, _enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE colleges SET discovery_enabled=_enabled, updated_at=now() WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'College not found'; END IF;
  INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'college_discovery', 'colleges', _id, jsonb_build_object('enabled', _enabled));
  RETURN jsonb_build_object('ok', true, 'discovery_enabled', _enabled);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_college(_id uuid, _payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid; nm text; cd text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  nm := nullif(trim(_payload->>'name'), '');
  cd := nullif(trim(_payload->>'code'), '');
  IF nm IS NULL THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF EXISTS (SELECT 1 FROM colleges WHERE lower(name)=lower(nm) AND (_id IS NULL OR id<>_id)) THEN
    RAISE EXCEPTION 'A college with this name already exists';
  END IF;
  IF cd IS NOT NULL AND EXISTS (SELECT 1 FROM colleges WHERE lower(code)=lower(cd) AND (_id IS NULL OR id<>_id)) THEN
    RAISE EXCEPTION 'A college with this code already exists';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO colleges (name, code, short_name, description, website, city, district, state, country,
      logo_url, banner_url, discovery_enabled, status)
    VALUES (nm, cd, nullif(_payload->>'short_name',''), nullif(_payload->>'description',''),
      nullif(_payload->>'website',''), nullif(_payload->>'city',''), nullif(_payload->>'district',''),
      nullif(_payload->>'state',''), COALESCE(nullif(_payload->>'country',''),'India'),
      nullif(_payload->>'logo_url',''), nullif(_payload->>'banner_url',''),
      COALESCE((_payload->>'discovery_enabled')::bool, true),
      COALESCE(nullif(_payload->>'status',''), 'active'))
    RETURNING id INTO new_id;
    INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'college_create', 'colleges', new_id, _payload);
  ELSE
    UPDATE colleges SET
      name=nm, code=cd, short_name=nullif(_payload->>'short_name',''),
      description=nullif(_payload->>'description',''), website=nullif(_payload->>'website',''),
      city=nullif(_payload->>'city',''), district=nullif(_payload->>'district',''),
      state=nullif(_payload->>'state',''), country=COALESCE(nullif(_payload->>'country',''),'India'),
      logo_url=COALESCE(_payload->>'logo_url', logo_url), banner_url=COALESCE(_payload->>'banner_url', banner_url),
      discovery_enabled=COALESCE((_payload->>'discovery_enabled')::bool, discovery_enabled),
      status=COALESCE(nullif(_payload->>'status',''), status),
      updated_at=now()
    WHERE id=_id RETURNING id INTO new_id;
    IF new_id IS NULL THEN RAISE EXCEPTION 'College not found'; END IF;
    INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'college_update', 'colleges', new_id, _payload);
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_college(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE active_students bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT count(*) INTO active_students FROM profiles WHERE college_id=_id AND account_status='active';
  IF active_students > 0 THEN
    RAISE EXCEPTION 'Cannot delete: % active students are enrolled. Archive it instead.', active_students;
  END IF;
  UPDATE colleges SET status='archived', updated_at=now() WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'College not found'; END IF;
  INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'college_delete', 'colleges', _id, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_department(_id uuid, _name text, _college_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid; nm text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  nm := nullif(trim(_name), '');
  IF nm IS NULL THEN RAISE EXCEPTION 'Department name is required'; END IF;
  IF EXISTS (SELECT 1 FROM departments WHERE lower(name)=lower(nm)
      AND college_id IS NOT DISTINCT FROM _college_id AND (_id IS NULL OR id<>_id)) THEN
    RAISE EXCEPTION 'A department with this name already exists';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO departments (name, college_id) VALUES (nm, _college_id) RETURNING id INTO new_id;
    INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'department_create', 'departments', new_id, jsonb_build_object('name', nm, 'college_id', _college_id));
  ELSE
    UPDATE departments SET name=nm, college_id=_college_id, updated_at=now() WHERE id=_id RETURNING id INTO new_id;
    IF new_id IS NULL THEN RAISE EXCEPTION 'Department not found'; END IF;
    INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
    VALUES (auth.uid(), 'department_update', 'departments', new_id, jsonb_build_object('name', nm, 'college_id', _college_id));
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_department_status(_id uuid, _active boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE departments SET is_active=_active, updated_at=now() WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Department not found'; END IF;
  INSERT INTO admin_logs(admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'department_status', 'departments', _id, jsonb_build_object('active', _active));
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_departments(_college_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, name text, is_active boolean, college_id uuid, member_count bigint, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT d.id, d.name, d.is_active, d.college_id,
    (SELECT count(*) FROM profiles p WHERE p.department_id=d.id AND (_college_id IS NULL OR p.college_id=_college_id)) AS member_count,
    d.created_at
  FROM departments d
  WHERE _college_id IS NULL OR d.college_id=_college_id OR d.college_id IS NULL
  ORDER BY d.name ASC;
END;
$$;