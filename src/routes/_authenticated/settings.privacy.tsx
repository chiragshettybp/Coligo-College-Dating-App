// ============================================================================
// /settings/privacy — profile & discovery visibility controls. Each toggle
// writes to the user's settings row with optimistic UI + rollback and takes
// effect across Discovery immediately (discover_candidates filters on
// profile_visible + discovery_enabled).
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  privacySettingsQuery,
  updatePrivacySetting,
  type PrivacySettings,
} from "@/lib/settings.functions";
import { useSettingsRealtime } from "@/lib/use-settings-realtime";
import { fullProfileQuery } from "@/lib/profile-full.functions";
import { spacing } from "@/lib/ds";
import { Skeleton } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem, Switch } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  head: () => ({
    meta: [{ title: "Privacy — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(privacySettingsQuery()),
  pendingComponent: PrivacySkeleton,
  errorComponent: PrivacyError,
  component: PrivacyPage,
});

type PrivacyPatch = Partial<{
  profile_visible: boolean;
  discovery_enabled: boolean;
  show_online_status: boolean;
  allow_profile_preview: boolean;
}>;

function PrivacyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: privacy } = useSuspenseQuery(privacySettingsQuery());
  const { data: profile } = useSuspenseQuery(fullProfileQuery());
  useSettingsRealtime(profile?.id);
  const save = useServerFn(updatePrivacySetting);

  const mutation = useMutation({
    mutationFn: (patch: PrivacyPatch) => save({ data: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: privacySettingsQuery().queryKey });
      const prev = qc.getQueryData<PrivacySettings>(privacySettingsQuery().queryKey);
      qc.setQueryData<PrivacySettings>(privacySettingsQuery().queryKey, (old) =>
        old
          ? {
              profileVisible: patch.profile_visible ?? old.profileVisible,
              discoveryEnabled: patch.discovery_enabled ?? old.discoveryEnabled,
              showOnlineStatus: patch.show_online_status ?? old.showOnlineStatus,
              allowProfilePreview: patch.allow_profile_preview ?? old.allowProfilePreview,
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(privacySettingsQuery().queryKey, ctx.prev);
      toast.error("Couldn't save. Please try again.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: privacySettingsQuery().queryKey });
    },
  });

  return (
    <DiscoverShell active="profile">
      <TopBar title="Privacy" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <SettingsGroup
          label="Visibility"
          footnote="When your profile is hidden, you won't appear in anyone's Discovery deck."
        >
          <SettingsItem
            title="Profile visibility"
            subtitle="Let other students find your profile"
            trailing={
              <Switch
                checked={privacy.profileVisible}
                onChange={(v) => mutation.mutate({ profile_visible: v })}
              />
            }
          />
          <SettingsItem
            title="Discovery visibility"
            subtitle="Appear in the Discovery deck"
            trailing={
              <Switch
                checked={privacy.discoveryEnabled}
                onChange={(v) => mutation.mutate({ discovery_enabled: v })}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup
          label="Activity"
          footnote="Controls what others can see about your activity."
        >
          <SettingsItem
            title="Show online status"
            subtitle="Let matches see when you're active"
            trailing={
              <Switch
                checked={privacy.showOnlineStatus}
                onChange={(v) => mutation.mutate({ show_online_status: v })}
              />
            }
          />
          <SettingsItem
            title="Allow profile preview"
            subtitle="Let others open your full profile before matching"
            trailing={
              <Switch
                checked={privacy.allowProfilePreview}
                onChange={(v) => mutation.mutate({ allow_profile_preview: v })}
              />
            }
          />
        </SettingsGroup>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function PrivacySkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Privacy" />
      {[0, 1].map((i) => (
        <Skeleton key={i} style={{ height: 130, borderRadius: 18, marginTop: spacing[5] }} />
      ))}
    </DiscoverShell>
  );
}

function PrivacyError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Privacy" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
