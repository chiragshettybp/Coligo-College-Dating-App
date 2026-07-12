// ============================================================================
// /empty/no-matches — intelligent fallback shown when the signed-in user has
// no active matches. Confirms against the live matches query before rendering;
// if matches exist it redirects to /matches immediately. Realtime resolves the
// state automatically when a new match/message arrives. Design-system only.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { matchesQuery, type MatchListItem } from "@/lib/matches.functions";
import { useEmptyGuard } from "@/lib/use-empty-guard";
import { spacing } from "@/lib/ds";
import { Button } from "@/components/ds/glass";
import { EmptyState } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/empty/no-matches")({
  component: NoMatchesPage,
});

function NoMatchesPage() {
  const navigate = useNavigate();
  const { checking, refresh } = useEmptyGuard<MatchListItem[]>({
    query: matchesQuery(),
    hasData: (m) => m.length > 0,
    onData: () => navigate({ to: "/matches", replace: true }),
    tables: ["matches"],
    channel: "empty:no-matches",
    emptyMessage: "No matches yet — keep swiping!",
  });

  return (
    <DiscoverShell active="matches">
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyState
          scene="matches"
          tone="pink"
          title="No matches yet"
          description="When you and someone both like each other, they'll show up here. Start swiping to find your first match."
          primaryAction={
            <Button variant="primary" fullWidth onClick={() => navigate({ to: "/discover" })}>
              Start swiping
            </Button>
          }
          secondaryAction={
            <>
              <Button variant="ghost" fullWidth loading={checking} onClick={refresh}>
                Refresh
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
