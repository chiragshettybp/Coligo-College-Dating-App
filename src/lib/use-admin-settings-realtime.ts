// ============================================================================
// useAdminSettingsRealtime — keeps the settings console live. Subscribes to
// every configuration table + the audit log, then throttle-invalidates the
// ["admin","settings"] query tree so cards, forms and history refresh without a
// manual reload. Cleans up the channel on unmount.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "platform_settings",
  "authentication_settings",
  "onboarding_settings",
  "discovery_settings",
  "chat_settings",
  "notification_settings",
  "moderation_settings",
  "colleges_settings",
  "profile_settings",
  "storage_settings",
  "security_settings",
  "application_settings",
  "feature_flags",
  "settings_audit_log",
] as const;

export function useAdminSettingsRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      }, 1500);
    };

    let channel = supabase.channel("admin:settings:realtime");
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
