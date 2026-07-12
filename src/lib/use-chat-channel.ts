// ============================================================================
// useChatTyping — per-conversation ephemeral typing indicator over a Supabase
// broadcast channel (never persisted). Broadcasts "typing" events for the
// current user and surfaces whether the OTHER participant is currently typing.
// The indicator auto-expires after inactivity. Subscribes in an effect and
// cleans up on unmount so channels never leak.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type TypingPayload = { userId: string };

export function useChatTyping(chatId: string, userId: string) {
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!chatId || !userId) return;
    let cancelled = false;

    const channel = supabase.channel(`chat-typing:${chatId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, (msg) => {
        const p = msg.payload as TypingPayload | undefined;
        if (!p || p.userId === userId || cancelled) return;
        setOtherTyping(true);
        if (expiry.current) clearTimeout(expiry.current);
        expiry.current = setTimeout(() => setOtherTyping(false), 3500);
      })
      .on("broadcast", { event: "stop" }, (msg) => {
        const p = msg.payload as TypingPayload | undefined;
        if (!p || p.userId === userId || cancelled) return;
        setOtherTyping(false);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      cancelled = true;
      if (expiry.current) clearTimeout(expiry.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, userId]);

  // Throttle typing broadcasts to at most one per second.
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 1000) return;
    lastSent.current = now;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId } });
  }, [userId]);

  const stopTyping = useCallback(() => {
    lastSent.current = 0;
    channelRef.current?.send({ type: "broadcast", event: "stop", payload: { userId } });
  }, [userId]);

  return { otherTyping, sendTyping, stopTyping };
}
