// ============================================================================
// useSettingsRealtime — keeps the Settings control center live. Subscribes to
// the current user's settings, notification_preferences and blocks rows and
// invalidates the matching queries so privacy toggles, notification channels
// and blocked-user changes reflect instantly across tabs and devices, and so
// Discovery / Matches / Chat pick up privacy + block changes without a refresh.
// ============================================================================
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  privacySettingsQuery,
  securityInfoQuery,
  blockedUsersQuery,
  settingsOverviewQuery,
} from "@/lib/settings.functions";
import { notificationPreferencesQuery } from "@/lib/notifications.functions";
import { preferencesQuery } from "@/lib/profile-full.functions";

export function useSettingsRealtime(userId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidateSettings = () => {
      qc.invalidateQueries({ queryKey: privacySettingsQuery().queryKey });
      qc.invalidateQueries({ queryKey: settingsOverviewQuery().queryKey });
      qc.invalidateQueries({ queryKey: securityInfoQuery().queryKey });
      qc.invalidateQueries({ queryKey: preferencesQuery().queryKey });
    };
    const invalidateNotifPrefs = () => {
      qc.invalidateQueries({ queryKey: notificationPreferencesQuery().queryKey });
    };
    const invalidateBlocks = () => {
      qc.invalidateQueries({ queryKey: blockedUsersQuery().queryKey });
      qc.invalidateQueries({ queryKey: settingsOverviewQuery().queryKey });
    };

    const channel = supabase
      .channel(`settings:realtime:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: `user_id=eq.${userId}` },
        invalidateSettings,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_preferences",
          filter: `user_id=eq.${userId}`,
        },
        invalidateNotifPrefs,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `blocker_id=eq.${userId}` },
        invalidateBlocks,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
