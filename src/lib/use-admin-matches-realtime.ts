// ============================================================================
// useAdminMatchesRealtime — keeps the match module live. Subscribes to matches,
// messages, reports and match_admin_actions changes and throttle-invalidates the
// admin match queries so summary cards, tables, stats and charts refresh.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["matches", "messages", "reports", "match_admin_actions"] as const;

export function useAdminMatchesRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "matches"] });
        qc.invalidateQueries({ queryKey: ["admin", "match"] });
      }, 1500);
    };

    let channel = supabase.channel("admin:matches:realtime");
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
