// ============================================================================
// /settings/about — application + company information, loaded dynamically from
// Supabase (app_versions / application_settings via getAppConfig, and
// company_information via getCompanyInfo). No hardcoded marketing copy.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Shield, FileText } from "lucide-react";

import { appConfigQuery } from "@/lib/system.functions";
import { companyInfoQuery } from "@/lib/public-content.functions";
import { spacing } from "@/lib/ds";
import { Text, Skeleton } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/about")({
  head: () => ({
    meta: [{ title: "About — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(appConfigQuery()),
      context.queryClient.ensureQueryData(companyInfoQuery()),
    ]);
  },
  pendingComponent: AboutSkeleton,
  errorComponent: AboutError,
  component: AboutPage,
});

function AboutPage() {
  const navigate = useNavigate();
  const { data: config } = useSuspenseQuery(appConfigQuery());
  const { data: company } = useSuspenseQuery(companyInfoQuery());

  const version = config.latestVersion?.version ?? "1.0.0";
  const overview = company.find((c) => c.sectionType === "overview") ?? company[0];

  return (
    <DiscoverShell active="profile">
      <TopBar title="About" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col items-center" style={{ marginTop: spacing[5], textAlign: "center" }}>
        <Text variant="displaySm">Coligo</Text>
        <Text variant="bodySm" tone="muted" style={{ marginTop: 4 }}>
          Dating, exclusively for college students
        </Text>
      </div>

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[5] }}>
        <SettingsGroup label="Application">
          <SettingsItem title="App name" value="Coligo" />
          <SettingsItem title="Version" value={version} />
          {config.latestVersion?.minSupported ? (
            <SettingsItem title="Minimum supported" value={config.latestVersion.minSupported} />
          ) : null}
          <SettingsItem title="Support" value={config.supportEmail} />
        </SettingsGroup>

        {overview ? (
          <SettingsGroup label={overview.title || "About"}>
            <div style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
              <Text variant="bodySm" tone="secondary">
                {overview.body}
              </Text>
            </div>
          </SettingsGroup>
        ) : null}

        {company
          .filter((c) => c !== overview && c.body)
          .map((c) => (
            <SettingsGroup key={c.key} label={c.title}>
              <div style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
                <Text variant="bodySm" tone="secondary">
                  {c.body}
                </Text>
              </div>
            </SettingsGroup>
          ))}

        <SettingsGroup label="Legal">
          <SettingsItem
            icon={<Shield size={18} />}
            title="Privacy Policy"
            onClick={() => navigate({ to: "/privacy" })}
          />
          <SettingsItem
            icon={<FileText size={18} />}
            title="Terms of Service"
            onClick={() => navigate({ to: "/terms" })}
          />
        </SettingsGroup>

        <Text variant="caption" tone="muted" align="center">
          © {new Date().getFullYear()} Coligo. All rights reserved.
        </Text>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function AboutSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="About" />
      <Skeleton style={{ height: 60, borderRadius: 12, marginTop: spacing[5] }} />
      {[0, 1].map((i) => (
        <Skeleton key={i} style={{ height: 160, borderRadius: 18, marginTop: spacing[5] }} />
      ))}
    </DiscoverShell>
  );
}

function AboutError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="About" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
