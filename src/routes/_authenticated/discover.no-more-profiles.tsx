// ============================================================================
// /discover/no-more-profiles — shown when the candidate queue is empty. Retry
// re-runs the live candidate query; if new eligible students exist it returns
// to the feed. Realtime watches for newly-joined profiles and offers an instant
// refresh. Composed from the /ui empty-state system.
// ============================================================================
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { discoveryFeedQuery } from "@/lib/discover.functions";
import { spacing } from "@/lib/ds";
import { Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/discover/no-more-profiles")({
  component: NoMoreProfilesPage,
});

function NoMoreProfilesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    try {
      await qc.invalidateQueries({ queryKey: discoveryFeedQuery().queryKey });
      const fresh = await qc.fetchQuery(discoveryFeedQuery());
      if (fresh.length > 0) {
        navigate({ to: "/discover", replace: true });
      } else {
        toast("No new profiles just yet — check back soon.");
      }
    } catch {
      toast.error("Couldn't refresh right now.");
    } finally {
      setChecking(false);
    }
  };

  // Realtime: a newly onboarded profile may now be eligible. Only react to a
  // profile that flips onboarding_completed → true (a genuine new member),
  // not every profile update (logins, edits) which would spam the toast.
  useEffect(() => {
    const channel = supabase
      .channel("discover:no-more")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const before = payload.old as { onboarding_completed?: boolean };
          const after = payload.new as { onboarding_completed?: boolean };
          if (!before?.onboarding_completed && after?.onboarding_completed) {
            toast("New students just joined", {
              action: { label: "Refresh", onClick: retry },
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
          title="You're all caught up"
          description="You've seen everyone who matches your preferences for now. New verified students join every day — check back soon or widen your preferences."
          primaryAction={
            <Button variant="primary" fullWidth loading={checking} onClick={retry}>
              Check again
            </Button>
          }
          secondaryAction={
            <Button variant="ghost" fullWidth onClick={() => navigate({ to: "/home" })}>
              Return home
            </Button>
          }
        />
      </div>
    </DiscoverShell>
  );
}
