-- Add 'banned' account status for the admin ban workflow
ALTER TYPE public.account_status ADD VALUE IF NOT EXISTS 'banned';

-- Indexes to keep the admin user-list queries fast at scale
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON public.profiles (last_login_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON public.device_sessions (user_id);

-- Ensure profiles + reports stream over realtime for live admin updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reports';
  END IF;
END $$;