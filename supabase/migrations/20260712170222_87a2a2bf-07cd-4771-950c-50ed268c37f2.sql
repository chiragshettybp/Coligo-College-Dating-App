CREATE OR REPLACE FUNCTION public.swipe_profile(_target uuid, _action swipe_action)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  ua uuid; ub uuid; m_id uuid; reciprocal boolean := false;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _target THEN RAISE EXCEPTION 'Cannot swipe self'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocks b
             WHERE (b.blocker_id = me AND b.blocked_id = _target)
                OR (b.blocker_id = _target AND b.blocked_id = me)) THEN
    RAISE EXCEPTION 'Blocked relationship';
  END IF;
  INSERT INTO public.swipes (actor_id, target_id, action)
  VALUES (me, _target, _action)
  ON CONFLICT (actor_id, target_id) DO UPDATE SET action = EXCLUDED.action, created_at = now();
  IF _action = 'pass' THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.swipes sw
    WHERE sw.actor_id = _target AND sw.target_id = me AND sw.action IN ('like','super')
  ) INTO reciprocal;
  IF NOT reciprocal THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  ua := LEAST(me, _target);
  ub := GREATEST(me, _target);
  -- Serialize concurrent match creation for this pair. hashtextextended returns
  -- bigint, so use the single-argument pg_advisory_xact_lock(bigint) overload
  -- (there is no pg_advisory_xact_lock(bigint, bigint)).
  PERFORM pg_advisory_xact_lock(hashtextextended(ua::text || ':' || ub::text, 0));
  SELECT id INTO m_id FROM public.matches WHERE user_a = ua AND user_b = ub;
  IF m_id IS NULL THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (ua, ub)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id INTO m_id;
    IF m_id IS NULL THEN
      SELECT id INTO m_id FROM public.matches WHERE user_a = ua AND user_b = ub;
    END IF;
  END IF;
  RETURN jsonb_build_object('matched', true, 'match_id', m_id);
END;
$function$;