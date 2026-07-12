// ============================================================================
// /notifications/:notificationId/delete — dedicated delete-confirmation page
// (never a popup, per spec). Soft-deletes the notification server-side,
// idempotently (already-deleted is treated as success), updates caches and
// returns to the list. Design-system only.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  notificationDetailQuery,
  notificationsQuery,
  unreadNotificationCountQuery,
  deleteNotification,
  type NotificationPage,
} from "@/lib/notifications.functions";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Button, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";
import { categoryVisual } from "@/components/notifications/notification-visuals";

export const Route = createFileRoute("/_authenticated/notifications/$notificationId/delete")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(notificationDetailQuery(params.notificationId)),
  pendingComponent: () => <DeleteSkeleton />,
  errorComponent: () => <DeleteUnavailable />,
  component: DeleteNotificationPage,
});

const CONSEQUENCES = [
  "This notification will be removed from your list.",
  "Any linked match or chat is not affected.",
  "This can't be undone.",
];

function DeleteNotificationPage() {
  const { notificationId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: n } = useSuspenseQuery(notificationDetailQuery(notificationId));
  const run = useServerFn(deleteNotification);
  const [busy, setBusy] = useState(false);

  if (!n) return <DeleteUnavailable />;
  const v = categoryVisual(n.category);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await run({ data: { id: notificationId } });
      // Optimistically drop it everywhere (idempotent — already-deleted is fine).
      qc.setQueryData<NotificationPage>(notificationsQuery().queryKey, (old) =>
        old ? { ...old, items: old.items.filter((x) => x.id !== notificationId) } : old,
      );
      if (!n.readAt) {
        qc.setQueryData<number>(unreadNotificationCountQuery().queryKey, (c) =>
          Math.max(0, (c ?? 1) - 1),
        );
      }
      qc.removeQueries({ queryKey: notificationDetailQuery(notificationId).queryKey });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
      navigate({ to: "/notifications" });
    } catch {
      toast.error("Couldn't delete. Please try again.");
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="home">
      <TopBar
        title="Delete"
        onBack={() =>
          navigate({ to: "/notifications/$notificationId", params: { notificationId } })
        }
      />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        <span
          className="flex items-center justify-center"
          style={{ width: 84, height: 84, borderRadius: 999, background: v.chip, color: "#fff" }}
        >
          <v.Icon style={{ width: 38, height: 38 }} />
        </span>
        <Text variant="headingLg" style={{ marginTop: spacing[4] }}>
          Delete this notification?
        </Text>
        <Text variant="bodySm" tone="secondary" style={{ marginTop: spacing[2], maxWidth: 320 }}>
          {n.title}
        </Text>
      </div>

      <Card style={{ marginTop: spacing[5] }}>
        <CardBody>
          <div className="flex flex-col" style={{ gap: spacing[2] }}>
            {CONSEQUENCES.map((c) => (
              <div key={c} className="flex items-start" style={{ gap: spacing[2] }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: colors.textMuted,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text variant="bodySm" tone="secondary">
                  {c}
                </Text>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[6] }}>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          onClick={onConfirm}
          leftIcon={<Trash2 style={{ width: 18, height: 18 }} />}
        >
          Delete notification
        </Button>
        <Button
          variant="glass"
          fullWidth
          disabled={busy}
          onClick={() =>
            navigate({ to: "/notifications/$notificationId", params: { notificationId } })
          }
        >
          Cancel
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* ------------------------------------------------------------- states ------ */

function DeleteSkeleton() {
  return (
    <DiscoverShell active="home">
      <TopBar title="Delete" />
      <div className="flex flex-col items-center" style={{ marginTop: spacing[6] }}>
        <Skeleton style={{ width: 84, height: 84, borderRadius: 999 }} />
        <Skeleton style={{ width: 220, height: 26, borderRadius: 8, marginTop: spacing[4] }} />
      </div>
      <div style={{ height: 1, background: surfaces.borderSoft, marginTop: spacing[5] }} />
      <Skeleton style={{ height: 120, borderRadius: 18, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

function DeleteUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="home">
      <TopBar title="Delete" onBack={() => navigate({ to: "/notifications" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="deleted"
          tone="slate"
          title="Already removed"
          description="This notification is no longer available — it may already have been deleted."
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
