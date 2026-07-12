// ============================================================================
// /home/college-rankings — all participating colleges, ranked by member count.
// Instant search, sort, and infinite scroll. Live Supabase data via RPC.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, TrendingUp, Users, GraduationCap } from "lucide-react";

import { getCollegeRankings, type RankingRow } from "@/lib/home.functions";
import { APP_BACKGROUND, FONT_FAMILY, colors, spacing, radii, surfaces } from "@/lib/ds";
import { Text, Avatar, Skeleton } from "@/components/ds/glass";
import { Card } from "@/components/ds/card";
import { TopBar, SearchBar, SegmentControl } from "@/components/ds/navigation";
import { EmptyStateFromPreset, EmptyState } from "@/components/ds/empty-state";

const PAGE = 20;
const SORTS = ["Rank", "Name", "Growth"] as const;

export const Route = createFileRoute("/_authenticated/home/college-rankings")({
  head: () => ({
    meta: [
      { title: "College Rankings — Coligo" },
      {
        name: "description",
        content: "See how colleges rank by verified student community on Coligo.",
      },
    ],
  }),
  component: RankingsPage,
});

function nfmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

function RankingsPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search into the query key.
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const query = useInfiniteQuery({
    queryKey: ["home", "rankings-list", search],
    queryFn: ({ pageParam }) =>
      getCollegeRankings({ data: { search, limit: PAGE, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * PAGE : undefined),
    staleTime: 30_000,
  });

  const rows: RankingRow[] = useMemo(() => {
    const all = query.data?.pages.flatMap((p) => p.rows) ?? [];
    const copy = [...all];
    if (sort === 1) copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 2) copy.sort((a, b) => b.growth30d - a.growth30d);
    return copy; // sort 0 = rank order (already sorted by RPC)
  }, [query.data, sort]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: APP_BACKGROUND,
        backgroundAttachment: "fixed",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: `${spacing[4]}px ${spacing[4]}px ${spacing[8]}px`,
          display: "flex",
          flexDirection: "column",
          gap: spacing[3],
        }}
      >
        <TopBar title="College rankings" onBack={() => router.history.back()} />
        <SearchBar
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search colleges"
          icon={<Search style={{ width: 18, height: 18 }} />}
        />
        <SegmentControl options={[...SORTS]} value={sort} onChange={setSort} />

        {query.isError ? (
          <EmptyStateFromPreset preset="offline" onPrimary={() => query.refetch()} />
        ) : query.isLoading ? (
          <div className="flex flex-col" style={{ gap: spacing[2] }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 68, borderRadius: radii.lg }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            scene="search"
            tone="slate"
            title={search ? "No colleges found" : "No colleges yet"}
            description={
              search ? "Try a different name or city." : "Colleges appear here as students join."
            }
          />
        ) : (
          <Card padding={0}>
            {rows.map((r, i) => (
              <button
                key={r.id}
                onClick={() =>
                  navigate({ to: "/home/college/$collegeId", params: { collegeId: r.id } })
                }
                className="ds-press flex w-full items-center"
                style={{
                  gap: spacing[2],
                  padding: spacing[3],
                  background: "transparent",
                  borderTop: i === 0 ? "none" : `1px solid ${surfaces.borderSoft}`,
                  textAlign: "left",
                }}
              >
                <Text
                  variant="headingSm"
                  color={r.rank === 1 ? colors.warning : colors.textMuted}
                  style={{ width: 32 }}
                  numeric
                >
                  {r.rank}
                </Text>
                {r.logoUrl ? (
                  <Avatar src={r.logoUrl} size="sm" />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radii.md,
                      background: "rgba(10,132,255,0.10)",
                      color: colors.primary,
                      flexShrink: 0,
                    }}
                  >
                    <GraduationCap style={{ width: 20, height: 20 }} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Text variant="title" color={colors.textPrimary} truncate>
                    {r.name}
                  </Text>
                  <Text variant="caption" tone="muted" truncate>
                    {r.city ?? "—"}
                  </Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    className="inline-flex items-center"
                    style={{ gap: 3, color: colors.textSecondary, fontSize: 13, fontWeight: 600 }}
                  >
                    <Users style={{ width: 14, height: 14 }} /> {nfmt(r.memberCount)}
                  </span>
                  {r.growth30d > 0 && (
                    <div
                      className="inline-flex items-center"
                      style={{
                        gap: 2,
                        color: colors.success,
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      <TrendingUp style={{ width: 12, height: 12 }} /> +{nfmt(r.growth30d)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </Card>
        )}

        {/* Infinite-scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {query.isFetchingNextPage && (
          <div className="flex justify-center" style={{ padding: spacing[3] }}>
            <Skeleton style={{ height: 40, width: 120, borderRadius: radii.pill }} />
          </div>
        )}
      </div>
    </div>
  );
}
