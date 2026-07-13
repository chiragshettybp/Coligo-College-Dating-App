// ============================================================================
// useAdminLogsRealtime — keeps the /admin/logs dashboard live. Subscribes to
// every append-only audit source that feeds the unified_logs view, then
// throttle-invalidates the ["admin","logs"] query tree so KPIs, the table and
// charts refresh without a manual reload. Cleans up the channel on unmount.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "admin_logs",
  "moderation_actions",
  "chat_admin_actions",
  "match_admin_actions",
  "settings_audit_log",
  "error_reports",
  "admin_login_attempts",
  "system_logs",
  "device_sessions",
] as const;

export function useAdminLogsRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "logs"] });
      }, 2000);
    };

    let channel = supabase.channel("admin:logs:realtime");
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "INSERT", schema: "public", table }, refresh);
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
