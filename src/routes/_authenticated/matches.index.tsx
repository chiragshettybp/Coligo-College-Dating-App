// ============================================================================
// /matches — the relationship dashboard. Lists every active mutual match with
// live data (my_matches RPC): primary photo, name/age, college, department,
// match time, latest message preview, unread badge and realtime online status.
// Instant local search, persisted sort + filters, and realtime subscriptions
// keep the list synced with Discovery, Chat and Blocks. Design-system only.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, SlidersHorizontal, MessageCircle, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  matchesQuery,
  matchPrefsQuery,
  updateMatchPrefs,
  type MatchListItem,
  type MatchSort,
  type MatchFilter,
} from "@/lib/matches.functions";
import { myProfileQuery } from "@/lib/profile.functions";
import { useOnlineUserIds } from "@/lib/use-presence-set";
import { colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Avatar, Chip, Skeleton, Button } from "@/components/ds/glass";
import { TopBar, SearchBar, ActionSheet } from "@/components/ds/navigation";
import { EmptyState, EmptyStateFromPreset } from "@/components/ds/empty-state";
import { DiscoverShell } from "@/components/discover/shell";

export const Route = createFileRoute("/_authenticated/matches/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(matchesQuery()),
  pendingComponent: MatchesSkeleton,
  errorComponent: MatchesError,
  component: MatchesPage,
});

const SORT_LABELS: Record<MatchSort, string> = {
  recent_activity: "Recent activity",
  recent_match: "Recently matched",
  newest_messages: "Newest messages",
  unread_first: "Unread first",
  online_first: "Online first",
  alphabetical: "Alphabetical",
};

const FILTER_LABELS: Record<MatchFilter, string> = {
  unread: "Unread",
  online: "Online",
  recently_matched: "New (24h)",
  same_college: "Same college",
  same_department: "Same department",
};

const RECENT_MS = 24 * 60 * 60 * 1000;

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function MatchesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: matches } = useSuspenseQuery(matchesQuery());
  const { data: profile } = useSuspenseQuery(myProfileQuery());
  const { data: prefs } = useSuspenseQuery(matchPrefsQuery());
  const onlineIds = useOnlineUserIds(profile?.id ?? null);
  const savePrefs = useServerFn(updateMatchPrefs);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<MatchSort>(prefs.sort);
  const [filters, setFilters] = useState<MatchFilter[]>(prefs.filters);
  const [sortOpen, setSortOpen] = useState(false);

  // Realtime: new matches, incoming messages, blocks and profile updates all
  // refresh the list so the dashboard stays live across every module.
  useEffect(() => {
    if (!profile?.id) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: matchesQuery().queryKey });
    const channel = supabase
      .channel("matches:realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, invalidate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blocks" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);

  const persist = (nextSort: MatchSort, nextFilters: MatchFilter[]) => {
    void savePrefs({ data: { sort: nextSort, filters: nextFilters } }).then(() =>
      qc.invalidateQueries({ queryKey: matchPrefsQuery().queryKey }),
    );
  };

  const toggleFilter = (f: MatchFilter) => {
    const next = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f];
    setFilters(next);
    persist(sort, next);
  };

  const chooseSort = (s: MatchSort) => {
    setSort(s);
    setSortOpen(false);
    persist(s, filters);
  };

  const totalUnread = useMemo(
    () => matches.reduce((n, m) => n + m.unreadCount, 0),
    [matches],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = matches.filter((m) => {
      if (!q) return true;
      const hay = [m.other.fullName, m.other.collegeName, m.other.departmentName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    for (const f of filters) {
      list = list.filter((m) => {
        switch (f) {
          case "unread":
            return m.unreadCount > 0;
          case "online":
            return onlineIds.has(m.other.id);
          case "recently_matched":
            return Date.now() - new Date(m.createdAt).getTime() < RECENT_MS;
          case "same_college":
            return m.other.sameCollege;
          case "same_department":
            return !!m.other.departmentName && m.other.sameCollege;
          default:
            return true;
        }
      });
    }

    const activityTs = (m: MatchListItem) =>
      new Date(m.lastMessageAt ?? m.createdAt).getTime();

    const sorted = [...list];
    switch (sort) {
      case "recent_match":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "newest_messages":
        sorted.sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt ?? 0).getTime() -
            new Date(a.lastMessage?.createdAt ?? 0).getTime(),
        );
        break;
      case "unread_first":
        sorted.sort((a, b) => b.unreadCount - a.unreadCount || activityTs(b) - activityTs(a));
        break;
      case "online_first":
        sorted.sort(
          (a, b) =>
            Number(onlineIds.has(b.other.id)) - Number(onlineIds.has(a.other.id)) ||
            activityTs(b) - activityTs(a),
        );
        break;
      case "alphabetical":
        sorted.sort((a, b) => (a.other.fullName ?? "").localeCompare(b.other.fullName ?? ""));
        break;
      default:
        sorted.sort((a, b) => activityTs(b) - activityTs(a));
    }
    return sorted;
  }, [matches, search, filters, sort, onlineIds]);

  return (
    <DiscoverShell active="matches" matchesBadge={totalUnread}>
      <TopBar title="Matches" />

      {matches.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
          <EmptyStateFromPreset
            preset="noMatches"
            onPrimary={() => navigate({ to: "/discover" })}
            onSecondary={() => navigate({ to: "/home" })}
          />
        </div>
      ) : (
        <>
          <div style={{ marginTop: spacing[3] }}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search name, college, department"
              icon={<Search style={{ width: 18, height: 18 }} />}
            />
          </div>

          <div
            className="flex items-center"
            style={{ gap: spacing[2], marginTop: spacing[3], overflowX: "auto", scrollbarWidth: "none" }}
          >
            <button
              onClick={() => setSortOpen(true)}
              className="ds-press inline-flex items-center shrink-0"
              aria-label="Change sort order"
              style={{
                gap: 6,
                padding: "8px 14px",
                borderRadius: radii.pill,
                fontSize: 14,
                fontWeight: 600,
                color: colors.textSecondary,
                background: surfaces.glassSoft,
                border: `1px solid ${surfaces.border}`,
              }}
            >
              <SlidersHorizontal style={{ width: 15, height: 15 }} />
              {SORT_LABELS[sort]}
            </button>
            {(Object.keys(FILTER_LABELS) as MatchFilter[]).map((f) => (
              <span key={f} className="shrink-0">
                <Chip selected={filters.includes(f)} onClick={() => toggleFilter(f)}>
                  {FILTER_LABELS[f]}
                </Chip>
              </span>
            ))}
          </div>

          {visible.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[5] }}>
              <EmptyState
                scene="search"
                tone="slate"
                title="No matches found"
                description="Try a different search or clear your filters to see everyone."
                primaryAction={
                  filters.length > 0 ? (
                    <Button
                      variant="glass"
                      fullWidth
                      onClick={() => {
                        setFilters([]);
                        persist(sort, []);
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[4] }}>
              {visible.map((m) => (
                <MatchRow
                  key={m.matchId}
                  match={m}
                  online={onlineIds.has(m.other.id)}
                  onOpen={() =>
                    navigate({ to: "/matches/$matchId", params: { matchId: m.matchId } })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <ActionSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        actions={(Object.keys(SORT_LABELS) as MatchSort[]).map((s) => ({
          label: SORT_LABELS[s],
          onSelect: () => chooseSort(s),
        }))}
      />
    </DiscoverShell>
  );
}

function MatchRow({
  match,
  online,
  onOpen,
}: {
  match: MatchListItem;
  online: boolean;
  onOpen: () => void;
}) {
  const { other } = match;
  const name = other.fullName ?? "Someone";
  const preview = match.lastMessage
    ? match.lastMessage.body
    : "You matched — say hello 👋";
  const meta = [other.collegeName, other.departmentName].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onOpen}
      className="ds-press flex items-center w-full text-left"
      aria-label={`Open match with ${name}`}
      style={{
        gap: spacing[3],
        padding: spacing[3],
        borderRadius: radii.lg,
        background: surfaces.glass,
        border: `1px solid ${surfaces.borderSoft}`,
      }}
    >
      <Avatar
        src={other.photo ?? undefined}
        initials={name.slice(0, 1).toUpperCase()}
        size="lg"
        status={online ? "online" : undefined}
        verified
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: spacing[1], justifyContent: "space-between" }}>
          <Text variant="headingSm" color={colors.textPrimary} truncate>
            {name}
            {other.age ? `, ${other.age}` : ""}
          </Text>
          <Text variant="caption" tone="muted" style={{ flexShrink: 0 }}>
            {relTime(match.lastMessageAt ?? match.createdAt)}
          </Text>
        </div>
        {meta && (
          <Text variant="caption" tone="muted" truncate style={{ marginTop: 1 }}>
            {meta}
          </Text>
        )}
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: 4 }}>
          <Text
            variant="bodySm"
            tone={match.unreadCount > 0 ? "primary" : "secondary"}
            truncate
            style={{ flex: 1, fontWeight: match.unreadCount > 0 ? 600 : 400 }}
          >
            {preview}
          </Text>
          {match.unreadCount > 0 ? (
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: radii.pill,
                background: colors.primary,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {match.unreadCount}
            </span>
          ) : (
            <MessageCircle style={{ width: 16, height: 16, color: colors.textMuted, flexShrink: 0 }} />
          )}
        </div>
      </div>
      <ChevronRight style={{ width: 18, height: 18, color: colors.textMuted, flexShrink: 0 }} />
    </button>
  );
}

/* --------------------------------------------------------------- states --- */

function MatchesSkeleton() {
  return (
    <DiscoverShell active="matches">
      <TopBar title="Matches" />
      <Skeleton style={{ height: 44, borderRadius: 12, marginTop: spacing[3] }} />
      <div className="flex flex-col" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ height: 82, borderRadius: 18 }} />
        ))}
      </div>
    </DiscoverShell>
  );
}

function MatchesError() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <DiscoverShell active="matches">
      <TopBar title="Matches" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: spacing[6] }}>
        <EmptyStateFromPreset
          preset="error"
          onPrimary={() => qc.invalidateQueries({ queryKey: matchesQuery().queryKey })}
          onSecondary={() => navigate({ to: "/home" })}
        />
      </div>
    </DiscoverShell>
  );
}
