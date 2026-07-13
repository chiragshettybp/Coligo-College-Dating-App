-- ============================================================================
-- Admin Settings Module — platform configuration center.
-- Per-domain singleton config tables (domain-normalized, NOT one global blob),
-- an immutable audit log, and admin-gated SECURITY DEFINER RPCs. Every RPC
-- re-checks has_role(auth.uid(),'admin') and raises 'Forbidden' otherwise.
-- ============================================================================

-- ---------------------------------------------------------------- defaults
CREATE OR REPLACE FUNCTION public._admin_settings_default(_category text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _category
    WHEN 'platform' THEN jsonb_build_object(
      'app_name','Coligo','app_description','College dating, done right.',
      'support_phone','','copyright','© Coligo',
      'current_version','1.0.0','min_supported_version','1.0.0','force_update',false)
    WHEN 'authentication' THEN jsonb_build_object(
      'mobile_login',true,'otp_login',true,'password_login',false,
      'otp_expiration_seconds',300,'max_otp_attempts',5,'session_duration_days',30,
      'auto_logout',false,'password_min_length',6,'account_lock_threshold',10)
    WHEN 'onboarding' THEN jsonb_build_object(
      'min_age',18,'min_photos',1,'max_photos',6,'max_bio_length',300,
      'min_interests',3,'max_interests',10,'college_required',true,
      'department_required',true,'semester_required',true,
      'mandatory_fields', jsonb_build_array('display_name','birthdate','gender'))
    WHEN 'discovery' THEN jsonb_build_object(
      'discovery_enabled',true,'daily_swipe_limit',100,'match_creation_enabled',true,
      'auto_match_enabled',false,'ranking_algorithm','balanced',
      'same_college_preference',true,'cross_college_discovery',true,'cache_refresh_minutes',30)
    WHEN 'chat' THEN jsonb_build_object(
      'chat_enabled',true,'image_sharing',true,'voice_notes',true,'replies',true,
      'emoji_reactions',true,'read_receipts',true,'typing_indicators',true,
      'max_image_size_mb',10,'max_voice_seconds',120,'max_message_length',2000)
    WHEN 'notifications' THEN jsonb_build_object(
      'in_app',true,'match',true,'message',true,'announcement',true,
      'system_alerts',true,'broadcast',true)
    WHEN 'moderation' THEN jsonb_build_object(
      'auto_block_threshold',5,'report_threshold',3,'warning_threshold',2,
      'automatic_suspension',false)
    WHEN 'colleges' THEN jsonb_build_object(
      'college_registration',true,'ranking_updates',true,'auto_ranking',false,
      'department_sync',true)
    WHEN 'profile' THEN jsonb_build_object(
      'profile_visible_default',true,'online_status_default',true,
      'read_receipts_default',true,'bio_limit',300,'photo_limit',6)
    WHEN 'storage' THEN jsonb_build_object(
      'max_image_size_mb',10,'max_voice_size_mb',5,'retain_backups_days',30,
      'auto_cleanup_orphans',false)
    WHEN 'security' THEN jsonb_build_object(
      'session_timeout_minutes',60,'jwt_lifetime_minutes',60,'rate_limiting',true,
      'api_limit_per_minute',120,'admin_session_minutes',120,'device_limit',5,
      'require_reauthentication',false)
    ELSE '{}'::jsonb
  END
$$;

-- ------------------------------------------------------------ table mapping
CREATE OR REPLACE FUNCTION public._admin_settings_table(_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _category
    WHEN 'platform' THEN 'platform_settings'
    WHEN 'authentication' THEN 'authentication_settings'
    WHEN 'onboarding' THEN 'onboarding_settings'
    WHEN 'discovery' THEN 'discovery_settings'
    WHEN 'chat' THEN 'chat_settings'
    WHEN 'notifications' THEN 'notification_settings'
    WHEN 'moderation' THEN 'moderation_settings'
    WHEN 'colleges' THEN 'colleges_settings'
    WHEN 'profile' THEN 'profile_settings'
    WHEN 'storage' THEN 'storage_settings'
    WHEN 'security' THEN 'security_settings'
    ELSE NULL
  END
$$;

-- ------------------------------------------------- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------- config tables
DO $do$
DECLARE
  t text;
  cat text;
  tables text[] := ARRAY[
    'platform_settings','authentication_settings','onboarding_settings',
    'discovery_settings','chat_settings','notification_settings',
    'moderation_settings','colleges_settings','profile_settings',
    'storage_settings','security_settings'];
  cats text[] := ARRAY[
    'platform','authentication','onboarding','discovery','chat','notifications',
    'moderation','colleges','profile','storage','security'];
  i int;
BEGIN
  FOR i IN 1 .. array_length(tables,1) LOOP
    t := tables[i];
    cat := cats[i];
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        data jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );$f$, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$CREATE POLICY "Admins read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));$p$, t);
    EXECUTE format($p$CREATE POLICY "Admins write %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));$p$, t);
    EXECUTE format($p$CREATE POLICY "Admins insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));$p$, t);
    -- seed one singleton row with defaults
    EXECUTE format('INSERT INTO public.%I (data) SELECT public._admin_settings_default(%L) WHERE NOT EXISTS (SELECT 1 FROM public.%I);', t, cat, t);
    -- realtime + updated_at trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$I;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END
$do$;

-- --------------------------------------------------------- immutable audit log
CREATE TABLE IF NOT EXISTS public.settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  category text NOT NULL,
  setting_key text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.settings_audit_log TO authenticated;
GRANT ALL ON public.settings_audit_log TO service_role;
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings audit" ON public.settings_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_settings_audit_category ON public.settings_audit_log (category, created_at DESC);
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.settings_audit_log';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================ RPCs

-- Read every category (+ maintenance, feature flags) in one payload.
CREATE OR REPLACE FUNCTION public.admin_settings_get_all()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  cat text;
  tbl text;
  d jsonb;
  cats text[] := ARRAY['platform','authentication','onboarding','discovery','chat','notifications','moderation','colleges','profile','storage','security'];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOREACH cat IN ARRAY cats LOOP
    tbl := public._admin_settings_table(cat);
    EXECUTE format('SELECT data FROM public.%I LIMIT 1', tbl) INTO d;
    result := result || jsonb_build_object(cat, COALESCE(d, public._admin_settings_default(cat)));
  END LOOP;
  result := result || jsonb_build_object(
    'maintenance', (SELECT to_jsonb(a) FROM public.application_settings a LIMIT 1),
    'feature_flags', COALESCE((SELECT jsonb_agg(jsonb_build_object('key',key,'enabled',enabled,'payload',payload) ORDER BY key) FROM public.feature_flags), '[]'::jsonb)
  );
  RETURN result;
END;
$$;

-- Update one category (jsonb merge) + write an audit entry atomically.
CREATE OR REPLACE FUNCTION public.admin_settings_update(_category text, _values jsonb, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tbl text;
  v_old jsonb;
  v_new jsonb;
  k text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  tbl := public._admin_settings_table(_category);
  IF tbl IS NULL THEN RAISE EXCEPTION 'Unknown settings category: %', _category; END IF;
  IF _values IS NULL OR jsonb_typeof(_values) <> 'object' THEN RAISE EXCEPTION 'Invalid settings payload'; END IF;
  -- reject negative numeric values (basic server-side range guard)
  FOR k IN SELECT jsonb_object_keys(_values) LOOP
    IF jsonb_typeof(_values->k) = 'number' AND (_values->>k)::numeric < 0 THEN
      RAISE EXCEPTION 'Value for % must not be negative', k;
    END IF;
  END LOOP;
  EXECUTE format('SELECT data FROM public.%I LIMIT 1', tbl) INTO v_old;
  EXECUTE format('UPDATE public.%I SET data = data || $1, updated_by = auth.uid() RETURNING data', tbl)
    INTO v_new USING _values;
  INSERT INTO public.settings_audit_log (admin_id, category, previous_value, new_value, reason)
  VALUES (auth.uid(), _category, v_old, v_new, _reason);
  RETURN v_new;
END;
$$;

-- Reset a category to shipped defaults.
CREATE OR REPLACE FUNCTION public.admin_settings_reset(_category text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tbl text; v_old jsonb; v_new jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  tbl := public._admin_settings_table(_category);
  IF tbl IS NULL THEN RAISE EXCEPTION 'Unknown settings category: %', _category; END IF;
  EXECUTE format('SELECT data FROM public.%I LIMIT 1', tbl) INTO v_old;
  v_new := public._admin_settings_default(_category);
  EXECUTE format('UPDATE public.%I SET data = $1, updated_by = auth.uid()', tbl) USING v_new;
  INSERT INTO public.settings_audit_log (admin_id, category, previous_value, new_value, reason)
  VALUES (auth.uid(), _category, v_old, v_new, COALESCE(_reason,'Reset to defaults'));
  RETURN v_new;
END;
$$;

-- Feature flag upsert.
CREATE OR REPLACE FUNCTION public.admin_feature_flag_set(_key text, _enabled boolean, _payload jsonb DEFAULT '{}'::jsonb, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_old jsonb; v_new jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _key IS NULL OR length(trim(_key)) = 0 THEN RAISE EXCEPTION 'Flag key required'; END IF;
  SELECT jsonb_build_object('key',key,'enabled',enabled,'payload',payload) INTO v_old FROM public.feature_flags WHERE key = _key;
  INSERT INTO public.feature_flags (key, enabled, payload)
  VALUES (_key, _enabled, COALESCE(_payload,'{}'::jsonb))
  ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, payload = EXCLUDED.payload, updated_at = now();
  SELECT jsonb_build_object('key',key,'enabled',enabled,'payload',payload) INTO v_new FROM public.feature_flags WHERE key = _key;
  INSERT INTO public.settings_audit_log (admin_id, category, setting_key, previous_value, new_value, reason)
  VALUES (auth.uid(), 'feature_flags', _key, v_old, v_new, _reason);
  RETURN v_new;
END;
$$;

-- Maintenance mode update (uses existing application_settings).
CREATE OR REPLACE FUNCTION public.admin_maintenance_update(_values jsonb, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_old jsonb; v_new jsonb; v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT id, to_jsonb(a) INTO v_id, v_old FROM public.application_settings a LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.application_settings DEFAULT VALUES RETURNING id INTO v_id;
  END IF;
  UPDATE public.application_settings SET
    maintenance_enabled = COALESCE((_values->>'maintenance_enabled')::boolean, maintenance_enabled),
    maintenance_title = COALESCE(_values->>'maintenance_title', maintenance_title),
    maintenance_message = COALESCE(_values->>'maintenance_message', maintenance_message),
    estimated_completion = COALESCE(NULLIF(_values->>'estimated_completion','')::timestamptz, estimated_completion),
    support_email = COALESCE(_values->>'support_email', support_email),
    min_app_version = COALESCE(_values->>'min_app_version', min_app_version),
    updated_at = now()
  WHERE id = v_id;
  SELECT to_jsonb(a) INTO v_new FROM public.application_settings a WHERE id = v_id;
  INSERT INTO public.settings_audit_log (admin_id, category, previous_value, new_value, reason)
  VALUES (auth.uid(), 'maintenance', v_old, v_new, _reason);
  RETURN v_new;
END;
$$;

-- Paged audit history.
CREATE OR REPLACE FUNCTION public.admin_settings_history(_category text DEFAULT NULL, _limit int DEFAULT 30, _offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE rows jsonb; total int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT count(*) INTO total FROM public.settings_audit_log l WHERE _category IS NULL OR l.category = _category;
  SELECT COALESCE(jsonb_agg(x ORDER BY x.created_at DESC), '[]'::jsonb) INTO rows FROM (
    SELECT l.id, l.category, l.setting_key, l.previous_value, l.new_value, l.reason, l.created_at,
           COALESCE(p.display_name, 'Administrator') AS admin_name
    FROM public.settings_audit_log l
    LEFT JOIN public.profiles p ON p.id = l.admin_id
    WHERE _category IS NULL OR l.category = _category
    ORDER BY l.created_at DESC
    LIMIT LEAST(_limit,100) OFFSET GREATEST(_offset,0)
  ) x;
  RETURN jsonb_build_object('total', total, 'rows', rows);
END;
$$;

-- Overview / dashboard cards.
CREATE OR REPLACE FUNCTION public.admin_settings_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'maintenance_enabled', COALESCE((SELECT maintenance_enabled FROM public.application_settings LIMIT 1), false),
    'active_users', (SELECT count(*) FROM public.profiles WHERE last_login_at >= now() - interval '7 days'),
    'online_users', (SELECT count(*) FROM public.profiles WHERE last_login_at > now() - interval '5 minutes'),
    'current_version', COALESCE((SELECT data->>'current_version' FROM public.platform_settings LIMIT 1), '1.0.0'),
    'min_version', COALESCE((SELECT data->>'min_supported_version' FROM public.platform_settings LIMIT 1), '1.0.0'),
    'feature_flags_count', (SELECT count(*) FROM public.feature_flags),
    'feature_flags_on', (SELECT count(*) FROM public.feature_flags WHERE enabled),
    'changes_24h', (SELECT count(*) FROM public.settings_audit_log WHERE created_at >= now() - interval '24 hours'),
    'last_update', (SELECT max(created_at) FROM public.settings_audit_log)
  ) INTO result;
  RETURN result;
END;
$$;

-- Storage usage stats (from storage.objects metadata).
CREATE OR REPLACE FUNCTION public.admin_storage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_objects', count(*),
    'total_bytes', COALESCE(sum((metadata->>'size')::bigint), 0),
    'by_bucket', COALESCE(jsonb_object_agg(bucket_id, cnt) FILTER (WHERE bucket_id IS NOT NULL), '{}'::jsonb)
  ) INTO result
  FROM (
    SELECT bucket_id, count(*) AS cnt, metadata FROM storage.objects GROUP BY bucket_id, metadata
  ) s;
  -- simpler aggregate (avoid group weirdness)
  SELECT jsonb_build_object(
    'total_objects', count(*),
    'total_bytes', COALESCE(sum((metadata->>'size')::bigint),0),
    'by_bucket', COALESCE((SELECT jsonb_object_agg(b, c) FROM (SELECT bucket_id b, count(*) c FROM storage.objects GROUP BY bucket_id) q), '{}'::jsonb)
  ) INTO result FROM storage.objects;
  RETURN result;
END;
$$;

-- Export every setting as one document.
CREATE OR REPLACE FUNCTION public.admin_settings_export()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN public.admin_settings_get_all() || jsonb_build_object('exported_at', now());
END;
$$;

-- Import settings transactionally (rollback on any failure).
CREATE OR REPLACE FUNCTION public.admin_settings_import(_payload jsonb, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cat text; cats text[] := ARRAY['platform','authentication','onboarding','discovery','chat','notifications','moderation','colleges','profile','storage','security'];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN RAISE EXCEPTION 'Invalid import payload'; END IF;
  FOREACH cat IN ARRAY cats LOOP
    IF _payload ? cat AND jsonb_typeof(_payload->cat) = 'object' THEN
      PERFORM public.admin_settings_update(cat, _payload->cat, COALESCE(_reason,'Imported configuration'));
    END IF;
  END LOOP;
  RETURN public.admin_settings_get_all();
END;
$$;