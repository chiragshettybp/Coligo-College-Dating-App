// ============================================================================
// /empty/no-profiles — fallback shown when Discovery has no eligible candidates.
// Confirms against the live candidate query before rendering; redirects to
// /discover if any exist. Refresh regenerates the queue, and realtime resolves
// the state when a newly-onboarded student becomes eligible. Design-system only.
// ============================================================================
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { discoveryFeedQuery, type DiscoverCandidate } from "@/lib/discover.functions";
import { useEmptyGuard } from "@/lib/use-empty-guard";
import { spacing } from "@/lib/ds";
import { Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/empty/no-profiles")({
  component: NoProfilesPage,
});

function NoProfilesPage() {
  const navigate = useNavigate();
  const { checking, refresh } = useEmptyGuard<DiscoverCandidate[]>({
    query: discoveryFeedQuery(),
    hasData: (c) => c.length > 0,
    onData: () => navigate({ to: "/discover", replace: true }),
    // discover_candidates draws on profiles + settings; INSERTs on either may
    // add an eligible student. New members flip onboarding_completed via UPDATE,
    // handled below.
    tables: ["profiles", "settings"],
    channel: "empty:no-profiles",
    emptyMessage: "No new profiles just yet — check back soon.",
  });

  // A newly-onboarded student (onboarding_completed UPDATE) can become eligible.
  useEffect(() => {
    const channel = supabase
      .channel("empty:no-profiles:onboarded")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const before = payload.old as { onboarding_completed?: boolean };
          const after = payload.new as { onboarding_completed?: boolean };
          if (!before?.onboarding_completed && after?.onboarding_completed) {
            toast("New students just joined", {
              action: { label: "Refresh", onClick: () => void refresh() },
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DiscoverShell active="discover">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="matches"
          tone="pink"
          title="No profiles right now"
          description="There's no one new to show yet. This can happen if there aren't many students nearby, you've already swiped everyone, or your preferences are a little too narrow."
          primaryAction={
            <Button variant="primary" fullWidth loading={checking} onClick={refresh}>
              Refresh profiles
            </Button>
          }
          secondaryAction={
            <>
              <Button variant="ghost" fullWidth onClick={() => navigate({ to: "/profile/preferences" })}>
                Update preferences
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate({ to: "/home" })}>
                Go home
              </Button>
            </>
          }
        />
      </div>
    </DiscoverShell>
  );
}
