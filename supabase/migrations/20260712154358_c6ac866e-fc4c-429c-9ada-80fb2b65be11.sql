-- Maintain matches.last_message_at when a message is sent.
-- sendMatchNote previously updated matches directly, but matches has no UPDATE
-- RLS policy, so the write silently affected 0 rows. A SECURITY DEFINER trigger
-- keeps the field authoritative for the current match-note flow and future Chat.
CREATE OR REPLACE FUNCTION public.touch_match_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.matches
    SET last_message_at = NEW.created_at
    WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_match_last_message ON public.messages;
CREATE TRIGGER trg_touch_match_last_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_match_last_message();