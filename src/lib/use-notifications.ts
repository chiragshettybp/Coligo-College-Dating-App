// ============================================================================
// Notifications realtime — keeps the list + unread badge in sync with Supabase.
// Subscribes (once, cleaned up on unmount) to the current user's notification
// row changes and invalidates the relevant TanStack Query caches so every
// surface (list, detail, header badge) updates instantly. Also exposes a small
// hook for reading the live unread count anywhere (e.g. the home header bell).
// ============================================================================
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { unreadNotificationCountQuery } from "@/lib/notifications.functions";

/**
 * Subscribe to realtime changes on the current user's notifications and
 * invalidate notification queries whenever a row is inserted, updated (read /
 * soft-deleted), or deleted. Safe no-op until `userId` is known.
 */
export function useNotificationsRealtime(userId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    };
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

/**
 * Live unread notification count. Reads the server RPC and stays fresh through
 * the realtime subscription above (wire `useNotificationsRealtime` in the same
 * tree, e.g. the app shell).
 */
export function useUnreadNotifications() {
  const { data } = useQuery(unreadNotificationCountQuery());
  return data ?? 0;
}
