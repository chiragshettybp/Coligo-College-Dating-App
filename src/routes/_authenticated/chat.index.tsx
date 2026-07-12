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
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Avatar, Skeleton, Button } from "@/components/ds/glass";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { EmptyState, EmptyStateFromPreset } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/chat/")({
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
    <DiscoverShell active="matches" matchesBadge={totalUnread}>
      <TopBar title="Messages" />

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
    <DiscoverShell active="matches">
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
    <DiscoverShell active="matches">
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
