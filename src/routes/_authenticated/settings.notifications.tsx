// ============================================================================
// /settings/notifications — per-category notification channel controls. Writes
// to notification_preferences; the notification triggers respect these settings
// (in-app rows and push delivery are gated on notif_channel_enabled).
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  notificationPreferencesQuery,
  updateNotificationPreference,
  type NotificationPreference,
} from "@/lib/notifications.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { spacing } from "@/lib/ds";
import { Skeleton } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem, Switch } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationPreferencesQuery()),
  pendingComponent: NotifSkeleton,
  errorComponent: NotifError,
  component: NotificationsPage,
});

const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  matches: { title: "Match notifications", subtitle: "New matches and notes" },
  messages: { title: "Message notifications", subtitle: "New chat messages" },
  system: { title: "Announcements", subtitle: "News and updates from Coligo" },
  security: { title: "Security notifications", subtitle: "Sign-ins and account safety" },
  account: { title: "Account notices", subtitle: "Profile and account changes" },
};

function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: prefs } = useSuspenseQuery(notificationPreferencesQuery());
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  useSettingsRealtime(profile?.id);
  const save = useServerFn(updateNotificationPreference);

  const key = notificationPreferencesQuery().queryKey;

  const mutation = useMutation({
    mutationFn: (row: NotificationPreference) =>
      save({ data: { category: row.category, inApp: row.inApp, push: row.push, email: row.email } }),
    onMutate: async (row) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<NotificationPreference[]>(key);
      qc.setQueryData<NotificationPreference[]>(key, (old) =>
        (old ?? []).map((p) => (p.category === row.category ? row : p)),
      );
      return { prev };
    },
    onError: (_e, _row, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Couldn't save. Please try again.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <DiscoverShell active="profile">
      <TopBar title="Notifications" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <SettingsGroup
          label="In-app notifications"
          footnote="Turn a category off to stop those notifications everywhere."
        >
          {prefs.map((row) => {
            const meta = CATEGORY_META[row.category] ?? {
              title: row.category,
              subtitle: "",
            };
            return (
              <SettingsItem
                key={row.category}
                title={meta.title}
                subtitle={meta.subtitle}
                trailing={
                  <Switch
                    checked={row.inApp}
                    onChange={(v) => mutation.mutate({ ...row, inApp: v })}
                  />
                }
              />
            );
          })}
        </SettingsGroup>

        <SettingsGroup
          label="Push notifications"
          footnote="Push is delivered to devices where you've enabled notifications."
        >
          {prefs.map((row) => {
            const meta = CATEGORY_META[row.category] ?? { title: row.category, subtitle: "" };
            return (
              <SettingsItem
                key={row.category}
                title={meta.title}
                trailing={
                  <Switch
                    checked={row.push}
                    onChange={(v) => mutation.mutate({ ...row, push: v })}
                  />
                }
              />
            );
          })}
        </SettingsGroup>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function NotifSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Notifications" />
      {[0, 1].map((i) => (
        <Skeleton key={i} style={{ height: 220, borderRadius: 18, marginTop: spacing[5] }} />
      ))}
    </DiscoverShell>
  );
}

function NotifError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Notifications" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
