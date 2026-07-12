// ============================================================================
// /settings/help — support resources. Loads published FAQs from Supabase and
// links to contact + the legal/policy pages. No mock content.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCircle, FileText, Shield, Users, Bug } from "lucide-react";

import { faqsQuery } from "@/lib/public-content.functions";
import { colors, spacing } from "@/lib/ds";
import { Text, Skeleton } from "@/components/ds/glass";
import { SettingsGroup, SettingsItem, CollapsibleGroup } from "@/components/ds/settings";
import { TopBar } from "@/components/ds/navigation";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/settings/help")({
  head: () => ({
    meta: [{ title: "Help & support — Coligo" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(faqsQuery()),
  pendingComponent: HelpSkeleton,
  errorComponent: HelpError,
  component: HelpPage,
});

function HelpPage() {
  const navigate = useNavigate();
  const { data: faqs } = useSuspenseQuery(faqsQuery());

  return (
    <DiscoverShell active="profile">
      <TopBar title="Help & support" onBack={() => navigate({ to: "/settings" })} />

      <div className="flex flex-col" style={{ gap: spacing[5], marginTop: spacing[4] }}>
        <section className="flex flex-col" style={{ gap: spacing[2] }}>
          <Text
            variant="overline"
            tone="muted"
            style={{ paddingLeft: spacing[3] }}
          >
            Frequently asked
          </Text>
          {faqs.length === 0 ? (
            <EmptyState
              scene="search"
              tone="slate"
              title="No FAQs yet"
              description="We're still writing our help articles. Reach out any time and we'll help you directly."
            />
          ) : (
            faqs.map((faq) => (
              <CollapsibleGroup key={faq.id} label={faq.question}>
                <div style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
                  <Text variant="bodySm" tone="secondary">
                    {faq.answer}
                  </Text>
                </div>
              </CollapsibleGroup>
            ))
          )}
        </section>

        <SettingsGroup label="Get in touch">
          <SettingsItem
            icon={<MessageCircle size={18} />}
            title="Contact support"
            subtitle="Message the Coligo team"
            onClick={() => navigate({ to: "/contact" })}
          />
          <SettingsItem
            icon={<Bug size={18} />}
            iconTint={colors.warning}
            title="Report a bug"
            subtitle="Tell us what went wrong"
            onClick={() => navigate({ to: "/contact" })}
          />
        </SettingsGroup>

        <SettingsGroup label="Policies">
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
          <SettingsItem
            icon={<Users size={18} />}
            title="Community Guidelines"
            onClick={() => navigate({ to: "/community-guidelines" })}
          />
        </SettingsGroup>
      </div>
    </DiscoverShell>
  );
}

/* ---------------------------------------------------------------- states --- */

function HelpSkeleton() {
  return (
    <DiscoverShell active="profile">
      <TopBar title="Help & support" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} style={{ height: 130, borderRadius: 18, marginTop: spacing[5] }} />
      ))}
    </DiscoverShell>
  );
}

function HelpError() {
  const navigate = useNavigate();
  return (
    <DiscoverShell active="profile">
      <TopBar title="Help & support" onBack={() => navigate({ to: "/settings" })} />
    </DiscoverShell>
  );
}
