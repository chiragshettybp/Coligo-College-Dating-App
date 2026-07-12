
-- Chat module: image + reply support on messages, participant helper, mark-read RPC, chat-media storage RLS.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';

-- body is currently NOT NULL; image-only messages need an empty body, so relax to allow '' (kept non-null default).
ALTER TABLE public.messages ALTER COLUMN body SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_messages_match_created ON public.messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages (reply_to);

-- Is the current user an active, non-blocked participant of this match?
CREATE OR REPLACE FUNCTION public.is_chat_participant(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND m.status = 'active'
      AND auth.uid() IN (m.user_a, m.user_b)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = m.user_a AND b.blocked_id = m.user_b)
           OR (b.blocker_id = m.user_b AND b.blocked_id = m.user_a)
      )
  );
$$;

-- Mark all of the OTHER participant's unread messages in a conversation as read.
CREATE OR REPLACE FUNCTION public.mark_read(_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_chat_participant(_match_id) THEN
    RETURN 0;
  END IF;
  UPDATE public.messages
    SET read_at = now()
    WHERE match_id = _match_id
      AND sender_id <> auth.uid()
      AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_read(uuid) TO authenticated;

-- Storage RLS for chat-media bucket: first path folder is the match id.
CREATE POLICY "chat media readable by participants"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND public.is_chat_participant(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "chat media insertable by participants"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND public.is_chat_participant(((storage.foldername(name))[1])::uuid)
  );
