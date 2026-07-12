// ============================================================================
// /discover — the swipe feed. One eligible profile at a time from live Supabase
// data (discover_candidates RPC). Gestures + buttons + keyboard all drive the
// same transaction-safe swipe RPC; a reciprocal like creates a match and routes
// to the celebration. Realtime drops blockers instantly and surfaces incoming
// matches. Composed entirely from the /ui design system.
// ============================================================================
import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  discoveryFeedQuery,
  submitSwipe,
  undoSwipe,
  type DiscoverCard,
} from "@/lib/discover.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { colors, spacing } from "@/lib/ds";
import { Text, Skeleton } from "@/components/ds/glass";
import { TopBar, NavIconButton } from "@/components/ds/navigation";
import { EmptyStateFromPreset } from "@/components/ds/empty-state";
import {
  SwipeDeck,
  SwipeControls,
  type SwipeDeckHandle,
  type SwipeDecision,
} from "@/components/ds/swipe";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/discover/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(discoveryFeedQuery()),
  pendingComponent: DiscoverSkeleton,
  errorComponent: DiscoverError,
  component: DiscoverFeedPage,
});

function DiscoverFeedPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: feed } = useSuspenseQuery(discoveryFeedQuery());
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const onlineIds = useOnlineUserIds(profile?.id ?? null);

  const feedKey = discoveryFeedQuery().queryKey;
  const deckRef = useRef<SwipeDeckHandle>(null);
  const lastSwipe = useRef<{ card: DiscoverCard; matched: boolean } | null>(null);
  const handledMatches = useRef<Set<string>>(new Set());

  const swipeFn = useServerFn(submitSwipe);
  const undoFn = useServerFn(undoSwipe);

  const setFeed = (updater: (old: DiscoverCard[]) => DiscoverCard[]) =>
    qc.setQueryData<DiscoverCard[]>(feedKey, (old) => updater(old ?? []));

  // When the queue empties, move to the dedicated empty route.
  useEffect(() => {
    if (feed.length === 0) {
      navigate({ to: "/discover/no-more-profiles", replace: true });
    }
  }, [feed.length, navigate]);

  // Realtime: incoming matches + blocks that should drop cards instantly.
  useEffect(() => {
    if (!profile?.id) return;
    const me = profile.id;
    const channel = supabase
      .channel("discover:realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          const m = payload.new as { id: string; user_a: string; user_b: string };
          if (m.user_a !== me && m.user_b !== me) return;
          if (handledMatches.current.has(m.id)) return;
          handledMatches.current.add(m.id);
          qc.invalidateQueries({ queryKey: ["home", "dashboard"] });
          toast.success("It's a match! 🎉", {
            action: {
              label: "View",
              onClick: () =>
                navigate({ to: "/discover/match/$matchId", params: { matchId: m.id } }),
            },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blocks" },
        (payload) => {
          const b = payload.new as { blocker_id: string; blocked_id: string };
          if (b.blocked_id === me) {
            setFeed((old) => old.filter((c) => c.id !== b.blocker_id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handleDecision = async (card: DiscoverCard, action: SwipeDecision) => {
    setFeed((old) => old.filter((c) => c.id !== card.id));
    lastSwipe.current = { card, matched: false };
    try {
      const res = await swipeFn({ data: { targetId: card.id, action } });
      if (res.matched && res.matchId) {
        lastSwipe.current = { card, matched: true };
        handledMatches.current.add(res.matchId);
        navigate({ to: "/discover/match/$matchId", params: { matchId: res.matchId } });
      }
      qc.invalidateQueries({ queryKey: ["home", "dashboard"] });
    } catch {
      // Never lose swipe state — roll the card back to the front.
      setFeed((old) => [card, ...old]);
      lastSwipe.current = null;
      toast.error("Couldn't save that swipe. Please try again.");
    }
  };

  const handleUndo = async () => {
    const ls = lastSwipe.current;
    if (!ls || ls.matched) return;
    setFeed((old) => [ls.card, ...old.filter((c) => c.id !== ls.card.id)]);
    lastSwipe.current = null;
    try {
      await undoFn({ data: { targetId: ls.card.id } });
    } catch {
      toast.error("Couldn't undo.");
    }
  };

  const canUndo = !!lastSwipe.current && !lastSwipe.current.matched;

  return (
    <DiscoverShell active="discover" matchesBadge={0}>
      <TopBar
        title="Discover"
        trailing={
          <NavIconButton label="Notifications" onClick={() => toast("No new notifications")}>
            <Bell style={{ width: 20, height: 20 }} />
          </NavIconButton>
        }
      />

      {feed.length > 0 && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: spacing[5],
            paddingTop: spacing[4],
          }}
        >
          <SwipeDeck
            ref={deckRef}
            cards={feed}
            onlineIds={onlineIds}
            onDecision={handleDecision}
            onOpenProfile={(c) =>
              navigate({ to: "/discover/profile/$userId", params: { userId: c.id } })
            }
          />

          <SwipeControls
            canUndo={canUndo}
            onUndo={handleUndo}
            onPass={() => deckRef.current?.swipe("pass")}
            onSuper={() => deckRef.current?.swipe("super")}
            onLike={() => deckRef.current?.swipe("like")}
          />

          <Text
            variant="footnote"
            tone="muted"
            style={{ textAlign: "center", color: colors.textMuted }}
          >
            Swipe or use the buttons · ← pass · → like · ↑ super
          </Text>
        </div>
      )}
    </DiscoverShell>
  );
}

/* --------------------------------------------------------------- states --- */

function DiscoverSkeleton() {
  return (
    <DiscoverShell active="discover">
      <TopBar title="Discover" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: spacing[5], paddingTop: spacing[4] }}>
        <Skeleton style={{ height: 440, borderRadius: 24 }} />
        <div className="flex items-center justify-center" style={{ gap: spacing[4] }}>
          {[58, 52, 68].map((s, i) => (
            <Skeleton key={i} style={{ width: s, height: s, borderRadius: 999 }} />
          ))}
        </div>
      </div>
    </DiscoverShell>
  );
}

function DiscoverError() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <DiscoverShell active="discover">
      <TopBar title="Discover" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset
          preset="error"
          onPrimary={() => qc.invalidateQueries({ queryKey: discoveryFeedQuery().queryKey })}
          onSecondary={() => navigate({ to: "/home" })}
        />
      </div>
    </DiscoverShell>
  );
}
