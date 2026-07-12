// ============================================================================
// /settings/blocked-users/:userId/unblock — dedicated unblock confirmation
// page (no popup). Removes the block relationship, restoring the other user's
// Discovery eligibility, and invalidates the affected caches.
// ============================================================================
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

import {
  blockedUserQuery,
  blockedUsersQuery,
  settingsOverviewQuery,
  unblockUser,
} from "@/lib/settings.functions";
import { colors, spacing } from "@/lib/ds";
import { Text, Button, Avatar, Skeleton } from "@/components/ds/glass";
import { Card, CardBody } from "@/components/ds/card";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/blocked-users/$userId/unblock")({
  head: () => ({
    meta: [{ title: "Unblock — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(blockedUserQuery(params.userId)),
  pendingComponent: () => <UnblockSkeleton />,
  errorComponent: () => <UnblockUnavailable />,
  component: UnblockPage,
});

const CONSEQUENCES = [
  "They'll be able to see your profile again.",
  "They may appear in your Discovery deck.",
  "You'll be able to match and message again.",
  "You can block them again at any time.",
];

function UnblockPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useSuspenseQuery(blockedUserQuery(userId));
  const run = useServerFn(unblockUser);
  const [busy, setBusy] = useState(false);

  if (!user) return <UnblockUnavailable />;
  const name = user.fullName ?? "this person";

  const onConfirm = async () => {
    setBusy(true);
    try {
      await run({ data: { userId } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: blockedUsersQuery().queryKey }),
        qc.invalidateQueries({ queryKey: settingsOverviewQuery().queryKey }),
        qc.invalidateQueries({ queryKey: ["discover"] }),
      ]);
      toast.success(`Unblocked ${name.split(/\s+/)[0]}`);
      navigate({ to: "/settings/blocked-users" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unblock. Please try again.");
      setBusy(false);
    }
  };

  return (
    <DiscoverShell active="profile">
      <TopBar
        title="Unblock"
        onBack={() => navigate({ to: "/settings/blocked-users" })}
      />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[6], textAlign: "center" }}>
        <Avatar
          src={user.avatarUrl ?? undefined}
          initials={name.slice(0, 1).toUpperCase()}
          size="xl"
        />
        <Text variant="headingLg" style={{ marginTop: spacing[4] }}>
          Unblock {name}?
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
          variant="primary"
          fullWidth
          loading={busy}
          onClick={onConfirm}
          leftIcon={<UserCheck style={{ width: 18, height: 18 }} />}
        >
          Unblock
        </Button>
        <Button
          variant="glass"
          fullWidth
          disabled={busy}
          onClick={() => navigate({ to: "/settings/blocked-users" })}
        >
          Cancel
        </Button>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function UnblockSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Unblock" />
      <div className="flex flex-col items-center" style={{ marginTop: spacing[6] }}>
        <Skeleton style={{ width: 96, height: 96, borderRadius: 999 }} />
        <Skeleton style={{ width: 200, height: 28, borderRadius: 8, marginTop: spacing[4] }} />
      </div>
      <Skeleton style={{ height: 160, borderRadius: 18, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

function UnblockUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Unblock" onBack={() => navigate({ to: "/settings/blocked-users" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="search"
          tone="slate"
          title="Not blocked"
          description="This person isn't in your blocked list — they may already have been unblocked."
          primaryAction={
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate({ to: "/settings/blocked-users" })}
            >
              Back to blocked users
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
