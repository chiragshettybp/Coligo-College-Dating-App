// ============================================================================
// /settings/account — read-only account information with actions to view /
// edit the profile and start a password reset. Stays live via realtime.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UserRound, Pencil, KeyRound } from "lucide-react";

import { accountInfoQuery } from "@/lib/settings.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { formatPhoneIN } from "@/lib/auth";
import { colors, spacing } from "@/lib/ds";
import { Text, Button, Skeleton, Badge } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/account")({
  head: () => ({
    meta: [{ title: "Account — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountInfoQuery()),
  pendingComponent: () => <AccountSkeleton />,
  errorComponent: () => <AccountUnavailable />,
  component: AccountPage,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AccountPage() {
  const navigate = useNavigate();
  const { data: account } = useSuspenseQuery(accountInfoQuery());
  useSettingsRealtime(account?.id);

  if (!account) return <AccountUnavailable />;

  const verified = account.verificationStatus === "verified";

  return (
    <DiscoverShell active="profile">
      <TopBar title="Account" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <SettingsGroup label="Account details">
          <SettingsItem
            title="Mobile number"
            value={account.phone ? formatPhoneIN(account.phone) : "—"}
          />
          <SettingsItem
            title="Verification"
            trailing={
              <Badge tone={verified ? "success" : "neutral"}>
                {verified ? "Verified" : account.verificationStatus}
              </Badge>
            }
          />
          <SettingsItem title="College" value={account.collegeName ?? "—"} />
          <SettingsItem title="Member since" value={formatDate(account.memberSince)} />
          <SettingsItem title="Last login" value={formatDate(account.lastLoginAt)} />
          <SettingsItem
            title="Account ID"
            value={`${account.id.slice(0, 8)}…`}
          />
        </SettingsGroup>

        <div className="flex flex-col" style={{ gap: spacing[2] }}>
          <Button
            variant="glass"
            fullWidth
            onClick={() => navigate({ to: "/profile/preview" })}
            leftIcon={<UserRound style={{ width: 18, height: 18 }} />}
          >
            View profile
          </Button>
          <Button
            variant="glass"
            fullWidth
            onClick={() => navigate({ to: "/profile/edit" })}
            leftIcon={<Pencil style={{ width: 18, height: 18 }} />}
          >
            Edit profile
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => navigate({ to: "/auth/forgot-password" })}
            leftIcon={<KeyRound style={{ width: 18, height: 18, color: colors.textMuted }} />}
          >
            Change password
          </Button>
        </div>
      </div>
    </DiscoverShell>
  );
}

function AccountSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Account" />
      <Skeleton style={{ height: 320, borderRadius: 18, marginTop: spacing[4] }} />
    </DiscoverShell>
  );
}

function AccountUnavailable() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Account" onBack={() => navigate({ to: "/settings" })} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="error"
          tone="amber"
          title="Couldn't load account"
          description="Something went wrong loading your account details. Please try again."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/settings" })}>
              Back to settings
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
