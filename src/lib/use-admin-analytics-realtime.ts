// ============================================================================
// useAdminAnalyticsRealtime — keeps the analytics dashboard live. Subscribes to
// the tables that feed KPIs, charts, leaderboards and the activity feed, then
// throttle-invalidates the ["admin","analytics"] query tree so every widget
// refreshes without a manual reload. Cleans up the channel on unmount.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["profiles", "matches", "messages", "swipes", "reports", "notifications"] as const;

export function useAdminAnalyticsRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
        qc.invalidateQueries({ queryKey: ["admin", "activity"] });
      }, 2000);
    };

    let channel = supabase.channel("admin:analytics:realtime");
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
