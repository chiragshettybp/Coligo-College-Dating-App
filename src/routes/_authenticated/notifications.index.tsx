// ============================================================================
// /notifications — the user's activity hub. Real notification rows from
// Supabase (RLS-scoped), newest first, kept live via realtime. Tap to mark read
// and jump to the linked destination; mark-all-read; pull-to-refresh; skeletons;
// empty state. Design-system only — no mocks, no placeholders.
// ============================================================================
import { useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCheck, ChevronRight, Loader2 } from "lucide-react";

import { myProfileQuery } from "@/lib/profile.functions";
import {
  notificationsQuery,
  unreadNotificationCountQuery,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
  type NotificationPage,
} from "@/lib/notifications.functions";
import { useNotificationsRealtime } from "@/lib/use-notifications";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Avatar, Badge, Skeleton, Button } from "@/components/ds/glass";
import { TopBar } from "@/components/ds/navigation";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import {
  categoryVisual,
  priorityTone,
  relTime,
} from "@/components/notifications/notification-visuals";

export const Route = createFileRoute("/_authenticated/notifications/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(notificationsQuery()),
      context.queryClient.ensureQueryData(unreadNotificationCountQuery()),
    ]);
  },
  pendingComponent: NotificationsSkeleton,
  errorComponent: NotificationsError,
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const { data: page } = useSuspenseQuery(notificationsQuery());
  const { data: unread = 0 } = useQuery(unreadNotificationCountQuery());

  useNotificationsRealtime(profile?.id);

  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    [qc],
  );
  const { distance, refreshing } = usePullToRefresh(refresh);

  const patchRead = (id: string) => {
    qc.setQueryData<NotificationPage>(notificationsQuery().queryKey, (old) =>
      old
        ? {
            ...old,
            items: old.items.map((n) =>
              n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
            ),
          }
        : old,
    );
    qc.setQueryData<number>(unreadNotificationCountQuery().queryKey, (n) =>
      Math.max(0, (n ?? 1) - 1),
    );
  };

  const onOpen = async (n: NotificationItem) => {
    if (!n.readAt) {
      patchRead(n.id);
      markOne({ data: { id: n.id } }).catch(() => {});
    }
    // Route to the contextual destination when known; otherwise open detail.
    const chat = n.route?.match(/^\/chat\/(.+)$/);
    const match = n.route?.match(/^\/discover\/match\/(.+)$/);
    if (chat) {
      navigate({ to: "/chat/$chatId", params: { chatId: chat[1] } });
    } else if (match) {
      navigate({ to: "/discover/match/$matchId", params: { matchId: match[1] } });
    } else {
      navigate({ to: "/notifications/$notificationId", params: { notificationId: n.id } });
    }
  };

  const onMarkAll = async () => {
    if (unread === 0) {
      toast("You're all caught up.");
      return;
    }
    qc.setQueryData<NotificationPage>(notificationsQuery().queryKey, (old) =>
      old
        ? { ...old, items: old.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) }
        : old,
    );
    qc.setQueryData<number>(unreadNotificationCountQuery().queryKey, 0);
    try {
      const res = await markAll();
      toast.success(res.updated > 0 ? `Marked ${res.updated} as read` : "All caught up");
    } catch {
      toast.error("Couldn't update. Pull to refresh.");
      refresh();
    }
  };

  const items = page.items;

  return (
    <DiscoverShell active="home">
      <TopBar
        title="Notifications"
        onBack={() => navigate({ to: "/home" })}
        trailing={
          items.length > 0 ? (
            <button
              aria-label="Mark all as read"
              onClick={onMarkAll}
              className="ds-press flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: radii.pill, color: unread > 0 ? colors.primary : colors.textMuted }}
            >
              <CheckCheck style={{ width: 20, height: 20 }} />
            </button>
          ) : undefined
        }
      />

      {/* Pull-to-refresh indicator */}
      <div
        aria-hidden
        style={{
          height: distance,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: refreshing ? "none" : "height 200ms ease",
        }}
      >
        {distance > 8 && (
          <Loader2
            className={refreshing ? "animate-spin" : undefined}
            style={{
              width: 22,
              height: 22,
              color: colors.textMuted,
              transform: refreshing ? undefined : `rotate(${distance * 3}deg)`,
            }}
          />
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyStateFromPreset
            preset="noNotifications"
            onPrimary={() => navigate({ to: "/home" })}
          />
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[3] }}>
          {items.map((n) => (
            <NotificationRow key={n.id} n={n} onOpen={() => onOpen(n)} />
          ))}
        </div>
      )}
    </DiscoverShell>
  );
}

function NotificationRow({ n, onOpen }: { n: NotificationItem; onOpen: () => void }) {
  const v = categoryVisual(n.category);
  const pTone = priorityTone(n.priority);
  const unreadDot = !n.readAt;

  return (
    <button
      onClick={onOpen}
      className="ds-press flex items-center w-full text-left"
      aria-label={`${v.label}: ${n.title}${unreadDot ? " (unread)" : ""}`}
      style={{
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: radii.lg,
        background: unreadDot ? surfaces.glassSoft : surfaces.glass,
        border: `1px solid ${unreadDot ? surfaces.border : surfaces.borderSoft}`,
      }}
    >
      {/* Icon or actor avatar */}
      <span className="shrink-0 relative">
        {n.actor?.photo || n.actor?.name ? (
          <Avatar
            src={n.actor.photo ?? undefined}
            initials={(n.actor.name ?? "?").slice(0, 1).toUpperCase()}
            size="lg"
          />
        ) : (
          <span
            className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 999, background: v.chip, color: "#fff" }}
          >
            <v.Icon style={{ width: 24, height: 24 }} />
          </span>
        )}
        {(n.actor?.photo || n.actor?.name) && (
          <span
            className="flex items-center justify-center absolute"
            style={{
              right: -2,
              bottom: -2,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: v.chip,
              color: "#fff",
              border: `2px solid ${surfaces.glassSoft}`,
            }}
          >
            <v.Icon style={{ width: 12, height: 12 }} />
          </span>
        )}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: spacing[2], justifyContent: "space-between" }}>
          <Text variant="headingSm" color={colors.textPrimary} truncate style={{ flex: 1, minWidth: 0 }}>
            {n.title}
          </Text>
          <Text variant="caption" tone="muted" style={{ flexShrink: 0 }}>
            {relTime(n.createdAt)}
          </Text>
        </div>
        {n.body && (
          <Text variant="bodySm" tone={unreadDot ? "secondary" : "muted"} clamp={2} style={{ marginTop: 2 }}>
            {n.body}
          </Text>
        )}
        {pTone && (
          <div style={{ marginTop: spacing[2] }}>
            <Badge tone={pTone} dot>
              {n.priority === "urgent" ? "Urgent" : "Important"}
            </Badge>
          </div>
        )}
      </div>

      <span className="shrink-0 flex items-center" style={{ gap: spacing[1] }}>
        {unreadDot && (
          <span style={{ width: 9, height: 9, borderRadius: 999, background: colors.primary }} />
        )}
        <ChevronRight style={{ width: 18, height: 18, color: colors.textMuted }} />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------- states ------ */

function NotificationsSkeleton() {
  return (
    <DiscoverShell active="home">
      <TopBar title="Notifications" />
      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ gap: spacing[3], padding: spacing[3], borderRadius: radii.lg, background: surfaces.glass }}
          >
            <Skeleton style={{ width: 52, height: 52, borderRadius: 999 }} />
            <div style={{ flex: 1 }}>
              <Skeleton style={{ height: 16, width: "55%" }} />
              <Skeleton style={{ height: 13, width: "80%", marginTop: spacing[2] }} />
            </div>
          </div>
        ))}
      </div>
    </DiscoverShell>
  );
}

function NotificationsError() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <DiscoverShell active="home">
      <TopBar title="Notifications" onBack={() => navigate({ to: "/home" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset
          preset="error"
          onPrimary={() => qc.invalidateQueries({ queryKey: ["notifications"] })}
          onSecondary={() => navigate({ to: "/home" })}
        />
      </div>
    </DiscoverShell>
  );
}
