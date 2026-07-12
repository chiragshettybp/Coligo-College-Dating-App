DROP POLICY "Anyone can insert system logs" ON public.system_logs;
CREATE POLICY "Anyone can insert system logs"
  ON public.system_logs FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY "Anyone can insert error reports" ON public.error_reports;
CREATE POLICY "Anyone can insert error reports"
  ON public.error_reports FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);