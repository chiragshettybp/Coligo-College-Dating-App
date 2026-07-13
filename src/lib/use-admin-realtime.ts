// ============================================================================
// useAdminRealtime — keeps the admin dashboard live. Subscribes to inserts /
// updates on the core platform tables and throttle-invalidates the admin
// queries so every stat card, chart and the activity feed refresh instantly.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["profiles", "matches", "messages", "reports", "blocks", "photos"] as const;

export function useAdminRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Coalesce bursts of changes into one invalidation every 1.5s.
    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin"] });
      }, 1500);
    };

    // Unique topic per mount so we never re-attach `.on()` to a channel that
    // already called `.subscribe()` (which Supabase rejects).
    let channel = supabase.channel(`admin:realtime:${crypto.randomUUID()}`);
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
