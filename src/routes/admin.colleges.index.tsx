// ============================================================================
// /admin/colleges — Admin College Management list. Real Supabase data via
// admin-gated server functions. Realtime summary cards, server pagination,
// debounced search, multi-filter, sorting, bulk enable/disable/archive/restore/
// discovery with in-page (never popup) confirmation. Non-admins are redirected.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Search as SearchIcon, LogOut, ChevronRight, ChevronLeft, Plus,
  CheckCircle2, PauseCircle, Archive, RotateCcw, Compass, Download, X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  collegeSummaryQuery, adminCollegesQuery, setCollegeStatus, setCollegeDiscovery,
  type AdminCollegeRow, type AdminCollegeFilters, type AdminCollegeSort,
} from "@/lib/admin-colleges.functions";
import { adminGuardQuery, logAdminAction } from "@/lib/admin.functions";
import { useAdminCollegesRealtime } from "@/lib/use-admin-colleges-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { CollegeStatusBadge, DiscoveryBadge, collegeInitials } from "@/components/admin/college-bits";
import { timeAgo } from "@/components/admin/user-bits";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const PAGE_SIZE = 25;

type Search = {
  q?: string;
  status?: string;
  discovery?: boolean;
  sort?: AdminCollegeSort;
  page?: number;
};

const SORTS: { value: AdminCollegeSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name" },
  { value: "most_students", label: "Most students" },
  { value: "least_students", label: "Fewest students" },
  { value: "active_users", label: "Most active" },
  { value: "online", label: "Most online" },
  { value: "matches", label: "Most matches" },
  { value: "messages", label: "Most messages" },
  { value: "completion", label: "Profile completion" },
  { value: "growth", label: "Fastest growing" },
];

export const Route = createFileRoute("/admin/colleges/")({
  head: () => ({
    meta: [
      { title: "College management — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    discovery: s.discovery === false || s.discovery === "false" ? false : s.discovery === true || s.discovery === "true" ? true : undefined,
    sort: typeof s.sort === "string" ? (s.sort as AdminCollegeSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : undefined,
  }),
  component: CollegesGuard,
});

function CollegesGuard() {
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
  return <AdminColleges />;
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
  | { kind: "status"; action: "active" | "disabled" | "archived" }
  | { kind: "discovery"; action: "on" | "off" }
  | { kind: "export" }
  | null;

function AdminColleges() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const wide = useIsWide();
  useAdminCollegesRealtime(true);

  const page = search.page && search.page > 0 ? search.page : 1;
  const [term, setTerm] = useState(search.q ?? "");
  const [debounced, setDebounced] = useState(search.q ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkMode>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const summary = useQuery(collegeSummaryQuery());

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if ((search.q ?? "") !== debounced) {
      navigate({ to: "/admin/colleges", search: (p: Search) => ({ ...p, q: debounced || undefined, page: 1 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AdminCollegeFilters = useMemo(() => {
    const f: AdminCollegeFilters = {};
    if (search.status) f.status = search.status;
    if (search.discovery === false) f.discovery = false;
    if (search.discovery === true) f.discovery = true;
    return f;
  }, [search]);

  const query = useQuery(
    adminCollegesQuery({
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
    navigate({ to: "/admin/colleges", search: (p: Search) => ({ ...p, ...patch, page: 1 }), replace: true });

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
        if (bulk.kind === "status") {
          await setCollegeStatus({ data: { collegeId: id, status: bulk.action } });
        } else {
          await setCollegeDiscovery({ data: { collegeId: id, enabled: bulk.action === "on" } });
        }
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setResult({ ok, fail });
    setRunning(false);
    setSelected(new Set());
    setBulk(null);
    qc.invalidateQueries({ queryKey: ["admin", "colleges"] });
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title="College Management"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <button onClick={onLogout} aria-label="Sign out" style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}>
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2], marginTop: spacing[4] }}>
        {summary.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Card key={i} padding={spacing[4]}><Skeleton style={{ height: 44 }} /></Card>)
        ) : summary.data ? (
          <>
            <StatCard label="Total colleges" value={summary.data.totalColleges.toLocaleString()} icon={<Building2 style={ICN} />} />
            <StatCard label="Active" value={summary.data.activeColleges.toLocaleString()} />
            <StatCard label="Disabled" value={summary.data.disabledColleges.toLocaleString()} />
            <StatCard label="Archived" value={summary.data.archivedColleges.toLocaleString()} />
            <StatCard label="Total students" value={summary.data.totalStudents.toLocaleString()} />
            <StatCard label="Joined today" value={summary.data.studentsToday.toLocaleString()} />
            <StatCard label="Added this month" value={summary.data.collegesThisMonth.toLocaleString()} />
            <StatCard label="Discovery on" value={summary.data.discoveryEnabled.toLocaleString()} />
            <StatCard label="Avg students" value={summary.data.avgStudentsPerCollege.toLocaleString()} />
            <StatCard label="Verified" value={`${summary.data.verificationPct}%`} />
          </>
        ) : null}
      </div>

      {/* Search + create */}
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <div style={{ flex: 1 }}>
          <SearchBar value={term} onChange={setTerm} placeholder="Search name, code, city, state" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
        </div>
        <Button variant="primary" leftIcon={<Plus style={{ width: 16, height: 16 }} />} onClick={() => navigate({ to: "/admin/colleges/new" })}>New</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <FilterSelect label="Status" value={search.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={[["", "All statuses"], ["active", "Active"], ["disabled", "Disabled"], ["archived", "Archived"]]} />
        <FilterSelect label="Sort" value={search.sort ?? "newest"} onChange={(v) => setFilter({ sort: v as AdminCollegeSort })} options={SORTS.map((s) => [s.value, s.label] as [string, string])} />
        <Chip selected={search.discovery === true} onClick={() => setFilter({ discovery: search.discovery === true ? undefined : true })}>Discovery on</Chip>
        <Chip selected={search.discovery === false} onClick={() => setFilter({ discovery: search.discovery === false ? undefined : false })}>Discovery off</Chip>
      </div>

      {result && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <Text variant="body" color={result.fail ? colors.warning : colors.success}>
            Applied to {result.ok} college{result.ok === 1 ? "" : "s"}{result.fail ? ` · ${result.fail} failed` : ""}.
          </Text>
        </Card>
      )}

      {bulk && selected.size > 0 && (
        <BulkConfirm mode={bulk} rows={selectedRows} count={selected.size} running={running} onCancel={() => setBulk(null)} onConfirm={runBulk} />
      )}

      {selected.size > 0 && !bulk && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3], position: "sticky", top: spacing[2], zIndex: 5 }}>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
            <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{selected.size} selected</Text>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 style={ICSM} />} onClick={() => setBulk({ kind: "status", action: "active" })}>Enable</Button>
            <Button size="sm" variant="secondary" leftIcon={<PauseCircle style={ICSM} />} onClick={() => setBulk({ kind: "status", action: "disabled" })}>Disable</Button>
            <Button size="sm" variant="secondary" leftIcon={<Archive style={ICSM} />} onClick={() => setBulk({ kind: "status", action: "archived" })}>Archive</Button>
            <Button size="sm" variant="secondary" leftIcon={<Compass style={ICSM} />} onClick={() => setBulk({ kind: "discovery", action: "on" })}>Discovery on</Button>
            <Button size="sm" variant="secondary" leftIcon={<RotateCcw style={ICSM} />} onClick={() => setBulk({ kind: "discovery", action: "off" })}>Discovery off</Button>
            <Button size="sm" variant="secondary" leftIcon={<Download style={ICSM} />} onClick={() => setBulk({ kind: "export" })}>Export</Button>
            <button onClick={() => setSelected(new Set())} aria-label="Clear selection" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        <Text variant="caption" tone="muted">
          {query.isLoading ? "Loading…" : `${total.toLocaleString()} college${total === 1 ? "" : "s"}`}
        </Text>
        {rows.length > 0 && (
          <button onClick={toggleAllPage} style={{ background: "transparent", border: "none", color: colors.primary, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {allOnPage ? "Deselect page" : "Select page"}
          </button>
        )}
      </div>

      {query.isLoading ? (
        <ListSkeleton bare />
      ) : query.isError ? (
        <EmptyStateCard icon={<Building2 style={{ width: 26, height: 26 }} />} title="Failed to load colleges" description="Something went wrong. Your filters are preserved — try again." action={<Button variant="primary" onClick={() => query.refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyStateCard icon={<Building2 style={{ width: 26, height: 26 }} />} title="No colleges found" description="No colleges match your search and filters." action={<Button variant="primary" leftIcon={<Plus style={{ width: 16, height: 16 }} />} onClick={() => navigate({ to: "/admin/colleges/new" })}>Add a college</Button>} />
      ) : wide ? (
        <CollegeTableView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/colleges/$collegeId", params: { collegeId: id } })} />
      ) : (
        <CollegeCardsView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/colleges/$collegeId", params: { collegeId: id } })} />
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <button disabled={page <= 1} onClick={() => navigate({ to: "/admin/colleges", search: (p: Search) => ({ ...p, page: page - 1 }) })} style={pagerStyle(page <= 1)}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => navigate({ to: "/admin/colleges", search: (p: Search) => ({ ...p, page: page + 1 }) })} style={pagerStyle(page >= totalPages)}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- table (wide)
function CollegeTableView({ rows, selected, onToggle, onOpen }: { rows: AdminCollegeRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: colors.textMuted, borderBottom: `1px solid ${surfaces.border}` }}>
              <th style={thStyle}></th>
              <th style={thStyle}>College</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Students</th>
              <th style={thStyle}>Depts</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Matches</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Discovery</th>
              <th style={thStyle}>Added</th>
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
                  <div className="flex items-center" style={{ gap: spacing[2] }}>
                    <Avatar src={r.logo_url ?? undefined} size="sm" initials={collegeInitials(r.name)} />
                    <div style={{ minWidth: 0 }}>
                      <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{r.name}</Text>
                      <Text variant="caption" tone="muted">{r.code ?? "—"}</Text>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}><Text variant="caption" color={colors.textSecondary}>{[r.city, r.state].filter(Boolean).join(", ") || "—"}</Text></td>
                <td style={tdStyle}>
                  <Text variant="body" numeric color={colors.textPrimary}>{r.total_students}</Text>
                  <Text variant="caption" tone="muted">{r.male_students}M · {r.female_students}F</Text>
                </td>
                <td style={tdStyle}><Text variant="body" numeric color={colors.textPrimary}>{r.department_count}</Text></td>
                <td style={tdStyle}><Text variant="body" numeric color={colors.textPrimary}>{r.active_users}</Text></td>
                <td style={tdStyle}><Text variant="body" numeric color={colors.textPrimary}>{r.total_matches}</Text></td>
                <td style={tdStyle}><CollegeStatusBadge status={r.status} /></td>
                <td style={tdStyle}><DiscoveryBadge enabled={r.discovery_enabled} /></td>
                <td style={tdStyle}><Text variant="caption" tone="muted">{timeAgo(r.created_at)}</Text></td>
                <td style={{ ...tdStyle, cursor: "pointer" }} onClick={() => onOpen(r.id)}><ChevronRight style={{ width: 16, height: 16, color: colors.textMuted }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --------------------------------------------------------------- cards (narrow)
function CollegeCardsView({ rows, selected, onToggle, onOpen }: { rows: AdminCollegeRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
      {rows.map((r) => (
        <Card key={r.id} padding={spacing[3]} style={{ background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0 }} />
            <div className="flex items-center" style={{ gap: spacing[2], flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
              <Avatar src={r.logo_url ?? undefined} size="md" initials={collegeInitials(r.name)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{r.name}</Text>
                <Text variant="caption" tone="muted" truncate>{r.code ? `${r.code} · ` : ""}{[r.city, r.state].filter(Boolean).join(", ") || "No location"}</Text>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: colors.textMuted, flexShrink: 0 }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[1], marginTop: spacing[2] }}>
            <CollegeStatusBadge status={r.status} />
            <DiscoveryBadge enabled={r.discovery_enabled} />
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[3], marginTop: spacing[2] }}>
            <Text variant="caption" tone="muted">{r.total_students} students</Text>
            <Text variant="caption" tone="muted">{r.department_count} depts</Text>
            <Text variant="caption" tone="muted">{r.total_matches} matches</Text>
            <Text variant="caption" tone="muted">Added {timeAgo(r.created_at)}</Text>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- bulk confirm
function BulkConfirm({ mode, rows, count, running, onCancel, onConfirm }: { mode: NonNullable<BulkMode>; rows: AdminCollegeRow[]; count: number; running: boolean; onCancel: () => void; onConfirm: () => void }) {
  const key = mode.kind === "status" ? mode.action : mode.kind === "discovery" ? `discovery_${mode.action}` : "export";
  const meta: Record<string, { title: string; desc: string; danger?: boolean }> = {
    active: { title: "Enable colleges", desc: "Selected colleges become active and visible to students in onboarding and discovery." },
    disabled: { title: "Disable colleges", desc: "Selected colleges are hidden from students. Existing data is preserved." },
    archived: { title: "Archive colleges", desc: "Selected colleges are archived and removed from student-facing surfaces.", danger: true },
    discovery_on: { title: "Enable discovery", desc: "Students at the selected colleges will appear in discovery." },
    discovery_off: { title: "Disable discovery", desc: "Students at the selected colleges will not appear in discovery." },
    export: { title: "Export colleges", desc: "Downloads a CSV of the selected colleges on this page." },
  };
  const m = meta[key];
  return (
    <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${m.danger ? "rgba(255,59,48,0.24)" : surfaces.border}` }}>
      <Text variant="headingSm" color={colors.textPrimary}>{m.title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{m.desc}</Text>
      <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[3], fontWeight: 600 }}>{count} college{count === 1 ? "" : "s"} selected</Text>
      <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[2] }}>
        {rows.slice(0, 8).map((r) => <Badge key={r.id} tone="neutral">{r.name}</Badge>)}
        {count > 8 && <Badge tone="neutral">+{count - 8} more</Badge>}
      </div>
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant={m.danger ? "danger" : "primary"} loading={running} onClick={onConfirm}>Confirm</Button>
        <Button variant="ghost" onClick={onCancel} disabled={running}>Cancel</Button>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ helpers
function exportCsv(rows: AdminCollegeRow[]) {
  const headers = ["id", "name", "code", "city", "state", "country", "status", "discovery_enabled", "total_students", "male", "female", "departments", "matches", "messages", "created_at"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([r.id, r.name, r.code, r.city, r.state, r.country, r.status, r.discovery_enabled, r.total_students, r.male_students, r.female_students, r.department_count, r.total_matches, r.messages_sent, r.created_at].map(esc).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coligo-colleges-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      style={{ appearance: "none", borderRadius: radii.pill, padding: "8px 14px", fontSize: 14, fontWeight: 600,
        color: value ? colors.textPrimary : colors.textSecondary, background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, cursor: "pointer" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

const ICN: React.CSSProperties = { width: 18, height: 18 };
const ICSM: React.CSSProperties = { width: 15, height: 15 };
const thStyle: React.CSSProperties = { padding: `${spacing[2]}px ${spacing[3]}px`, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: `${spacing[2]}px ${spacing[3]}px`, verticalAlign: "middle", whiteSpace: "nowrap" };

function pagerStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: radii.pill,
    background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`,
    color: disabled ? colors.textMuted : colors.textPrimary, fontWeight: 600, fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}

function ListSkeleton({ bare = false }: { bare?: boolean }) {
  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} padding={spacing[3]}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <Skeleton style={{ width: 40, height: 40, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <Skeleton style={{ height: 14, width: "40%" }} />
              <Skeleton style={{ height: 12, width: "60%", marginTop: 8 }} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
  if (bare) return body;
  return <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4] }}>{body}</div>;
}
