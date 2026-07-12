-- Enable realtime for the settings table so profile preference changes
-- (discovery visibility, notification channels) sync across a user's devices.
ALTER TABLE public.settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;