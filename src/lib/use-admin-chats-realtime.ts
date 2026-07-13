// ============================================================================
// useAdminChatsRealtime — keeps the chat moderation module live. Subscribes to
// messages, matches, reports, chat_admin_actions and chat_moderator_notes and
// throttle-invalidates the admin chat queries so summary cards, tables, stats,
// charts, the conversation viewer, notes and audit trail refresh.
// ============================================================================
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["messages", "matches", "reports", "chat_admin_actions", "chat_moderator_notes"] as const;

export function useAdminChatsRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        qc.invalidateQueries({ queryKey: ["admin", "chats"] });
        qc.invalidateQueries({ queryKey: ["admin", "chat"] });
      }, 1500);
    };

    let channel = supabase.channel("admin:chats:realtime");
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
