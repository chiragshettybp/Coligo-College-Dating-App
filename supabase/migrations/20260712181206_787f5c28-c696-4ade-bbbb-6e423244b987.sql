-- =========================================================================
-- Notifications module: hardening + preferences + RPCs + preference-aware
-- generation. Idempotent retry.
-- =========================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  push boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notification_category(_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE lower(_type)
    WHEN 'match' THEN 'matches'
    WHEN 'match_created' THEN 'matches'
    WHEN 'note' THEN 'matches'
    WHEN 'first_note' THEN 'matches'
    WHEN 'message' THEN 'messages'
    WHEN 'new_message' THEN 'messages'
    WHEN 'security_alert' THEN 'security'
    WHEN 'account_notice' THEN 'account'
    WHEN 'admin_message' THEN 'system'
    WHEN 'system_announcement' THEN 'system'
    WHEN 'college_announcement' THEN 'system'
    WHEN 'welcome' THEN 'system'
    WHEN 'profile_update' THEN 'account'
    ELSE 'system'
  END;
$$;

CREATE OR REPLACE FUNCTION public.notif_channel_enabled(_user_id uuid, _category text, _channel text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE _channel
    WHEN 'in_app' THEN COALESCE((SELECT in_app FROM public.notification_preferences WHERE user_id = _user_id AND category = _category), true)
    WHEN 'push'   THEN COALESCE((SELECT push   FROM public.notification_preferences WHERE user_id = _user_id AND category = _category), true)
    WHEN 'email'  THEN COALESCE((SELECT email  FROM public.notification_preferences WHERE user_id = _user_id AND category = _category), false)
    ELSE true
  END;
$$;

CREATE OR REPLACE FUNCTION public.unread_notifications_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.notifications
  WHERE user_id = auth.uid() AND read_at IS NULL AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.notifications SET read_at = now()
    WHERE id = _id AND user_id = auth.uid() AND read_at IS NULL AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.notifications SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_notification(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.notifications SET deleted_at = now()
    WHERE id = _id AND user_id = auth.uid() AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.notif_channel_enabled(NEW.user_a, 'matches', 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, priority)
    VALUES (NEW.user_a, 'match', 'New match', 'You have a new match!',
      jsonb_build_object('matchId', NEW.id, 'otherId', NEW.user_b, 'route', '/discover/match/' || NEW.id), 'high');
  END IF;
  IF public.notif_channel_enabled(NEW.user_b, 'matches', 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, priority)
    VALUES (NEW.user_b, 'match', 'New match', 'You have a new match!',
      jsonb_build_object('matchId', NEW.id, 'otherId', NEW.user_a, 'route', '/discover/match/' || NEW.id), 'high');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recipient uuid;
  is_first boolean;
  ntype text;
BEGIN
  SELECT CASE WHEN m.user_a = NEW.sender_id THEN m.user_b ELSE m.user_a END
    INTO recipient FROM public.matches m WHERE m.id = NEW.match_id;
  IF recipient IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) = 1 INTO is_first FROM public.messages WHERE match_id = NEW.match_id;
  ntype := CASE WHEN is_first THEN 'note' ELSE 'message' END;
  IF public.notif_channel_enabled(recipient, public.notification_category(ntype), 'in_app') THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, priority)
    VALUES (recipient, ntype,
      CASE WHEN is_first THEN 'New note' ELSE 'New message' END,
      left(COALESCE(NEW.body, 'Sent an attachment'), 140),
      jsonb_build_object('matchId', NEW.match_id, 'senderId', NEW.sender_id, 'route', '/chat/' || NEW.match_id),
      'normal');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net
AS $$
BEGIN
  IF NOT public.notif_channel_enabled(NEW.user_id, public.notification_category(NEW.type), 'push') THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := 'https://project--9900e54b-f541-4340-8c39-bd8d6fca2142.lovable.app/api/public/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'c924fb9268c1dfbab31abdf93592e5ca43acbd9b938af463'
    ),
    body := jsonb_build_object('notificationId', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_live
  ON public.notifications (user_id, created_at DESC)
  WHERE deleted_at IS NULL;