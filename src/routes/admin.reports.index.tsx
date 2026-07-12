// ============================================================================
// /admin/reports — Trust & Safety moderation dashboard. Real Supabase data via
// admin-gated server functions. Live stat cards, server pagination, debounced
// search, multi-filter, sorting, bulk selection + in-page (never popup) bulk
// confirmation, realtime refresh. Non-admins are redirected to /admin/login.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Search as SearchIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Archive,
  Download,
  Flame,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  reportStatsQuery,
  adminReportsQuery,
  reportAnalyticsQuery,
  setReportStatus,
  setReportPriority,
  type AdminReportRow,
  type AdminReportFilters,
  type ReportSort,
} from "@/lib/admin-reports.functions";
import { adminGuardQuery, logAdminAction } from "@/lib/admin.functions";
import { useAdminRealtime } from "@/lib/use-admin-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { BarSeries } from "@/components/admin/charts";
import {
  ReportStatusBadge,
  PriorityBadge,
  CategoryBadge,
  initialsOf,
  timeAgo,
  shortId,
  prettyStatus,
  CATEGORY_OPTIONS,
} from "@/components/admin/report-bits";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const PAGE_SIZE = 25;

type Search = {
  q?: string;
  status?: string;
  category?: string;
  priority?: string;
  repeat_offender?: boolean;
  sort?: ReportSort;
  page?: number;
};

const SORTS: { value: ReportSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority_high", label: "Highest priority" },
  { value: "priority_low", label: "Lowest priority" },
  { value: "most_reported", label: "Most reported user" },
  { value: "longest_pending", label: "Longest pending" },
  { value: "recently_updated", label: "Recently updated" },
];

export const Route = createFileRoute("/admin/reports/")({
  head: () => ({
    meta: [
      { title: "Reports & Moderation — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    priority: typeof s.priority === "string" ? s.priority : undefined,
    repeat_offender: s.repeat_offender === true || s.repeat_offender === "true" ? true : undefined,
    sort: typeof s.sort === "string" ? (s.sort as ReportSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : undefined,
  }),
  component: AdminReportsGuard,
});

function AdminReportsGuard() {
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
  return <AdminReports />;
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
  | { kind: "status"; action: "under_review" | "escalated" | "resolved" | "rejected" | "archived" }
  | { kind: "priority"; action: "critical" }
  | { kind: "export" }
  | null;

function AdminReports() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const wide = useIsWide();
  useAdminRealtime(true);

  const page = search.page && search.page > 0 ? search.page : 1;
  const [term, setTerm] = useState(search.q ?? "");
  const [debounced, setDebounced] = useState(search.q ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkMode>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const stats = useQuery(reportStatsQuery());
  const analytics = useQuery(reportAnalyticsQuery());

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if ((search.q ?? "") !== debounced) {
      navigate({ to: "/admin/reports", search: (p: Search) => ({ ...p, q: debounced || undefined, page: 1 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AdminReportFilters = useMemo(() => {
    const f: AdminReportFilters = {};
    if (search.status) f.status = search.status;
    if (search.category) f.category = search.category;
    if (search.priority) f.priority = search.priority;
    if (search.repeat_offender) f.repeat_offender = true;
    return f;
  }, [search]);

  const query = useQuery(
    adminReportsQuery({
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
    navigate({ to: "/admin/reports", search: (p: Search) => ({ ...p, ...patch, page: 1 }), replace: true });

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
        if (bulk.kind === "status") await setReportStatus({ data: { reportId: id, status: bulk.action } });
        else await setReportPriority({ data: { reportId: id, priority: bulk.action } });
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
        title="Reports & Moderation"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <button onClick={onLogout} aria-label="Sign out" style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}>
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: spacing[2], marginTop: spacing[4] }}>
        <StatCard label="Total reports" value={s ? s.total.toLocaleString() : "—"} icon={<ShieldAlert style={{ width: 18, height: 18 }} />} />
        <StatCard label="Open" value={s ? s.open : "—"} />
        <StatCard label="Under review" value={s ? s.underReview : "—"} />
        <StatCard label="Awaiting assignment" value={s ? s.awaitingAssignment : "—"} />
        <StatCard label="High priority" value={s ? s.high : "—"} deltaTone="up" delta={s && s.high ? "needs attention" : undefined} />
        <StatCard label="Critical" value={s ? s.critical : "—"} icon={<Flame style={{ width: 18, height: 18 }} />} deltaTone="down" delta={s && s.critical ? "urgent" : undefined} />
        <StatCard label="Resolved today" value={s ? s.resolvedToday : "—"} />
        <StatCard label="Repeat offenders" value={s ? s.repeatOffenders : "—"} />
        <StatCard label="Escalated" value={s ? s.escalated : "—"} />
        <StatCard label="Avg. resolution" value={s ? `${s.avgResolutionHours}h` : "—"} />
        <StatCard label="Last 24 hours" value={s ? s.last24h : "—"} />
        <StatCard label="Last 7 days" value={s ? s.last7d : "—"} />
      </div>

      {/* Category analytics */}
      {analytics.data && analytics.data.byCategory.length > 0 && (
        <Card padding={spacing[4]} style={{ marginTop: spacing[3] }}>
          <Text variant="overline" tone="muted">Reports by category</Text>
          <div style={{ marginTop: spacing[3] }}>
            <BarSeries
              data={analytics.data.byCategory.slice(0, 8).map((c) => ({ label: c.name.replace(/_/g, " "), value: c.count }))}
            />
          </div>
        </Card>
      )}

      {/* Search */}
      <div style={{ marginTop: spacing[4] }}>
        <SearchBar value={term} onChange={setTerm} placeholder="Search report ID, reporter, reported user, college, category" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <FilterSelect label="Status" value={search.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={[["", "All statuses"], ["open", "Open"], ["under_review", "Under review"], ["escalated", "Escalated"], ["resolved", "Resolved"], ["rejected", "Rejected"], ["archived", "Archived"]]} />
        <FilterSelect label="Category" value={search.category ?? ""} onChange={(v) => setFilter({ category: v || undefined })} options={CATEGORY_OPTIONS} />
        <FilterSelect label="Priority" value={search.priority ?? ""} onChange={(v) => setFilter({ priority: v || undefined })} options={[["", "Any priority"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]]} />
        <FilterSelect label="Sort" value={search.sort ?? "newest"} onChange={(v) => setFilter({ sort: v as ReportSort })} options={SORTS.map((x) => [x.value, x.label] as [string, string])} />
        <Chip selected={!!search.repeat_offender} onClick={() => setFilter({ repeat_offender: search.repeat_offender ? undefined : true })}>Repeat offenders</Chip>
      </div>

      {/* Result banner */}
      {result && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <Text variant="body" color={result.fail ? colors.warning : colors.success}>
            Applied to {result.ok} report{result.ok === 1 ? "" : "s"}{result.fail ? ` · ${result.fail} failed` : ""}.
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
            <Button size="sm" variant="secondary" leftIcon={<ArrowUpCircle style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "escalated" })}>Escalate</Button>
            <Button size="sm" variant="secondary" leftIcon={<Flame style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "priority", action: "critical" })}>Mark critical</Button>
            <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "resolved" })}>Resolve</Button>
            <Button size="sm" variant="secondary" leftIcon={<XCircle style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "rejected" })}>Reject</Button>
            <Button size="sm" variant="secondary" leftIcon={<Archive style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "archived" })}>Archive</Button>
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
          {query.isLoading ? "Loading…" : `${total.toLocaleString()} report${total === 1 ? "" : "s"}`}
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
        <EmptyStateCard icon={<ShieldAlert style={{ width: 26, height: 26 }} />} title="Failed to load reports" description="Something went wrong. Your filters are preserved — try again." action={<Button variant="primary" onClick={() => query.refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyStateCard icon={<ShieldAlert style={{ width: 26, height: 26 }} />} title="No reports found" description="No reports match your search and filters." />
      ) : wide ? (
        <ReportTableView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/reports/$reportId", params: { reportId: id } })} />
      ) : (
        <ReportCardsView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/reports/$reportId", params: { reportId: id } })} />
      )}

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <button disabled={page <= 1} onClick={() => navigate({ to: "/admin/reports", search: (p: Search) => ({ ...p, page: page - 1 }) })} style={pagerStyle(page <= 1)}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => navigate({ to: "/admin/reports", search: (p: Search) => ({ ...p, page: page + 1 }) })} style={pagerStyle(page >= totalPages)}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- table (wide)
function ReportTableView({ rows, selected, onToggle, onOpen }: { rows: AdminReportRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: colors.textMuted, borderBottom: `1px solid ${surfaces.border}` }}>
              <th style={thStyle}></th>
              <th style={thStyle}>Report</th>
              <th style={thStyle}>Reported user</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Assigned</th>
              <th style={thStyle}>Prev.</th>
              <th style={thStyle}>Created</th>
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
                  <div><Text variant="caption" tone="muted">by {r.reporter_name ?? "Unknown"}</Text></div>
                </td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
                  <div className="flex items-center" style={{ gap: spacing[2] }}>
                    <Avatar src={r.reported_avatar ?? undefined} size="sm" initials={initialsOf(r.reported_name)} />
                    <div style={{ minWidth: 0 }}>
                      <Text variant="caption" color={colors.textPrimary} style={{ fontWeight: 600 }}>{r.reported_name ?? "—"}</Text>
                      <div><Text variant="caption" tone="muted">{r.college_name ?? "—"}</Text></div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}><CategoryBadge category={r.category} /></td>
                <td style={tdStyle}><PriorityBadge priority={r.priority} /></td>
                <td style={tdStyle}><ReportStatusBadge status={r.status} /></td>
                <td style={tdStyle}><Text variant="caption" tone={r.assigned_name ? "secondary" : "muted"}>{r.assigned_name ?? "Unassigned"}</Text></td>
                <td style={tdStyle}>{r.previous_reports > 1 ? <Badge tone="warning">{r.previous_reports}</Badge> : <Text variant="caption" tone="muted">{r.previous_reports}</Text>}</td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{timeAgo(r.created_at)}</Text></td>
                <td style={tdStyle}>
                  <button onClick={() => onOpen(r.id)} aria-label="Open report" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
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

// ------------------------------------------------------------- cards (mobile)
function ReportCardsView({ rows, selected, onToggle, onOpen }: { rows: AdminReportRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gap: spacing[2] }}>
      {rows.map((r) => (
        <Card key={r.id} padding={spacing[3]} style={{ background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
          <div className="flex items-start" style={{ gap: spacing[2] }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 16, height: 16, marginTop: 4, cursor: "pointer" }} />
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <Avatar src={r.reported_avatar ?? undefined} size="sm" initials={initialsOf(r.reported_name)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{r.reported_name ?? "Unknown user"}</Text>
                  <Text variant="caption" tone="muted">{shortId(r.id)} · {timeAgo(r.created_at)}</Text>
                </div>
              </div>
              <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[2] }}>
                <CategoryBadge category={r.category} />
                <PriorityBadge priority={r.priority} />
                <ReportStatusBadge status={r.status} />
                {r.previous_reports > 1 && <Badge tone="warning">{r.previous_reports} reports</Badge>}
              </div>
              <Text variant="caption" tone="muted" style={{ marginTop: spacing[2], display: "block" }}>
                Reporter: {r.reporter_name ?? "Unknown"} · {r.assigned_name ? `Assigned to ${r.assigned_name}` : "Unassigned"}
              </Text>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- bulk confirm
function BulkConfirm({ mode, rows, count, running, onCancel, onConfirm }: { mode: NonNullable<BulkMode>; rows: AdminReportRow[]; count: number; running: boolean; onCancel: () => void; onConfirm: () => void }) {
  const label =
    mode.kind === "export"
      ? "Export to CSV"
      : mode.kind === "priority"
        ? "Mark as critical"
        : `Set status to ${prettyStatus(mode.action)}`;
  const danger = mode.kind === "status" && (mode.action === "rejected" || mode.action === "archived");
  return (
    <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${surfaces.border}` }}>
      <Text variant="headingSm" color={colors.textPrimary}>{label}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>
        This will apply to {count} selected report{count === 1 ? "" : "s"}. Every change is logged to the audit trail.
      </Text>
      <div style={{ marginTop: spacing[3], maxHeight: 160, overflowY: "auto", display: "grid", gap: spacing[1] }}>
        {rows.slice(0, 8).map((r) => (
          <Text key={r.id} variant="caption" tone="muted">{shortId(r.id)} — {r.reported_name ?? "Unknown"} · {r.category ?? "other"}</Text>
        ))}
        {rows.length > 8 && <Text variant="caption" tone="muted">+ {rows.length - 8} more…</Text>}
      </div>
      <div className="flex" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant="secondary" onClick={onCancel} disabled={running}>Cancel</Button>
        <div style={{ flex: 1 }} />
        <Button variant={danger ? "danger" : "primary"} loading={running} onClick={onConfirm}>Confirm</Button>
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
          background: surfaces.raised,
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

function exportCsv(rows: AdminReportRow[]) {
  const header = ["id", "reporter", "reported", "category", "priority", "status", "assigned", "college", "previous_reports", "created_at"];
  const lines = rows.map((r) =>
    [r.id, r.reporter_name ?? "", r.reported_name ?? "", r.category ?? "", r.priority, r.status, r.assigned_name ?? "", r.college_name ?? "", r.previous_reports, r.created_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coligo-reports-${new Date().toISOString().slice(0, 10)}.csv`;
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
    background: surfaces.raised,
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
