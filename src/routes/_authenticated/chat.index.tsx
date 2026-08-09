// ============================================================================
// /chat — conversation inbox. Every active match with a live preview: primary
// photo, name, latest message, timestamp, unread badge and realtime online
// status. Instant local search over name / college / department / last message.
// Realtime subscriptions (messages, matches, blocks, presence) keep it synced
// with Matches, Discovery and Blocks. Design-system only.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MessageCircle, ChevronRight, Bell, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { chatListQuery, type ChatListItem } from "@/lib/chat.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { colors, spacing, radii, surfaces, gradients, shadows, type as ds, weights } from "@/lib/ds";
import { Text, Avatar, Skeleton, Button } from "@/components/ds/glass";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { EmptyState, EmptyStateFromPreset } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import { usePushNotifications } from "@/lib/use-push";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Messages — Coligo Chat" },
      {
        name: "description",
        content: "Chat securely with your verified matches on Coligo. Your privacy is our priority.",
      },
      { property: "og:title", content: "Coligo Messages — Secure Campus Chat" },
      { property: "og:description", content: "Connect and message safely with other verified students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(chatListQuery()),
  pendingComponent: ChatListSkeleton,
  errorComponent: ChatListError,
  component: ChatInbox,
});

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function ChatInbox() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: chats } = useSuspenseQuery(chatListQuery());
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const onlineIds = useOnlineUserIds(profile?.id ?? null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: chatListQuery().queryKey });
    const channel = supabase
      .channel("chat-inbox:realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blocks" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);

  const totalUnread = useMemo(() => chats.reduce((n, c) => n + c.unreadCount, 0), [chats]);

  const newMatches = useMemo(
    () =>
      [...chats]
        .filter((c) => !c.lastMessage)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [chats],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = chats.filter((c) => {
      if (!q) return true;
      const hay = [
        c.other.fullName,
        c.other.collegeName,
        c.other.departmentName,
        c.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return [...list].sort(
      (a, b) =>
        new Date(b.lastMessageAt ?? b.createdAt).getTime() -
        new Date(a.lastMessageAt ?? a.createdAt).getTime(),
    );
  }, [chats, search]);

  return (
    <DiscoverShell active="chat" chatBadge={totalUnread}>
      <TopBar title="Messages" />

      <PushBanner />


      {chats.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyStateFromPreset
            preset="noMatches"
            onPrimary={() => navigate({ to: "/discover" })}
            onSecondary={() => navigate({ to: "/home" })}
          />
        </div>
      ) : (
        <>
          <div style={{ marginTop: spacing[3] }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search name, college, message"
              icon={<Search style={{ width: 18, height: 18 }} />}
            />
          </div>

          {newMatches.length > 0 && !search.trim() && (
            <div style={{ marginTop: spacing[4] }}>
              <Text variant="headingSm" color={colors.textPrimary} style={{ marginBottom: spacing[2] }}>
                New matches
              </Text>
              <div
                className="flex"
                style={{ gap: spacing[3], overflowX: "auto", paddingBottom: spacing[1] }}
              >
                {newMatches.map((c) => {
                  const name = c.other.fullName ?? "Someone";
                  return (
                    <button
                      key={c.chatId}
                      onClick={() => navigate({ to: "/chat/$chatId", params: { chatId: c.chatId } })}
                      className="ds-press flex flex-col items-center shrink-0"
                      aria-label={`Start chat with ${name}`}
                      style={{ gap: spacing[1], width: 72 }}
                    >
                      <Avatar
                        src={c.other.photo ?? undefined}
                        initials={name.slice(0, 1).toUpperCase()}
                        size="lg"
                        status={onlineIds.has(c.other.id) ? "online" : undefined}
                        verified
                      />
                      <Text variant="caption" color={colors.textPrimary} truncate style={{ maxWidth: 72, textAlign: "center" }}>
                        {name.split(" ")[0]}
                      </Text>
                      <Text variant="caption" tone="primary" truncate style={{ maxWidth: 72, textAlign: "center", fontWeight: weights.semibold }}>
                        Start chat
                      </Text>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[5] }}>
              <EmptyState
                scene="search"
                tone="slate"
                title="No conversations found"
                description="Try a different search to find the person you're looking for."
                primaryAction={
                  <Button variant="glass" fullWidth onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[4] }}>
              {visible.map((c) => (
                <ChatRow
                  key={c.chatId}
                  chat={c}
                  online={onlineIds.has(c.other.id)}
                  onOpen={() => navigate({ to: "/chat/$chatId", params: { chatId: c.chatId } })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </DiscoverShell>
  );
}

const PUSH_DISMISS_KEY = "push-banner-dismissed";

function PushBanner() {
  const { supported, enabled, loading, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(PUSH_DISMISS_KEY) === "1");
  }, []);

  if (!supported || enabled || dismissed) return null;

  const onEnable = async () => {
    const ok = await enable();
    if (ok) toast.success("Push notifications enabled");
    else toast("Enable notifications in your browser settings to get alerts.");
  };

  const onDismiss = () => {
    localStorage.setItem(PUSH_DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      className="flex items-center gap-3"
      style={{
        marginTop: spacing[3],
        padding: `${spacing[3]}px`,
        borderRadius: radii.lg,
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.borderSoft}`,
        boxShadow: shadows.soft,
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 40, height: 40, background: gradients.primaryButton, color: "#fff", boxShadow: shadows.primaryGlow }}
      >
        <Bell style={{ width: 20, height: 20 }} />
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ ...ds.titleMd, color: colors.textPrimary, fontWeight: weights.semibold }}>Turn on notifications</div>
        <div style={{ ...ds.caption, color: colors.textSecondary }}>Get alerted about new matches and messages.</div>
      </div>
      <button
        onClick={onEnable}
        disabled={loading}
        className="shrink-0 rounded-full"
        style={{
          padding: "8px 14px",
          background: gradients.primaryButton,
          color: "#fff",
          ...ds.caption,
          fontWeight: weights.semibold,
          boxShadow: shadows.primaryGlow,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "…" : "Enable"}
      </button>
      <button aria-label="Dismiss" onClick={onDismiss} className="shrink-0" style={{ color: colors.textMuted }}>
        <X style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}

function ChatRow({
  chat,
  online,
  onOpen,
}: {
  chat: ChatListItem;
  online: boolean;
  onOpen: () => void;
}) {
  const { other } = chat;
  const name = other.fullName ?? "Someone";
  const preview = chat.lastMessage
    ? chat.lastMessage.kind === "image"
      ? "📷 Photo"
      : chat.lastMessage.body
    : "You matched — say hello 👋";
  const meta = [other.collegeName, other.departmentName].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onOpen}
      className="ds-press flex items-center w-full text-left"
      aria-label={`Open conversation with ${name}`}
      style={{
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: radii.lg,
        background: surfaces.glass,
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <span className="shrink-0">
        <Avatar
          src={other.photo ?? undefined}
          initials={name.slice(0, 1).toUpperCase()}
          size="lg"
          status={online ? "online" : undefined}
          verified
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: spacing[1], justifyContent: "space-between" }}>
          <Text variant="headingSm" color={colors.textPrimary} truncate style={{ flex: 1, minWidth: 0 }}>
            {name}
          </Text>
          <Text variant="caption" tone="muted" style={{ flexShrink: 0 }}>
            {relTime(chat.lastMessageAt ?? chat.createdAt)}
          </Text>
        </div>
        {meta && (
          <Text variant="caption" tone="muted" truncate style={{ marginTop: 1 }}>
            {meta}
          </Text>
        )}
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: 4 }}>
          <Text
            variant="bodySm"
            tone={chat.unreadCount > 0 ? "primary" : "secondary"}
            truncate
            style={{ flex: 1, fontWeight: chat.unreadCount > 0 ? 600 : 400 }}
          >
            {preview}
          </Text>
          {chat.unreadCount > 0 ? (
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: radii.pill,
                background: colors.primary,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {chat.unreadCount}
            </span>
          ) : (
            <MessageCircle style={{ width: 16, height: 16, color: colors.textMuted, flexShrink: 0 }} />
          )}
        </div>
      </div>
      <ChevronRight style={{ width: 18, height: 18, color: colors.textMuted, flexShrink: 0 }} />
    </button>
  );
}

/* --------------------------------------------------------------- states --- */

function ChatListSkeleton() {
  return (
    <DiscoverShell active="chat">
      <TopBar title="Messages" />
      <Skeleton style={{ height: 44, borderRadius: 12, marginTop: spacing[3] }} />
      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ height: 82, borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function ChatListError() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <DiscoverShell active="chat">
      <TopBar title="Messages" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset
          preset="error"
          onPrimary={() => qc.invalidateQueries({ queryKey: chatListQuery().queryKey })}
          onSecondary={() => navigate({ to: "/home" })}
        />
      </div>
    </DiscoverShell>
  );
}
