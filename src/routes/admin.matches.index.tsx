// ============================================================================
// /admin/matches — Match Management dashboard. Real Supabase data via admin-gated
// server functions. Live stat cards, server pagination, debounced search,
// multi-filter, sorting, bulk selection + in-page (never popup) bulk
// confirmation, realtime refresh. Non-admins are redirected to /admin/login.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Search as SearchIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Archive,
  RotateCcw,
  Unlink,
  Flag,
  ShieldAlert,
  Download,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  matchStatsQuery,
  adminMatchesQuery,
  matchAnalyticsQuery,
  archiveMatch,
  restoreMatch,
  forceUnmatch,
  flagMatch,
  markSuspicious,
  type AdminMatchRow,
  type AdminMatchFilters,
  type MatchSort,
} from "@/lib/admin-matches.functions";
import { adminGuardQuery, logAdminAction } from "@/lib/admin.functions";
import { useAdminMatchesRealtime } from "@/lib/use-admin-matches-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { BarSeries } from "@/components/admin/charts";
import {
  MatchStatusBadge,
  ConversationBadge,
  FlagBadge,
  initialsOf,
  timeAgo,
  shortId,
  formatDuration,
} from "@/components/admin/match-bits";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const PAGE_SIZE = 25;

type Search = {
  q?: string;
  status?: string;
  activity?: string;
  college?: string;
  flagged?: boolean;
  suspicious?: boolean;
  reported?: boolean;
  has_media?: boolean;
  sort?: MatchSort;
  page?: number;
};

const SORTS: { value: MatchSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_messages", label: "Most messages" },
  { value: "least_messages", label: "Least messages" },
  { value: "most_reports", label: "Most reports" },
  { value: "least_reports", label: "Least reports" },
  { value: "longest_active", label: "Longest active" },
  { value: "shortest_active", label: "Shortest active" },
  { value: "last_activity", label: "Last activity" },
];

export const Route = createFileRoute("/admin/matches/")({
  head: () => ({
    meta: [
      { title: "Match Management — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    activity: typeof s.activity === "string" ? s.activity : undefined,
    college: typeof s.college === "string" ? s.college : undefined,
    flagged: s.flagged === true || s.flagged === "true" ? true : undefined,
    suspicious: s.suspicious === true || s.suspicious === "true" ? true : undefined,
    reported: s.reported === true || s.reported === "true" ? true : undefined,
    has_media: s.has_media === true || s.has_media === "true" ? true : undefined,
    sort: typeof s.sort === "string" ? (s.sort as MatchSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : undefined,
  }),
  component: AdminMatchesGuard,
});

function AdminMatchesGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <ListSkeleton />;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>Check your connection and try again.</Text>
        <div style={{ marginTop: spacing[4] }}>
          <Button variant="primary" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }
  if (!allowed) return null;
  return <AdminMatches />;
}

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

type BulkMode =
  | { kind: "archive" }
  | { kind: "restore" }
  | { kind: "unmatch" }
  | { kind: "flag" }
  | { kind: "suspicious" }
  | { kind: "export" }
  | null;

function AdminMatches() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const wide = useIsWide();
  useAdminMatchesRealtime(true);

  const page = search.page && search.page > 0 ? search.page : 1;
  const [term, setTerm] = useState(search.q ?? "");
  const [debounced, setDebounced] = useState(search.q ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkMode>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const stats = useQuery(matchStatsQuery());
  const analytics = useQuery(matchAnalyticsQuery());

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if ((search.q ?? "") !== debounced) {
      navigate({ to: "/admin/matches", search: (p: Search) => ({ ...p, q: debounced || undefined, page: 1 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AdminMatchFilters = useMemo(() => {
    const f: AdminMatchFilters = {};
    if (search.status) f.status = search.status;
    if (search.activity) f.activity = search.activity;
    if (search.college) f.college = search.college;
    if (search.flagged) f.flagged = true;
    if (search.suspicious) f.suspicious = true;
    if (search.reported) f.reported = true;
    if (search.has_media) f.has_media = true;
    return f;
  }, [search]);

  const query = useQuery(
    adminMatchesQuery({
      search: search.q ?? "",
      filters,
      sort: search.sort ?? "newest",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setFilter = (patch: Partial<Search>) =>
    navigate({ to: "/admin/matches", search: (p: Search) => ({ ...p, ...patch, page: 1 }), replace: true });

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAllPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });

  const onLogout = async () => {
    haptic("light");
    try { await logAdminAction({ data: { action: "admin_logout" } }); } catch { /* ignore */ }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const selectedRows = rows.filter((r) => selected.has(r.id));

  const runBulk = async () => {
    if (!bulk) return;
    setRunning(true);
    setResult(null);
    const ids = Array.from(selected);

    if (bulk.kind === "export") {
      exportCsv(selectedRows);
      setRunning(false);
      setBulk(null);
      return;
    }

    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        if (bulk.kind === "archive") await archiveMatch({ data: { matchId: id } });
        else if (bulk.kind === "restore") await restoreMatch({ data: { matchId: id } });
        else if (bulk.kind === "unmatch") await forceUnmatch({ data: { matchId: id } });
        else if (bulk.kind === "flag") await flagMatch({ data: { matchId: id, value: true } });
        else if (bulk.kind === "suspicious") await markSuspicious({ data: { matchId: id, value: true } });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setResult({ ok, fail });
    setRunning(false);
    setSelected(new Set());
    setBulk(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const s = stats.data;

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title="Match Management"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <button onClick={onLogout} aria-label="Sign out" style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}>
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: spacing[2], marginTop: spacing[4] }}>
        <StatCard label="Total matches" value={s ? s.total.toLocaleString() : "—"} icon={<Heart style={{ width: 18, height: 18 }} />} />
        <StatCard label="Active" value={s ? s.active : "—"} />
        <StatCard label="Archived" value={s ? s.archived : "—"} />
        <StatCard label="Unmatched" value={s ? s.unmatched : "—"} />
        <StatCard label="New today" value={s ? s.today : "—"} />
        <StatCard label="New this week" value={s ? s.week : "—"} />
        <StatCard label="New this month" value={s ? s.month : "—"} />
        <StatCard label="With conversations" value={s ? s.withConversations : "—"} />
        <StatCard label="No messages" value={s ? s.withoutMessages : "—"} />
        <StatCard label="Total messages" value={s ? s.totalMessages.toLocaleString() : "—"} />
        <StatCard label="Success rate" value={s ? `${s.successRate}%` : "—"} deltaTone="up" />
        <StatCard label="Failure rate" value={s ? `${s.failureRate}%` : "—"} deltaTone="down" />
        <StatCard label="Avg. duration" value={s ? `${s.avgDurationHours}h` : "—"} />
        <StatCard label="Avg. to 1st msg" value={s ? `${s.avgTimeToFirstMsgMins}m` : "—"} />
        <StatCard label="Suspicious" value={s ? s.suspicious : "—"} icon={<ShieldAlert style={{ width: 18, height: 18 }} />} deltaTone={s && s.suspicious ? "down" : undefined} delta={s && s.suspicious ? "review" : undefined} />
        <StatCard label="Under investigation" value={s ? s.underInvestigation : "—"} />
      </div>

      {/* Analytics */}
      {analytics.data && analytics.data.byDay.length > 0 && (
        <div style={{ marginTop: spacing[3] }}>
          <BarSeries
            title="Matches per day"
            subtitle="New matches over the last 30 days"
            xKey="label"
            dataKey="value"
            data={analytics.data.byDay.map((d) => ({ label: d.day, value: d.count }))}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginTop: spacing[4] }}>
        <SearchBar value={term} onChange={setTerm} placeholder="Search match ID, user name, phone, college, department" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <FilterSelect label="Status" value={search.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={[["", "All statuses"], ["active", "Active"], ["archived", "Archived"], ["unmatched", "Unmatched"]]} />
        <FilterSelect label="Activity" value={search.activity ?? ""} onChange={(v) => setFilter({ activity: v || undefined })} options={[["", "Any activity"], ["high", "High activity"], ["low", "Low activity"], ["has", "Has messages"], ["none", "No messages"]]} />
        <FilterSelect label="College" value={search.college ?? ""} onChange={(v) => setFilter({ college: v || undefined })} options={[["", "Any colleges"], ["same", "Same college"], ["different", "Different colleges"]]} />
        <FilterSelect label="Sort" value={search.sort ?? "newest"} onChange={(v) => setFilter({ sort: v as MatchSort })} options={SORTS.map((x) => [x.value, x.label] as [string, string])} />
        <Chip selected={!!search.flagged} onClick={() => setFilter({ flagged: search.flagged ? undefined : true })}>Flagged</Chip>
        <Chip selected={!!search.suspicious} onClick={() => setFilter({ suspicious: search.suspicious ? undefined : true })}>Suspicious</Chip>
        <Chip selected={!!search.reported} onClick={() => setFilter({ reported: search.reported ? undefined : true })}>Reported</Chip>
        <Chip selected={!!search.has_media} onClick={() => setFilter({ has_media: search.has_media ? undefined : true })}>Has media</Chip>
      </div>

      {/* Result banner */}
      {result && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <Text variant="body" color={result.fail ? colors.warning : colors.success}>
            Applied to {result.ok} match{result.ok === 1 ? "" : "es"}{result.fail ? ` · ${result.fail} failed` : ""}.
          </Text>
        </Card>
      )}

      {/* Bulk confirmation (in-page, never popup) */}
      {bulk && selected.size > 0 && (
        <BulkConfirm mode={bulk} rows={selectedRows} count={selected.size} running={running} onCancel={() => setBulk(null)} onConfirm={runBulk} />
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && !bulk && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3], position: "sticky", top: spacing[2], zIndex: 5 }}>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
            <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{selected.size} selected</Text>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" leftIcon={<Archive style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "archive" })}>Archive</Button>
            <Button size="sm" variant="secondary" leftIcon={<RotateCcw style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "restore" })}>Restore</Button>
            <Button size="sm" variant="secondary" leftIcon={<Unlink style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "unmatch" })}>Force unmatch</Button>
            <Button size="sm" variant="secondary" leftIcon={<Flag style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "flag" })}>Flag</Button>
            <Button size="sm" variant="secondary" leftIcon={<ShieldAlert style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "suspicious" })}>Mark suspicious</Button>
            <Button size="sm" variant="secondary" leftIcon={<Download style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "export" })}>Export</Button>
            <button onClick={() => setSelected(new Set())} aria-label="Clear selection" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Card>
      )}

      {/* Count line */}
      <div className="flex items-center justify-between" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        <Text variant="caption" tone="muted">
          {query.isLoading ? "Loading…" : `${total.toLocaleString()} match${total === 1 ? "" : "es"}`}
        </Text>
        {rows.length > 0 && (
          <button onClick={toggleAllPage} style={{ background: "transparent", border: "none", color: colors.primary, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {allOnPage ? "Deselect page" : "Select page"}
          </button>
        )}
      </div>

      {/* Results */}
      {query.isLoading ? (
        <ListSkeleton bare />
      ) : query.isError ? (
        <EmptyStateCard icon={<Heart style={{ width: 26, height: 26 }} />} title="Failed to load matches" description="Something went wrong. Your filters are preserved — try again." action={<Button variant="primary" onClick={() => query.refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyStateCard icon={<Heart style={{ width: 26, height: 26 }} />} title="No matches found" description="No matches match your search and filters." />
      ) : wide ? (
        <MatchTableView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/matches/$matchId", params: { matchId: id } })} />
      ) : (
        <MatchCardsView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/matches/$matchId", params: { matchId: id } })} />
      )}

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <button disabled={page <= 1} onClick={() => navigate({ to: "/admin/matches", search: (p: Search) => ({ ...p, page: page - 1 }) })} style={pagerStyle(page <= 1)}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => navigate({ to: "/admin/matches", search: (p: Search) => ({ ...p, page: page + 1 }) })} style={pagerStyle(page >= totalPages)}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------- participants cell
function Participants({ r }: { r: AdminMatchRow }) {
  return (
    <div className="flex items-center" style={{ gap: spacing[2] }}>
      <div className="flex items-center" style={{ marginRight: 4 }}>
        <Avatar src={r.user_a_avatar ?? undefined} size="sm" initials={initialsOf(r.user_a_name)} />
        <div style={{ marginLeft: -8 }}>
          <Avatar src={r.user_b_avatar ?? undefined} size="sm" initials={initialsOf(r.user_b_name)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>
          {(r.user_a_name ?? "—")} × {(r.user_b_name ?? "—")}
        </Text>
        <div><Text variant="caption" tone="muted">{r.college_a ?? "—"}{r.college_a !== r.college_b ? ` · ${r.college_b ?? "—"}` : ""}</Text></div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- table (wide)
function MatchTableView({ rows, selected, onToggle, onOpen }: { rows: AdminMatchRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: colors.textMuted, borderBottom: `1px solid ${surfaces.border}` }}>
              <th style={thStyle}></th>
              <th style={thStyle}>Match</th>
              <th style={thStyle}>Participants</th>
              <th style={thStyle}>Msgs</th>
              <th style={thStyle}>Media</th>
              <th style={thStyle}>Conversation</th>
              <th style={thStyle}>Reports</th>
              <th style={thStyle}>Duration</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last active</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${surfaces.borderSoft}`, background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                </td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
                  <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{shortId(r.id)}</Text>
                  <div className="flex items-center" style={{ gap: 4, marginTop: 2 }}><FlagBadge flagged={r.flagged} suspicious={r.suspicious} /></div>
                </td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}><Participants r={r} /></td>
                <td style={tdStyle}><Text variant="caption" tone="secondary">{r.total_messages}</Text></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{r.media_count}</Text></td>
                <td style={tdStyle}><ConversationBadge status={r.conversation_status} /></td>
                <td style={tdStyle}>{r.reports_count > 0 ? <Badge tone="warning">{r.reports_count}</Badge> : <Text variant="caption" tone="muted">0</Text>}</td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{formatDuration(r.match_duration_secs)}</Text></td>
                <td style={tdStyle}><MatchStatusBadge status={r.status} /></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{timeAgo(r.last_activity)}</Text></td>
                <td style={tdStyle}>
                  <button onClick={() => onOpen(r.id)} aria-label="Open match" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
                    <ChevronRight style={{ width: 18, height: 18 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- cards (narrow)
function MatchCardsView({ rows, selected, onToggle, onOpen }: { rows: AdminMatchRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {rows.map((r) => (
        <Card key={r.id} padding={spacing[3]} style={{ background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
          <div className="flex items-start" style={{ gap: spacing[2] }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 16, height: 16, marginTop: 4, cursor: "pointer" }} />
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
              <div className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{shortId(r.id)}</Text>
                <MatchStatusBadge status={r.status} />
              </div>
              <div style={{ marginTop: spacing[2] }}><Participants r={r} /></div>
              <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[2] }}>
                <ConversationBadge status={r.conversation_status} />
                <Text variant="caption" tone="muted">{r.total_messages} msgs · {r.media_count} media</Text>
                {r.reports_count > 0 && <Badge tone="warning">{r.reports_count} reports</Badge>}
                <FlagBadge flagged={r.flagged} suspicious={r.suspicious} />
                <Text variant="caption" tone="muted">{formatDuration(r.match_duration_secs)} · {timeAgo(r.last_activity)}</Text>
              </div>
            </div>
            <button onClick={() => onOpen(r.id)} aria-label="Open match" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
              <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// --------------------------------------------------------- bulk confirmation
const BULK_COPY: Record<string, { title: string; desc: string; danger: boolean }> = {
  archive: { title: "Archive matches", desc: "Conversations are preserved but users can no longer continue matching.", danger: false },
  restore: { title: "Restore matches", desc: "Reactivate these matches and re-enable messaging.", danger: false },
  unmatch: { title: "Force unmatch", desc: "This terminates the relationship and disables messaging for both users.", danger: true },
  flag: { title: "Flag matches", desc: "Flag these matches for review.", danger: false },
  suspicious: { title: "Mark suspicious", desc: "Marks these matches as suspicious and opens an investigation.", danger: true },
  export: { title: "Export matches", desc: "Download the selected matches as a CSV file.", danger: false },
};

function BulkConfirm({ mode, rows, count, running, onCancel, onConfirm }: { mode: NonNullable<BulkMode>; rows: AdminMatchRow[]; count: number; running: boolean; onCancel: () => void; onConfirm: () => void }) {
  const copy = BULK_COPY[mode.kind];
  return (
    <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${copy.danger ? colors.danger : surfaces.border}` }}>
      <Text variant="headingSm" color={colors.textPrimary}>{copy.title} — {count} selected</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{copy.desc}</Text>
      <div style={{ marginTop: spacing[3], maxHeight: 160, overflowY: "auto", display: "grid", gap: spacing[1] }}>
        {rows.slice(0, 8).map((r) => (
          <Text key={r.id} variant="caption" tone="muted">{shortId(r.id)} — {r.user_a_name ?? "—"} × {r.user_b_name ?? "—"}</Text>
        ))}
        {rows.length > 8 && <Text variant="caption" tone="muted">+ {rows.length - 8} more…</Text>}
      </div>
      <div className="flex" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant="secondary" onClick={onCancel} disabled={running}>Cancel</Button>
        <div style={{ flex: 1 }} />
        <Button variant={copy.danger ? "danger" : "primary"} loading={running} onClick={onConfirm}>Confirm</Button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------- helpers
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textMuted, paddingLeft: 4 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: surfaces.glassSoft,
          color: colors.textPrimary,
          border: `1px solid ${surfaces.border}`,
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} style={{ color: "#111" }}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function exportCsv(rows: AdminMatchRow[]) {
  const header = ["id", "user_a", "user_b", "college_a", "college_b", "status", "total_messages", "media_count", "reports", "created_at", "last_activity"];
  const lines = rows.map((r) =>
    [r.id, r.user_a_name ?? "", r.user_b_name ?? "", r.college_a ?? "", r.college_b ?? "", r.status, r.total_messages, r.media_count, r.reports_count, r.created_at, r.last_activity ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coligo-matches-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function pagerStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 14px",
    borderRadius: 10,
    border: `1px solid ${surfaces.border}`,
    background: surfaces.glassSoft,
    color: disabled ? colors.textMuted : colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

const thStyle: React.CSSProperties = { padding: "12px 14px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" };

function ListSkeleton({ bare = false }: { bare?: boolean }) {
  const body = (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
      ))}
    </div>
  );
  if (bare) return body;
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4] }}>
      <Skeleton style={{ height: 40, borderRadius: 12, marginBottom: spacing[4] }} />
      {body}
    </div>
  );
}
