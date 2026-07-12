// ============================================================================
// /profile/preferences — matching & visibility controls. "Looking for" writes
// to the profile; discovery visibility and notification channels write to the
// settings row. Discovery eligibility (discover_candidates) already respects
// discovery_enabled + looking_for, so changes take effect immediately.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { preferencesQuery, updatePreferences } from "@/lib/profile-full.functions";
import { spacing } from "@/lib/ds";
import { Skeleton } from "@/components/ds/glass";
import { SettingsGroup, RadioGroup, SettingsItem, Switch } from "@/components/ds/settings";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/profile/preferences")({
  head: () => ({ meta: [{ title: "Preferences — Coligo" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(preferencesQuery()),
  pendingComponent: PrefsSkeleton,
  errorComponent: PrefsError,
  component: PreferencesPage,
});

function PreferencesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: prefs } = useSuspenseQuery(preferencesQuery());
  const save = useServerFn(updatePreferences);

  const mutation = useMutation({
    mutationFn: (patch: Parameters<typeof updatePreferences>[0]["data"]) => save({ data: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: preferencesQuery().queryKey });
      const prev = qc.getQueryData(preferencesQuery().queryKey);
      qc.setQueryData(preferencesQuery().queryKey, (old) =>
        old
          ? {
              ...old,
              ...(patch.looking_for !== undefined ? { lookingFor: patch.looking_for } : {}),
              ...(patch.discovery_enabled !== undefined ? { discoveryEnabled: patch.discovery_enabled } : {}),
              ...(patch.push_enabled !== undefined ? { pushEnabled: patch.push_enabled } : {}),
              ...(patch.email_enabled !== undefined ? { emailEnabled: patch.email_enabled } : {}),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(preferencesQuery().queryKey, ctx.prev);
      toast.error("Couldn't save. Please try again.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: preferencesQuery().queryKey });
    },
  });

  return (
    <DiscoverShell active="profile">
      <TopBar title="Preferences" onBack={() => navigate({ to: "/profile" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <SettingsGroup label="Show me" footnote="Controls who appears in your Discovery deck.">
          <RadioGroup
            value={(prefs.lookingFor ?? "everyone") as "women" | "men" | "everyone"}
            onChange={(v) => mutation.mutate({ looking_for: v })}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "women", label: "Women" },
              { value: "men", label: "Men" },
            ]}
          />
        </SettingsGroup>

        <SettingsGroup label="Discovery" footnote="When off, your profile is hidden and you won't appear to others.">
          <SettingsItem
            title="Discovery visibility"
            subtitle="Appear in other students' decks"
            trailing={
              <Switch
                checked={prefs.discoveryEnabled}
                onChange={(v) => mutation.mutate({ discovery_enabled: v })}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup label="Notifications">
          <SettingsItem
            title="Push notifications"
            subtitle="Matches and messages"
            trailing={
              <Switch checked={prefs.pushEnabled} onChange={(v) => mutation.mutate({ push_enabled: v })} />
            }
          />
          <SettingsItem
            title="Email notifications"
            subtitle="Occasional updates"
            trailing={
              <Switch checked={prefs.emailEnabled} onChange={(v) => mutation.mutate({ email_enabled: v })} />
            }
          />
        </SettingsGroup>
      </div>
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function PrefsSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Preferences" />
      <div className="flex flex-col" style={{ gap: spacing[4], marginTop: spacing[4] }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 120, borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function PrefsError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Preferences" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset preset="error" onPrimary={() => navigate({ to: "/profile" })} />
      </div>
    </DiscoverShell>
  );
}
