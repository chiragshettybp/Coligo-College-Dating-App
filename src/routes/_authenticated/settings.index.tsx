// ============================================================================
// /settings — the Coligo control center. Grouped list of every settings area,
// each row navigating to a dedicated page (never a popup). Live counts + state
// come from the backend and stay in sync via useSettingsRealtime.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  UserRound,
  ShieldCheck,
  Bell,
  Lock,
  Ban,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

import { settingsOverviewQuery } from "@/lib/settings.functions";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { colors, spacing } from "@/lib/ds";
import { Text, Avatar, Skeleton } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem, DangerZone } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/")({
  head: () => ({
    meta: [{ title: "Settings — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsOverviewQuery()),
      context.queryClient.ensureQueryData(fullProfileQuery()),
    ]);
  },
  pendingComponent: SettingsSkeleton,
  errorComponent: SettingsError,
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { data: overview } = useSuspenseQuery(settingsOverviewQuery());
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  useSettingsRealtime(profile?.id);

  const name = profile?.fullName ?? profile?.displayName ?? "Your account";

  return (
    <DiscoverShell active="profile">
      <TopBar title="Settings" onBack={() => navigate({ to: "/profile" })} />

      {/* Identity header */}
      <div
        className="flex items-center"
        style={{ gap: spacing[3], marginTop: spacing[4], padding: `0 ${spacing[1]}px` }}
      >
        <Avatar
          src={profile?.avatarUrl ?? undefined}
          initials={name.slice(0, 1).toUpperCase()}
          size="lg"
          verified={profile?.verificationStatus === "verified"}
        />
        <div style={{ minWidth: 0 }}>
          <Text variant="headingSm" truncate>
            {name}
          </Text>
          <Text variant="bodySm" tone="muted" truncate>
            {profile?.collegeName ?? "Coligo member"}
          </Text>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[5] }}>
        <SettingsGroup label="Account">
          <SettingsItem
            icon={<UserRound size={18} />}
            title="Account"
            subtitle="Number, verification, membership"
            onClick={() => navigate({ to: "/settings/account" })}
          />
          <SettingsItem
            icon={overview.profileVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            iconTint={colors.success}
            title="Privacy"
            subtitle={overview.profileVisible ? "Profile visible" : "Profile hidden"}
            onClick={() => navigate({ to: "/settings/privacy" })}
          />
          <SettingsItem
            icon={<Bell size={18} />}
            iconTint={colors.warning}
            title="Notifications"
            subtitle="Choose what you're notified about"
            onClick={() => navigate({ to: "/settings/notifications" })}
          />
          <SettingsItem
            icon={<Lock size={18} />}
            title="Security"
            subtitle="Password and sessions"
            onClick={() => navigate({ to: "/settings/security" })}
          />
        </SettingsGroup>

        <SettingsGroup label="Safety">
          <SettingsItem
            icon={<Ban size={18} />}
            iconTint={colors.danger}
            title="Blocked users"
            value={overview.blockedCount > 0 ? String(overview.blockedCount) : undefined}
            onClick={() => navigate({ to: "/settings/blocked-users" })}
          />
        </SettingsGroup>

        <SettingsGroup label="Support">
          <SettingsItem
            icon={<HelpCircle size={18} />}
            title="Help & support"
            subtitle="FAQ, contact, policies"
            onClick={() => navigate({ to: "/settings/help" })}
          />
          <SettingsItem
            icon={<Info size={18} />}
            title="About Coligo"
            subtitle="Version and company"
            onClick={() => navigate({ to: "/settings/about" })}
          />
        </SettingsGroup>

        <DangerZone label="Account actions">
          <SettingsItem
            icon={<LogOut size={18} />}
            danger
            title="Log out"
            onClick={() => navigate({ to: "/settings/logout" })}
          />
          <SettingsItem
            icon={<Trash2 size={18} />}
            danger
            title="Delete account"
            subtitle="Permanently remove your account"
            onClick={() => navigate({ to: "/settings/delete-account" })}
          />
        </DangerZone>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function SettingsSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Settings" />
      <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
        <Skeleton style={{ width: 56, height: 56, borderRadius: 999 }} />
        <div className="flex flex-col" style={{ gap: 6 }}>
          <Skeleton style={{ width: 160, height: 18, borderRadius: 6 }} />
          <Skeleton style={{ width: 120, height: 14, borderRadius: 6 }} />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} style={{ height: 120, borderRadius: 18, marginTop: spacing[5] }} />
      ))}
    </DiscoverShell>
  );
}

function SettingsError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Settings" onBack={() => navigate({ to: "/profile" })} />
      <div style={{ marginTop: spacing[6], textAlign: "center" }}>
        <Text variant="bodyMd" tone="secondary">
          We couldn't load your settings. Please try again.
        </Text>
      </div>
    </DiscoverShell>
  );
}
