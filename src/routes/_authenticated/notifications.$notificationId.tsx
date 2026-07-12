// ============================================================================
// /notifications/:notificationId — full notification detail with contextual
// actions. Marks the notification read on open, resolves the related actor and
// verifies the linked destination still exists (gracefully degrades when it
// doesn't). Real Supabase data, RLS-scoped. Design-system only.
// ============================================================================
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Sparkles, UserRound, Home, Trash2 } from "lucide-react";

import {
  notificationDetailQuery,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Avatar, Badge, Button, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import {
  categoryVisual,
  priorityTone,
  fullTime,
} from "@/components/notifications/notification-visuals";

export const Route = createFileRoute("/_authenticated/notifications/$notificationId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(notificationDetailQuery(params.notificationId)),
  pendingComponent: () => <DetailSkeleton />,
  errorComponent: () => <DetailUnavailable />,
  component: NotificationDetailPage,
});

function NotificationDetailPage() {
  const { notificationId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: n } = useSuspenseQuery(notificationDetailQuery(notificationId));
  const markOne = useServerFn(markNotificationRead);

  // Mark read on open (and reflect it in caches).
  useEffect(() => {
    if (!n || n.readAt) return;
    markOne({ data: { id: n.id } })
      .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))
      .catch(() => {});
  }, [n, markOne, qc]);

  if (!n) return <DetailUnavailable />;

  const v = categoryVisual(n.category);
  const pTone = priorityTone(n.priority);
  const matchId = typeof n.data.matchId === "string" ? n.data.matchId : null;
  const actorId = n.actor?.id ?? null;

  return (
    <DiscoverShell active="home">
      <TopBar title="Notification" onBack={() => navigate({ to: "/notifications" })} />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        {n.actor?.photo || n.actor?.name ? (
          <Avatar
            src={n.actor.photo ?? undefined}
            initials={(n.actor.name ?? "?").slice(0, 1).toUpperCase()}
            size="xl"
          />
        ) : (
          <span
            className="flex items-center justify-center"
            style={{ width: 84, height: 84, borderRadius: 999, background: v.chip, color: "#fff" }}
          >
            <v.Icon style={{ width: 38, height: 38 }} />
          </span>
        )}
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
          <Badge tone={v.tone} dot>
            {v.label}
          </Badge>
          {pTone && <Badge tone={pTone}>{n.priority === "urgent" ? "Urgent" : "Important"}</Badge>}
        </div>
        <Text variant="headingLg" style={{ marginTop: spacing[3] }}>
          {n.title}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing[1] }}>
          {fullTime(n.createdAt)}
        </Text>
      </div>

      {n.body && (
        <Card style={{ marginTop: spacing[5] }}>
          <CardBody>
            <Text variant="body" tone="secondary" style={{ whiteSpace: "pre-wrap" }}>
              {n.body}
            </Text>
          </CardBody>
        </Card>
      )}

      {!n.targetExists && (matchId || n.route) && (
        <div
          style={{
            marginTop: spacing[4],
            padding: spacing[3],
            borderRadius: radii.lg,
            background: surfaces.glass,
            border: `1px solid ${surfaces.borderSoft}`,
          }}
        >
          <Text variant="bodySm" tone="secondary" align="center">
            The linked conversation or match is no longer available.
          </Text>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        {n.targetExists && n.category === "messages" && matchId && (
          <Button
            variant="primary"
            fullWidth
            leftIcon={<MessageCircle style={{ width: 18, height: 18 }} />}
            onClick={() => navigate({ to: "/chat/$chatId", params: { chatId: matchId } })}
          >
            Open chat
          </Button>
        )}
        {n.targetExists && n.category === "matches" && matchId && (
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Sparkles style={{ width: 18, height: 18 }} />}
            onClick={() => navigate({ to: "/discover/match/$matchId", params: { matchId } })}
          >
            View match
          </Button>
        )}
        {actorId && (
          <Button
            variant="glass"
            fullWidth
            leftIcon={<UserRound style={{ width: 18, height: 18 }} />}
            onClick={() => navigate({ to: "/discover/profile/$userId", params: { userId: actorId } })}
          >
            View profile
          </Button>
        )}
        <Button
          variant="glass"
          fullWidth
          leftIcon={<Home style={{ width: 18, height: 18 }} />}
          onClick={() => navigate({ to: "/home" })}
        >
          Go home
        </Button>
        <Button
          variant="ghost"
          fullWidth
          leftIcon={<Trash2 style={{ width: 18, height: 18 }} />}
          onClick={() =>
            navigate({
              to: "/notifications/$notificationId/delete",
              params: { notificationId: n.id },
            })
          }
        >
          Delete
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* ------------------------------------------------------------- states ------ */

function DetailSkeleton() {
  return (
    <DiscoverShell active="home">
      <TopBar title="Notification" />
      <div className="flex flex-col items-center" style={{ marginTop: spacing[6] }}>
        <Skeleton style={{ width: 84, height: 84, borderRadius: 999 }} />
        <Skeleton style={{ width: 220, height: 26, borderRadius: 8, marginTop: spacing[4] }} />
        <Skeleton style={{ width: 140, height: 14, borderRadius: 8, marginTop: spacing[2] }} />
      </div>
      <Skeleton style={{ height: 120, borderRadius: 18, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

function DetailUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="home">
      <TopBar title="Notification" onBack={() => navigate({ to: "/notifications" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Notification unavailable"
          description="This notification can't be found — it may have been deleted."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/notifications" })}>
              Back to notifications
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
