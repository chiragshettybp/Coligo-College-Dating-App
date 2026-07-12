// ============================================================================
// /chat/:chatId — the conversation. Real messages persisted to public.messages
// (RLS-scoped to the two participants), streamed via Supabase realtime, marked
// read on view. Grouped bubbles, day + unread separators, read receipts,
// optimistic + retryable sends, image sharing (signed upload → chat-media),
// replies, typing indicator, live presence and infinite upward scroll.
// Every visual is composed from the shared /ui chat components.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  conversationQuery,
  chatInfoQuery,
  chatListQuery,
  getConversation,
  sendMessage,
  markConversationRead,
  createChatImageUpload,
  MESSAGE_MAX,
  type ChatMessage,
} from "@/lib/chat.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { useChatTyping } from "@/lib/use-chat-channel";
import { colors, spacing } from "@/lib/ds";
import { Skeleton, Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import {
  ChatHeader,
  Bubble,
  DayDivider,
  UnreadDivider,
  TypingBubble,
  ImageMessage,
  Composer,
  type GroupPos,
  type MsgState,
} from "@/components/ds/chat";
import { ImageViewer } from "@/components/ds/image-viewer";

const CHAT_BUCKET = "chat-media";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(chatInfoQuery(params.chatId)),
      context.queryClient.ensureQueryData(conversationQuery(params.chatId)),
    ]),
  pendingComponent: ChatThreadSkeleton,
  errorComponent: ChatUnavailable,
  component: ChatThread,
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

type PendingMessage = ChatMessage & { pending: true; failed?: boolean; localId: string };

function ext(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "gif";
}

function ChatThread() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: info } = useSuspenseQuery(chatInfoQuery(chatId));
  const { data: convo } = useSuspenseQuery(conversationQuery(chatId));
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const onlineIds = useOnlineUserIds(profile?.id ?? null);

  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markConversationRead);
  const prepareUpload = useServerFn(createChatImageUpload);
  const loadMore = useServerFn(getConversation);

  const viewerId = convo?.viewerId ?? profile?.id ?? "";
  const other = info?.other;
  const otherOnline = other ? onlineIds.has(other.id) : false;
  const { otherTyping, sendTyping, stopTyping } = useChatTyping(chatId, viewerId);

  const [draft, setDraft] = useState("");
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(convo?.hasMore ?? false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = `chat-draft:${chatId}`;

  // Restore persisted draft.
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) setDraft(saved);
  }, [draftKey]);

  useEffect(() => {
    if (draft) localStorage.setItem(draftKey, draft);
    else localStorage.removeItem(draftKey);
  }, [draft, draftKey]);

  // Merge server messages with any successfully-sent-but-not-yet-refetched
  // pending items removed. De-dupe older + current by id.
  const serverMessages = useMemo<ChatMessage[]>(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of older) byId.set(m.id, m);
    for (const m of convo?.messages ?? []) byId.set(m.id, m);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [older, convo?.messages]);

  const messages = useMemo<(ChatMessage | PendingMessage)[]>(
    () => [...serverMessages, ...pending],
    [serverMessages, pending],
  );

  // First unread (from the other participant) index, for the unread divider.
  const firstUnreadId = useMemo(() => {
    const m = serverMessages.find((x) => x.senderId !== viewerId && !x.readAt);
    return m?.id ?? null;
  }, [serverMessages, viewerId]);

  // Realtime: new / updated messages refresh the thread + inbox.
  useEffect(() => {
    const refresh = () => {
      qc.invalidateQueries({ queryKey: conversationQuery(chatId).queryKey });
      qc.invalidateQueries({ queryKey: chatListQuery().queryKey });
    };
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${chatId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, qc]);

  // Mark the other side's messages read whenever the thread changes.
  useEffect(() => {
    const hasUnread = serverMessages.some((m) => m.senderId !== viewerId && !m.readAt);
    if (!hasUnread) return;
    markRead({ data: { chatId } })
      .then(() => qc.invalidateQueries({ queryKey: chatListQuery().queryKey }))
      .catch(() => {});
  }, [serverMessages, viewerId, chatId, markRead, qc]);

  // Auto-scroll to newest on new content (unless the user is reading history).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, otherTyping]);

  const onLoadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    const earliest = serverMessages[0];
    if (!earliest) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await loadMore({ data: { chatId, before: earliest.createdAt } });
      setOlder((prev) => [...res.messages, ...prev]);
      setHasMore(res.hasMore);
      // Preserve scroll position after prepending older messages.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch {
      toast.error("Couldn't load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, serverMessages, loadMore, chatId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 60) void onLoadOlder();
  };

  const doSend = async (opts: { body?: string; imagePath?: string; replyTo?: ChatMessage | null }) => {
    const localId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: PendingMessage = {
      id: localId,
      localId,
      pending: true,
      body: opts.body ?? "",
      senderId: viewerId,
      createdAt: new Date().toISOString(),
      readAt: null,
      kind: opts.imagePath ? "image" : "text",
      imageUrl: null,
      replyTo: opts.replyTo
        ? { id: opts.replyTo.id, body: opts.replyTo.body, senderId: opts.replyTo.senderId, kind: opts.replyTo.kind }
        : null,
    };
    setPending((p) => [...p, optimistic]);
    try {
      await send({
        data: {
          chatId,
          body: opts.body,
          imagePath: opts.imagePath,
          replyTo: opts.replyTo?.id,
        },
      });
      setPending((p) => p.filter((x) => x.localId !== localId));
      await Promise.all([
        qc.invalidateQueries({ queryKey: conversationQuery(chatId).queryKey }),
        qc.invalidateQueries({ queryKey: chatListQuery().queryKey }),
      ]);
    } catch (e) {
      setPending((p) => p.map((x) => (x.localId === localId ? { ...x, failed: true } : x)));
      toast.error(e instanceof Error ? e.message : "Couldn't send. Tap to retry.");
    }
  };

  const onSendText = () => {
    const body = draft.trim();
    if (!body || body.length > MESSAGE_MAX) return;
    const reply = replyingTo;
    setDraft("");
    setReplyingTo(null);
    stopTyping();
    void doSend({ body, replyTo: reply });
  };

  const onPickImage = () => fileRef.current?.click();

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Unsupported image format.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 8MB).");
      return;
    }
    const reply = replyingTo;
    setReplyingTo(null);
    try {
      const { path, token } = await prepareUpload({ data: { chatId, ext: ext(file.type) } });
      const { error } = await supabase.storage.from(CHAT_BUCKET).uploadToSignedUrl(path, token, file);
      if (error) throw new Error(error.message);
      await doSend({ imagePath: path, replyTo: reply });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    }
  };

  const retry = (m: PendingMessage) => {
    setPending((p) => p.filter((x) => x.localId !== m.localId));
    void doSend({
      body: m.kind === "text" ? m.body : undefined,
      imagePath: undefined,
      replyTo: m.replyTo ? (serverMessages.find((s) => s.id === m.replyTo?.id) ?? null) : null,
    });
  };

  if (!other) return <ChatUnavailable />;
  const name = other.fullName ?? "your match";
  const firstName = name.split(/\s+/)[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: 560,
        margin: "0 auto",
        background: "linear-gradient(180deg, #f6f7f9 0%, #f3f4f6 100%)",
      }}
    >
      <ChatHeader
        name={name}
        avatarSrc={other.photo ?? undefined}
        initials={name.slice(0, 1).toUpperCase()}
        online={otherOnline}
        statusText={otherTyping ? "typing…" : otherOnline ? "Active now" : "Offline"}
        onBack={() => navigate({ to: "/chat" })}
        onOpenInfo={() => navigate({ to: "/chat/$chatId/info", params: { chatId } })}
        onVoice={() => toast("Voice calling is coming soon.")}
        onVideo={() => toast("Video calling is coming soon.")}
      />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: `${spacing[3]}px ${spacing[4]}px`,
        }}
      >
        {loadingOlder && (
          <div style={{ textAlign: "center", padding: spacing[2] }}>
            <Skeleton style={{ height: 20, width: 90, borderRadius: 10, margin: "0 auto" }} />
          </div>
        )}

        {messages.length === 0 ? (
          <div style={{ margin: "auto 0", paddingTop: spacing[6] }}>
            <EmptyState
              scene="messages"
              tone="slate"
              title={`Say hi to ${firstName}`}
              description="This is the start of your conversation. Send the first message to break the ice."
            />
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const isPending = "pending" in m;
            const mine = m.senderId === viewerId;
            const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const showUnread = m.id === firstUnreadId;

            const samePrev = prev && prev.senderId === m.senderId && !showDay;
            const sameNext = next && next.senderId === m.senderId;
            let pos: GroupPos = "single";
            if (samePrev && sameNext) pos = "middle";
            else if (samePrev) pos = "last";
            else if (sameNext) pos = "first";

            const tail = pos === "single" || pos === "last";
            let state: MsgState | undefined;
            if (mine) {
              if (isPending) state = (m as PendingMessage).failed ? "failed" : "sending";
              else state = m.readAt ? "read" : "delivered";
            }

            const reply = m.replyTo
              ? {
                  author: m.replyTo.senderId === viewerId ? "You" : firstName,
                  text: m.replyTo.kind === "image" ? "📷 Photo" : m.replyTo.body,
                }
              : null;

            return (
              <div key={m.id}>
                {showDay && <DayDivider label={dayLabel(m.createdAt)} />}
                {showUnread && <UnreadDivider />}
                {m.kind === "image" && m.imageUrl ? (
                  <ImageMessage
                    mine={mine}
                    src={m.imageUrl}
                    time={tail ? timeLabel(m.createdAt) : undefined}
                    state={state}
                    onOpen={() => setViewerSrc(m.imageUrl)}
                  />
                ) : m.kind === "image" && isPending ? (
                  <ImageMessage mine={mine} uploading state={state} />
                ) : (
                  <div
                    onClick={() =>
                      isPending && (m as PendingMessage).failed ? retry(m as PendingMessage) : undefined
                    }
                  >
                    <Bubble
                      mine={mine}
                      groupPos={pos}
                      tail={tail}
                      time={tail ? timeLabel(m.createdAt) : undefined}
                      state={state}
                      reply={reply}
                      onLongPress={() =>
                        !isPending && setReplyingTo(m as ChatMessage)
                      }
                    >
                      {m.body}
                    </Bubble>
                  </div>
                )}
              </div>
            );
          })
        )}

        {otherTyping && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED.join(",")}
        onChange={onImageSelected}
        style={{ display: "none" }}
      />

      <Composer
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) sendTyping();
        }}
        onSend={onSendText}
        onAttach={onPickImage}
        onCamera={onPickImage}
        placeholder={`Message ${firstName}…`}
        canSend={draft.trim().length > 0 && draft.length <= MESSAGE_MAX}
        replyingTo={
          replyingTo
            ? {
                author: replyingTo.senderId === viewerId ? "You" : firstName,
                text: replyingTo.kind === "image" ? "📷 Photo" : replyingTo.body,
              }
            : null
        }
        onCancelReply={() => setReplyingTo(null)}
      />

      {viewerSrc && <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

function ChatThreadSkeleton() {
  return (
    <DiscoverShell active="matches">
      <div style={{ marginTop: spacing[4], display: "flex", flexDirection: "column", gap: spacing[3] }}>
        <Skeleton style={{ height: 44, width: "60%", borderRadius: 16 }} />
        <Skeleton style={{ height: 44, width: "55%", borderRadius: 16, alignSelf: "flex-end" }} />
        <Skeleton style={{ height: 44, width: "48%", borderRadius: 16 }} />
        <Skeleton style={{ height: 44, width: "52%", borderRadius: 16, alignSelf: "flex-end" }} />
      </div>
    </DiscoverShell>
  );
}

function ChatUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="matches">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="messages"
          tone="slate"
          title="Conversation unavailable"
          description="This chat isn't available anymore — it may have been unmatched, blocked, or the account was removed."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/chat" })}>
              Back to messages
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
