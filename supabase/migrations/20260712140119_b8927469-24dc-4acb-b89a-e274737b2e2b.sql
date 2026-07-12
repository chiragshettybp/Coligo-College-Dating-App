-- ============================================================================
-- Account status enum + profiles column
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','suspended','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active';

-- ============================================================================
-- application_settings (single-row config)
-- ============================================================================
CREATE TABLE public.application_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_enabled boolean NOT NULL DEFAULT false,
  maintenance_title text NOT NULL DEFAULT 'We''ll be right back',
  maintenance_message text NOT NULL DEFAULT 'CampusMatch is undergoing scheduled maintenance. Please check back soon.',
  estimated_completion timestamptz,
  support_email text NOT NULL DEFAULT 'support@campusmatch.app',
  min_app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.application_settings TO anon, authenticated;
GRANT ALL ON public.application_settings TO service_role;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read application settings"
  ON public.application_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert application settings"
  ON public.application_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update application settings"
  ON public.application_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- feature_flags
-- ============================================================================
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- app_versions
-- ============================================================================
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  min_supported text,
  force_update boolean NOT NULL DEFAULT false,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT ALL ON public.app_versions TO service_role;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app versions"
  ON public.app_versions FOR SELECT USING (true);
CREATE POLICY "Admins can manage app versions"
  ON public.app_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- system_logs (unknown routes / analytics)
-- ============================================================================
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'unknown_route',
  path text,
  referrer text,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.system_logs TO anon, authenticated;
GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert system logs"
  ON public.system_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read system logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- error_reports (crash reports)
-- ============================================================================
CREATE TABLE public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id text NOT NULL UNIQUE,
  route text,
  message text,
  stack text,
  user_id uuid,
  session_id text,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.error_reports TO anon, authenticated;
GRANT SELECT ON public.error_reports TO authenticated;
GRANT ALL ON public.error_reports TO service_role;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert error reports"
  ON public.error_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read error reports"
  ON public.error_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- device_sessions (owner-scoped)
-- ============================================================================
CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token text,
  platform text NOT NULL DEFAULT 'web',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_sessions TO authenticated;
GRANT ALL ON public.device_sessions TO service_role;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own device sessions"
  ON public.device_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
CREATE TRIGGER trg_application_settings_updated_at
  BEFORE UPDATE ON public.application_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Realtime for maintenance toggles
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_settings;

-- ============================================================================
-- Seed a single settings row
-- ============================================================================
INSERT INTO public.application_settings (maintenance_enabled)
VALUES (false);