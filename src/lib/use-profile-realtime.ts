// ============================================================================
// useProfileRealtime — keeps the Profile module live. Subscribes to changes on
// the current user's profile, photos, interests and settings rows, then
// invalidates the relevant Profile queries so every surface (overview,
// preview, gallery, completion) reflects edits instantly, and so Home /
// Discovery / Matches pick up shared profile data without a refresh.
// ============================================================================
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  fullProfileQuery,
  profileGalleryQuery,
  myInterestsQuery,
  profileStatsQuery,
  profileCompletionQuery,
  preferencesQuery,
} from "@/lib/profile-full.functions";

export function useProfileRealtime(userId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: fullProfileQuery().queryKey });
      qc.invalidateQueries({ queryKey: profileGalleryQuery().queryKey });
      qc.invalidateQueries({ queryKey: myInterestsQuery().queryKey });
      qc.invalidateQueries({ queryKey: profileStatsQuery().queryKey });
      qc.invalidateQueries({ queryKey: profileCompletionQuery().queryKey });
      qc.invalidateQueries({ queryKey: preferencesQuery().queryKey });
    };

    const channel = supabase
      .channel(`profile:realtime:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        invalidateAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `user_id=eq.${userId}` },
        invalidateAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_interests", filter: `user_id=eq.${userId}` },
        invalidateAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: `user_id=eq.${userId}` },
        invalidateAll,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
