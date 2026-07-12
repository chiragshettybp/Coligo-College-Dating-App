// ============================================================================
// /chat/:chatId — the conversation. Real messages persisted to public.messages
// (RLS-scoped to the two participants), streamed via Supabase realtime, marked
// delivered + read on view. Grouped bubbles, day + unread separators, read
// receipts (sent → delivered → read), optimistic + retryable sends, image
// sharing, voice notes (record → signed upload → chat-media), emoji reactions,
// an emoji picker, replies, typing, live presence and infinite upward scroll.
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
  markConversationDelivered,
  toggleReaction,
  createChatImageUpload,
  createChatAudioUpload,
  MESSAGE_MAX,
  type ChatMessage,
} from "@/lib/chat.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { useChatTyping } from "@/lib/use-chat-channel";
import { useVoiceRecorder, voiceSupported } from "@/lib/use-voice-recorder";
import { haptic } from "@/lib/haptics";
import { colors, radii, shadows, spacing, surfaces, type, weights } from "@/lib/ds";
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
  ReactionsRow,
  type GroupPos,
  type MsgState,
  type ReactionGroup,
} from "@/components/ds/chat";
import { VoiceMessage, VoiceRecordingBar } from "@/components/ds/voice-message";
import { EmojiPicker, QUICK_REACTIONS } from "@/components/ds/emoji-picker";
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

function groupReactions(
  reactions: Record<string, string[]> | undefined,
  viewerId: string,
): ReactionGroup[] {
  if (!reactions) return [];
  return Object.entries(reactions)
    .filter(([, users]) => users.length > 0)
    .map(([emoji, users]) => ({ emoji, count: users.length, mine: users.includes(viewerId) }));
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
  const markDelivered = useServerFn(markConversationDelivered);
  const react = useServerFn(toggleReaction);
  const prepareUpload = useServerFn(createChatImageUpload);
  const prepareAudio = useServerFn(createChatAudioUpload);
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuMsg, setMenuMsg] = useState<ChatMessage | null>(null);
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, Record<string, string[]>>>({});

  const voice = useVoiceRecorder();
  const canRecordVoice = useMemo(() => voiceSupported(), []);

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

  // Merge server messages, de-duped by id.
  const serverMessages = useMemo<ChatMessage[]>(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of older) byId.set(m.id, m);
    for (const m of convo?.messages ?? []) byId.set(m.id, m);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [older, convo?.messages]);

  // Fresh server data is authoritative — drop stale optimistic reaction overrides.
  useEffect(() => {
    setReactionOverrides({});
  }, [convo?.messages]);

  const messages = useMemo<(ChatMessage | PendingMessage)[]>(
    () => [...serverMessages, ...pending],
    [serverMessages, pending],
  );

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
        () => {
          markDelivered({ data: { chatId } }).catch(() => {});
          refresh();
        },
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
  }, [chatId, qc, markDelivered]);

  // Mark the other side's messages delivered as soon as they're received here.
  useEffect(() => {
    const undelivered = serverMessages.some((m) => m.senderId !== viewerId && !m.deliveredAt);
    if (undelivered) markDelivered({ data: { chatId } }).catch(() => {});
  }, [serverMessages, viewerId, chatId, markDelivered]);

  // Mark the other side's messages read whenever the thread changes.
  useEffect(() => {
    const hasUnread = serverMessages.some((m) => m.senderId !== viewerId && !m.readAt);
    if (!hasUnread) return;
    markRead({ data: { chatId } })
      .then(() => qc.invalidateQueries({ queryKey: chatListQuery().queryKey }))
      .catch(() => {});
  }, [serverMessages, viewerId, chatId, markRead, qc]);

  // Auto-scroll to newest on new content.
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

  const doSend = async (opts: {
    body?: string;
    imagePath?: string;
    audioPath?: string;
    audioDurationMs?: number;
    replyTo?: ChatMessage | null;
  }) => {
    const localId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const kind = opts.audioPath ? "voice" : opts.imagePath ? "image" : "text";
    const optimistic: PendingMessage = {
      id: localId,
      localId,
      pending: true,
      body: opts.body ?? "",
      senderId: viewerId,
      createdAt: new Date().toISOString(),
      readAt: null,
      deliveredAt: null,
      kind,
      imageUrl: null,
      audioUrl: null,
      audioDurationMs: opts.audioDurationMs ?? null,
      reactions: {},
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
          audioPath: opts.audioPath,
          audioDurationMs: opts.audioDurationMs,
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
    setShowEmoji(false);
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

  // --- Voice notes -----------------------------------------------------------
  const onStartVoice = async () => {
    setShowEmoji(false);
    const ok = await voice.start();
    if (!ok && voice.error) toast.error(voice.error);
  };

  const onCancelVoice = () => voice.cancel();

  const onSendVoice = async () => {
    const reply = replyingTo;
    const result = await voice.stop();
    if (!result) return;
    setReplyingTo(null);
    try {
      const { path, token } = await prepareAudio({ data: { chatId, ext: result.ext } });
      const { error } = await supabase.storage
        .from(CHAT_BUCKET)
        .uploadToSignedUrl(path, token, result.blob, { contentType: result.mime });
      if (error) throw new Error(error.message);
      await doSend({ audioPath: path, audioDurationMs: result.durationMs, replyTo: reply });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voice message failed to send.");
    }
  };

  // --- Reactions -------------------------------------------------------------
  const getReactions = useCallback(
    (m: ChatMessage): Record<string, string[]> => reactionOverrides[m.id] ?? m.reactions ?? {},
    [reactionOverrides],
  );

  const onReact = useCallback(
    (messageId: string, emoji: string, current: Record<string, string[]>) => {
      haptic("light");
      const users = current[emoji] ?? [];
      const mine = users.includes(viewerId);
      const next: Record<string, string[]> = { ...current };
      if (mine) {
        const filtered = users.filter((u) => u !== viewerId);
        if (filtered.length) next[emoji] = filtered;
        else delete next[emoji];
      } else {
        next[emoji] = [...users, viewerId];
      }
      setReactionOverrides((o) => ({ ...o, [messageId]: next }));
      react({ data: { messageId, emoji } })
        .then((res) => setReactionOverrides((o) => ({ ...o, [messageId]: res })))
        .catch(() => {
          setReactionOverrides((o) => ({ ...o, [messageId]: current }));
          toast.error("Couldn't react.");
        });
    },
    [react, viewerId],
  );

  const retry = (m: PendingMessage) => {
    setPending((p) => p.filter((x) => x.localId !== m.localId));
    void doSend({
      body: m.kind === "text" ? m.body : undefined,
      replyTo: m.replyTo ? (serverMessages.find((s) => s.id === m.replyTo?.id) ?? null) : null,
    });
  };

  if (!other) return <ChatUnavailable />;
  const name = other.fullName ?? "your match";
  const firstName = name.split(/\s+/)[0];

  const insertEmoji = (e: string) => setDraft((d) => d + e);

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
              else if (m.readAt) state = "read";
              else if (m.deliveredAt) state = "delivered";
              else state = "sent";
            }

            const reply = m.replyTo
              ? {
                  author: m.replyTo.senderId === viewerId ? "You" : firstName,
                  text:
                    m.replyTo.kind === "image"
                      ? "📷 Photo"
                      : m.replyTo.kind === "voice"
                        ? "🎤 Voice message"
                        : m.replyTo.body,
                }
              : null;

            const reactionMap = isPending ? {} : getReactions(m as ChatMessage);
            const reactionGroups = groupReactions(reactionMap, viewerId);
            const openMenu = () => !isPending && setMenuMsg(m as ChatMessage);

            return (
              <div key={m.id}>
                {showDay && <DayDivider label={dayLabel(m.createdAt)} />}
                {showUnread && <UnreadDivider />}
                {m.kind === "voice" && (m.audioUrl || isPending) ? (
                  <>
                    <div onContextMenu={(e) => { e.preventDefault(); openMenu(); }}>
                      <VoiceMessage
                        id={m.id}
                        mine={mine}
                        src={m.audioUrl}
                        durationMs={m.audioDurationMs}
                        time={tail ? timeLabel(m.createdAt) : undefined}
                        state={state}
                      />
                    </div>
                    <ReactionsRow reactions={reactionGroups} mine={mine} onTap={(e) => onReact(m.id, e, reactionMap)} />
                  </>
                ) : m.kind === "image" && m.imageUrl ? (
                  <>
                    <div onContextMenu={(e) => { e.preventDefault(); openMenu(); }}>
                      <ImageMessage
                        mine={mine}
                        src={m.imageUrl}
                        time={tail ? timeLabel(m.createdAt) : undefined}
                        state={state}
                        onOpen={() => setViewerSrc(m.imageUrl)}
                      />
                    </div>
                    <ReactionsRow reactions={reactionGroups} mine={mine} onTap={(e) => onReact(m.id, e, reactionMap)} />
                  </>
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
                      reactions={reactionGroups}
                      onReactionTap={(e) => onReact(m.id, e, reactionMap)}
                      onLongPress={openMenu}
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

      {showEmoji && !voice.recording && (
        <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
      )}

      {voice.recording ? (
        <VoiceRecordingBar durationMs={voice.durationMs} onCancel={onCancelVoice} onSend={onSendVoice} />
      ) : (
        <Composer
          value={draft}
          onChange={(v) => {
            setDraft(v);
            if (v) sendTyping();
          }}
          onSend={onSendText}
          onAttach={onPickImage}
          onCamera={onPickImage}
          onEmoji={() => setShowEmoji((s) => !s)}
          onVoice={canRecordVoice ? onStartVoice : undefined}
          emojiActive={showEmoji}
          placeholder={`Message ${firstName}…`}
          canSend={draft.trim().length > 0 && draft.length <= MESSAGE_MAX}
          replyingTo={
            replyingTo
              ? {
                  author: replyingTo.senderId === viewerId ? "You" : firstName,
                  text:
                    replyingTo.kind === "image"
                      ? "📷 Photo"
                      : replyingTo.kind === "voice"
                        ? "🎤 Voice message"
                        : replyingTo.body,
                }
              : null
          }
          onCancelReply={() => setReplyingTo(null)}
        />
      )}

      {menuMsg && (
        <MessageActionSheet
          message={menuMsg}
          viewerId={viewerId}
          reactions={getReactions(menuMsg)}
          onReact={(emoji) => {
            onReact(menuMsg.id, emoji, getReactions(menuMsg));
            setMenuMsg(null);
          }}
          onReply={() => {
            setReplyingTo(menuMsg);
            setMenuMsg(null);
          }}
          onClose={() => setMenuMsg(null)}
        />
      )}

      {viewerSrc && <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}

/* ------------------------------------------------------- action sheet ----- */

function MessageActionSheet({
  message,
  viewerId,
  reactions,
  onReact,
  onReply,
  onClose,
}: {
  message: ChatMessage;
  viewerId: string;
  reactions: Record<string, string[]>;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onClose: () => void;
}) {
  const canCopy = message.kind === "text" && !!message.body;
  return (
    <div
      role="dialog"
      aria-label="Message actions"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(15,18,24,0.34)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ds-sheet-up"
        style={{
          width: "100%",
          maxWidth: 520,
          margin: spacing[3],
          borderRadius: radii.xl,
          background: "rgba(255,255,255,0.98)",
          border: `1px solid ${surfaces.borderSoft}`,
          boxShadow: shadows.floating,
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: `${spacing[3]}px ${spacing[3]}px ${spacing[2]}px` }}
        >
          {QUICK_REACTIONS.map((e) => {
            const mine = (reactions[e] ?? []).includes(viewerId);
            return (
              <button
                key={e}
                aria-label={`React ${e}`}
                onClick={() => onReact(e)}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 42,
                  height: 42,
                  fontSize: 24,
                  background: mine ? "rgba(255,73,105,0.14)" : "transparent",
                  border: `1px solid ${mine ? colors.primary : "transparent"}`,
                }}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div style={{ height: 1, background: surfaces.borderSoft }} />
        <SheetAction label="Reply" onClick={onReply} />
        {canCopy && (
          <SheetAction
            label="Copy text"
            onClick={() => {
              navigator.clipboard?.writeText(message.body).catch(() => {});
              toast.success("Copied");
              onClose();
            }}
          />
        )}
        <SheetAction label="Cancel" muted onClick={onClose} />
      </div>
    </div>
  );
}

function SheetAction({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{
        padding: `${spacing[3]}px ${spacing[4]}px`,
        borderTop: `1px solid ${surfaces.borderSoft}`,
        ...type.bodyLg,
        fontSize: 15,
        fontWeight: weights.medium,
        color: muted ? colors.textMuted : colors.textPrimary,
      }}
    >
      {label}
    </button>
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
