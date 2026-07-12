// ============================================================================
// /settings/blocked-users — manage blocked accounts. Lists blocked users with
// their photo, name, college and block date, and links to a dedicated unblock
// confirmation page (never a popup). Stays live via realtime.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { blockedUsersQuery } from "@/lib/settings.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { colors, spacing } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/blocked-users")({
  head: () => ({
    meta: [{ title: "Blocked users — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(blockedUsersQuery()),
  pendingComponent: BlockedSkeleton,
  errorComponent: BlockedError,
  component: BlockedUsersPage,
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BlockedUsersPage() {
  const navigate = useNavigate();
  const { data: blocked } = useSuspenseQuery(blockedUsersQuery());
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  useSettingsRealtime(profile?.id);

  return (
    <DiscoverShell active="profile">
      <TopBar title="Blocked users" onBack={() => navigate({ to: "/settings" })} />

      {blocked.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyStateFromPreset preset="blockedUser" onPrimary={() => navigate({ to: "/settings" })} />
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <Text variant="caption" tone="muted" style={{ paddingLeft: spacing[1] }}>
            Blocked people can't see your profile, message you or appear in your Discovery.
          </Text>
          {blocked.map((u) => {
            const name = u.fullName ?? "Coligo member";
            return (
              <Card key={u.userId}>
                <CardBody>
                  <div className="flex items-center" style={{ gap: spacing[3] }}>
                    <Avatar
                      src={u.avatarUrl ?? undefined}
                      initials={name.slice(0, 1).toUpperCase()}
                      size="md"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="title" truncate>
                        {name}
                      </Text>
                      <Text variant="bodySm" tone="muted" truncate>
                        {u.collegeName ?? "—"} · Blocked {formatDate(u.blockedAt)}
                      </Text>
                    </div>
                  </div>
                  <div className="flex" style={{ gap: spacing[2], marginTop: spacing[3] }}>
                    <Button
                      variant="glass"
                      size="sm"
                      fullWidth
                      onClick={() =>
                        navigate({
                          to: "/discover/profile/$userId",
                          params: { userId: u.userId },
                        })
                      }
                    >
                      View profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      style={{ color: colors.danger }}
                      onClick={() =>
                        navigate({
                          to: "/settings/blocked-users/$userId/unblock",
                          params: { userId: u.userId },
                        })
                      }
                    >
                      Unblock
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function BlockedSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Blocked users" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} style={{ height: 120, borderRadius: 18, marginTop: spacing[3] }} />
      ))}
    </DiscoverShell>
  );
}

function BlockedError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Blocked users" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
