// ============================================================================
// useAdminCollegesRealtime — keeps the college module live. Subscribes to
// colleges, departments and profiles changes and throttle-invalidates the
// admin college queries so summary cards, tables, stats and charts refresh.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["colleges", "departments", "profiles"] as const;

export function useAdminCollegesRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "colleges"] });
        qc.invalidateQueries({ queryKey: ["admin", "college"] });
      }, 1500);
    };

    let channel = supabase.channel("admin:colleges:realtime");
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
