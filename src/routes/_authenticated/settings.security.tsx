// ============================================================================
// /settings/security — session & password controls. Shows the current device
// session and last login, links to the password reset flow, and lists concise
// security tips. Future: active-session management + trusted devices.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";

import { securityInfoQuery } from "@/lib/settings.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { colors, spacing } from "@/lib/ds";
import { Text, Button, Skeleton, Badge } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({
    meta: [{ title: "Security — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(securityInfoQuery()),
  pendingComponent: SecuritySkeleton,
  errorComponent: SecurityError,
  component: SecurityPage,
});

const TIPS = [
  "Never share your login code or password with anyone.",
  "Coligo will never ask for your password over chat.",
  "Report suspicious profiles from their profile page.",
  "Log out on devices you no longer use.",
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SecurityPage() {
  const navigate = useNavigate();
  const { data: security } = useSuspenseQuery(securityInfoQuery());
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  useSettingsRealtime(profile?.id);

  const verified = security.verificationStatus === "verified";

  return (
    <DiscoverShell active="profile">
      <TopBar title="Security" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <SettingsGroup label="This device">
          <SettingsItem
            title="Current session"
            value={security.currentSession?.platform ?? "web"}
          />
          <SettingsItem
            title="Last seen"
            value={formatDateTime(security.currentSession?.lastSeenAt ?? null)}
          />
          <SettingsItem title="Last login" value={formatDateTime(security.lastLoginAt)} />
          <SettingsItem
            title="Verification"
            trailing={
              <Badge tone={verified ? "success" : "neutral"}>
                {verified ? "Verified" : security.verificationStatus}
              </Badge>
            }
          />
        </SettingsGroup>

        <Button
          variant="glass"
          fullWidth
          onClick={() => navigate({ to: "/auth/forgot-password" })}
          leftIcon={<KeyRound style={{ width: 18, height: 18 }} />}
        >
          Reset password
        </Button>

        <SettingsGroup label="Security tips">
          {TIPS.map((tip) => (
            <SettingsItem
              key={tip}
              icon={<ShieldCheck size={18} />}
              iconTint={colors.success}
              title={tip}
              chevron={false}
            />
          ))}
        </SettingsGroup>

        <Text variant="caption" tone="muted" align="center">
          More controls — active sessions, trusted devices and two-factor
          authentication — are coming soon.
        </Text>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function SecuritySkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Security" />
      <Skeleton style={{ height: 200, borderRadius: 18, marginTop: spacing[4] }} />
      <Skeleton style={{ height: 180, borderRadius: 18, marginTop: spacing[5] }} />
    </DiscoverShell>
  );
}

function SecurityError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Security" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
