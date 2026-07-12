// ============================================================================
// useOnlineUserIds — subscribes to the shared "presence:online" channel and
// returns the live Set of currently-online user ids. Used to show real online
// badges on discovery cards. Tracks the current user so they also appear online
// to others, mirroring the Home presence behaviour.
// ============================================================================
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useOnlineUserIds(userId: string | null): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const userRef = useRef(userId);
  userRef.current = userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    const recompute = () => {
      const state = channel.presenceState();
      const next = new Set<string>(Object.keys(state));
      if (!cancelled) setIds(next);
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online: true });
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return ids;
}
