// ============================================================================
// Realtime online presence — one shared channel for the whole app.
// Tracks the signed-in user with their college id, then derives live "online
// now" counts (national + same-college). Subscribes in an effect and cleans up
// on unmount so we never leak channels or storm reconnects.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnlineCounts = {
  national: number;
  college: number;
  connected: boolean;
};

type PresenceMeta = { collegeId: string | null };

export function useOnlinePresence(
  userId: string | null,
  myCollegeId: string | null,
  filterCollegeId: string | null = myCollegeId,
): OnlineCounts {
  const [counts, setCounts] = useState<OnlineCounts>({ national: 0, college: 0, connected: false });
  const myCollegeRef = useRef(myCollegeId);
  myCollegeRef.current = myCollegeId;
  const filterRef = useRef(filterCollegeId);
  filterRef.current = filterCollegeId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    const recompute = () => {
      const state = channel.presenceState<PresenceMeta>();
      const keys = Object.keys(state);
      const national = keys.length;
      let college = 0;
      for (const k of keys) {
        const metas = state[k];
        const meta = metas?.[0];
        if (meta && filterRef.current && meta.collegeId === filterRef.current) college += 1;
      }
      if (!cancelled) setCounts({ national, college, connected: true });
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Always advertise the user's OWN college, never the one being viewed,
          // so shared presence counts stay correct for every other user.
          await channel.track({ collegeId: myCollegeRef.current });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!cancelled) setCounts((c) => ({ ...c, connected: false }));
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, myCollegeId, filterCollegeId]);

  return counts;
}
