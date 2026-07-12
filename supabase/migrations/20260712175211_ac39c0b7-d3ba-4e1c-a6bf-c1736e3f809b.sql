-- ============================================================================
-- Chat feature expansion: media-safe body check, delivered receipts, reactions,
-- voice notes, and background web-push delivery.
-- ============================================================================

-- 1. Allow media-only messages (image or voice) with an empty text body.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_check;

-- 2. New message columns.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_path text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

ALTER TABLE public.messages ADD CONSTRAINT messages_body_check
  CHECK (
    char_length(body) <= 2000
    AND (char_length(body) >= 1 OR image_path IS NOT NULL OR audio_path IS NOT NULL)
  );

-- 3. Mark the other participant's messages as delivered (received, not yet read).
CREATE OR REPLACE FUNCTION public.mark_delivered(_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_chat_participant(_match_id) THEN RETURN 0; END IF;
  UPDATE public.messages
    SET delivered_at = now()
    WHERE match_id = _match_id
      AND sender_id <> auth.uid()
      AND delivered_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 4. Toggle an emoji reaction on a message (add if absent, remove if present).
CREATE OR REPLACE FUNCTION public.toggle_reaction(_message_id uuid, _emoji text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  mid uuid;
  cur jsonb;
  arr jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _emoji IS NULL OR char_length(_emoji) < 1 OR char_length(_emoji) > 16 THEN
    RAISE EXCEPTION 'Invalid emoji';
  END IF;
  SELECT match_id INTO mid FROM public.messages WHERE id = _message_id;
  IF mid IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT public.is_chat_participant(mid) THEN RAISE EXCEPTION 'Not a participant'; END IF;

  SELECT COALESCE(reactions, '{}'::jsonb) INTO cur FROM public.messages WHERE id = _message_id FOR UPDATE;
  arr := COALESCE(cur -> _emoji, '[]'::jsonb);

  IF arr @> to_jsonb(me::text) THEN
    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO arr
      FROM jsonb_array_elements_text(arr) x WHERE x <> me::text;
    IF jsonb_array_length(arr) = 0 THEN
      cur := cur - _emoji;
    ELSE
      cur := jsonb_set(cur, ARRAY[_emoji], arr);
    END IF;
  ELSE
    cur := jsonb_set(cur, ARRAY[_emoji], arr || to_jsonb(me::text), true);
  END IF;

  UPDATE public.messages SET reactions = cur WHERE id = _message_id;
  RETURN cur;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(uuid, text) TO authenticated;

-- 5. Background web-push: fan out each new notification row to the recipient's
--    registered browser push subscriptions via a secured public API route.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_notify_push ON public.notifications;
CREATE TRIGGER trg_notify_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push();