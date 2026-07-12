// ============================================================================
// /matches/:matchId/chat — real-time conversation thread between two matched
// participants. Messages persist to public.messages (RLS-scoped to the two
// participants), stream in via Supabase realtime, and are marked read on view.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  matchDetailQuery,
  conversationQuery,
  matchesQuery,
  sendMessage,
  markConversationRead,
  MESSAGE_MAX,
  type ChatMessage,
} from "@/lib/matches.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/$matchId/chat")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(matchDetailQuery(params.matchId)),
      context.queryClient.ensureQueryData(conversationQuery(params.matchId)),
    ]),
  pendingComponent: ChatSkeleton,
  errorComponent: ChatUnavailable,
  component: ChatPage,
});

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ChatPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match } = useSuspenseQuery(matchDetailQuery(matchId));
  const { data: convo } = useSuspenseQuery(conversationQuery(matchId));
  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markConversationRead);

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = convo?.messages ?? [];
  const viewerId = convo?.viewerId ?? "";

  // Realtime: new/updated messages for this match refresh the thread + list.
  useEffect(() => {
    const refresh = () => {
      qc.invalidateQueries({ queryKey: conversationQuery(matchId).queryKey });
      qc.invalidateQueries({ queryKey: matchesQuery().queryKey });
      qc.invalidateQueries({ queryKey: matchDetailQuery(matchId).queryKey });
    };
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, qc]);

  // Mark the other side's messages read whenever the thread changes.
  useEffect(() => {
    const hasUnread = messages.some((m) => m.senderId !== viewerId && !m.readAt);
    if (!hasUnread) return;
    markRead({ data: { matchId } })
      .then(() => qc.invalidateQueries({ queryKey: matchesQuery().queryKey }))
      .catch(() => {});
  }, [messages, viewerId, matchId, markRead, qc]);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (!match) return <ChatUnavailable />;

  const { other } = match;
  const name = other.fullName ?? "your match";
  const trimmed = body.trim();
  const tooLong = body.length > MESSAGE_MAX;
  const canSend = trimmed.length > 0 && !tooLong && !busy;

  const onSend = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      await send({ data: { matchId, body: trimmed } });
      setBody("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: conversationQuery(matchId).queryKey }),
        qc.invalidateQueries({ queryKey: matchesQuery().queryKey }),
        qc.invalidateQueries({ queryKey: matchDetailQuery(matchId).queryKey }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="matches">
      <TopBar
        title={name}
        onBack={() => navigate({ to: "/matches/$matchId", params: { matchId } })}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: spacing[2],
          overflowY: "auto",
          paddingTop: spacing[3],
          paddingBottom: spacing[3],
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: "auto 0" }}>
            <EmptyState
              scene="messages"
              tone="slate"
              title={`Say hi to ${name.split(/\s+/)[0]}`}
              description="This is the start of your conversation. Send the first message to break the ice."
            />
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageRow
              key={m.id}
              message={m}
              mine={m.senderId === viewerId}
              otherName={name}
              otherPhoto={other.photos[0] ?? undefined}
              showDay={i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="flex items-end"
        style={{
          gap: spacing[2],
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          borderTop: `1px solid ${surfaces.border}`,
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={`Message ${name.split(/\s+/)[0]}…`}
          rows={1}
          aria-label="Message"
          maxLength={MESSAGE_MAX + 40}
          style={{
            flex: 1,
            resize: "none",
            maxHeight: 120,
            padding: `${spacing[2]}px ${spacing[3]}px`,
            borderRadius: radii.lg,
            background: surfaces.glass,
            border: `1px solid ${tooLong ? colors.danger : surfaces.border}`,
            color: colors.textPrimary,
            fontSize: 15,
            lineHeight: 1.4,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <Button
          variant="primary"
          loading={busy}
          disabled={!canSend}
          onClick={onSend}
          aria-label="Send message"
        >
          <Send style={{ width: 18, height: 18 }} />
        </Button>
      </div>
    </DiscoverShell>
  );
}

function MessageRow({
  message,
  mine,
  otherName,
  otherPhoto,
  showDay,
}: {
  message: ChatMessage;
  mine: boolean;
  otherName: string;
  otherPhoto?: string;
  showDay: boolean;
}) {
  return (
    <>
      {showDay && (
        <div style={{ textAlign: "center", margin: `${spacing[2]}px 0` }}>
          <Text variant="caption" tone="muted">
            {dayLabel(message.createdAt)}
          </Text>
        </div>
      )}
      <div
        className="flex items-end"
        style={{
          gap: spacing[2],
          justifyContent: mine ? "flex-end" : "flex-start",
        }}
      >
        {!mine && (
          <Avatar
            src={otherPhoto}
            initials={otherName.slice(0, 1).toUpperCase()}
            size="sm"
          />
        )}
        <div
          style={{
            maxWidth: "72%",
            padding: `${spacing[2]}px ${spacing[3]}px`,
            borderRadius: radii.lg,
            background: mine ? colors.brand : surfaces.glass,
            border: mine ? "none" : `1px solid ${surfaces.border}`,
            color: mine ? "#fff" : colors.textPrimary,
            borderBottomRightRadius: mine ? 4 : radii.lg,
            borderBottomLeftRadius: mine ? radii.lg : 4,
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {message.body}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 3,
              textAlign: "right",
              color: mine ? "rgba(255,255,255,0.75)" : colors.textMuted,
            }}
          >
            {timeLabel(message.createdAt)}
            {mine && message.readAt ? " · Read" : ""}
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- states --- */

function ChatSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Chat" />
      <div style={{ marginTop: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
        <Skeleton style={{ height: 44, width: "60%", borderRadius: 16 }} />
        <Skeleton style={{ height: 44, width: "55%", borderRadius: 16, alignSelf: "flex-end" }} />
        <Skeleton style={{ height: 44, width: "48%", borderRadius: 16 }} />
      </div>
    </DiscoverShell>
  );
}

function ChatUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Chat" onBack={() => navigate({ to: "/matches" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="messages"
          tone="slate"
          title="Conversation unavailable"
          description="This match isn't available anymore — it may have been unmatched, blocked, or the account was removed."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/matches" })}>
              Back to matches
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
