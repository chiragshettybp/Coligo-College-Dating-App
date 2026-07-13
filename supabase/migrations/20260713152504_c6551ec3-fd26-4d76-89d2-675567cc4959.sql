CREATE OR REPLACE FUNCTION public.admin_reset_discovery(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cleared integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE settings
    SET discovery_enabled = true, profile_visible = true, updated_at = now()
    WHERE user_id = _user_id;

  -- Clear the user's own swipe history so their discovery deck refills.
  WITH deleted AS (
    DELETE FROM swipes WHERE actor_id = _user_id RETURNING 1
  )
  SELECT count(*) INTO _cleared FROM deleted;

  INSERT INTO admin_logs (admin_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), 'reset_discovery', 'settings', _user_id,
    jsonb_build_object('swipes_cleared', _cleared));

  RETURN jsonb_build_object('ok', true, 'swipesCleared', _cleared);
END;
$function$;