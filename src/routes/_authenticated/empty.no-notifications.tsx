// ============================================================================
// /empty/no-notifications — fallback shown when the notification list is empty.
// Confirms against the live notifications query before rendering; redirects to
// /notifications if any exist. Realtime resolves the state the instant a
// notification is inserted for the user. Design-system only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  notificationsQuery,
  type NotificationPage,
} from "@/lib/notifications.functions";
import { useEmptyGuard } from "@/lib/use-empty-guard";
import { spacing } from "@/lib/ds";
import { Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/empty/no-notifications")({
  component: NoNotificationsPage,
});

function NoNotificationsPage() {
  const navigate = useNavigate();
  const { checking, refresh } = useEmptyGuard<NotificationPage>({
    query: notificationsQuery(),
    hasData: (p) => p.items.length > 0,
    onData: () => navigate({ to: "/notifications", replace: true }),
    tables: ["notifications"],
    channel: "empty:no-notifications",
    emptyMessage: "You're all caught up.",
  });

  return (
    <DiscoverShell active="home">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="notifications"
          tone="amber"
          title="No notifications yet"
          description="You're all caught up. New matches, messages and updates will appear here the moment they happen."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/home" })}>
              Go home
            </Button>
          }
          secondaryAction={
            <Button variant="ghost" fullWidth loading={checking} onClick={refresh}>
              Refresh
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
