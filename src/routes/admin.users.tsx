// ============================================================================
// /admin/users — Admin User Management list. Real Supabase data via admin-gated
// server functions. Server pagination, debounced search, multi-filter, sorting,
// bulk selection + in-page (never popup) bulk-action confirmation, live updates.
// Non-admins are redirected to /admin/login.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search as SearchIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Ban,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Download,
  PauseCircle,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  adminUsersQuery,
  setAccountStatus,
  setVerification,
  type AdminUserRow,
  type AdminUserFilters,
  type AdminUserSort,
} from "@/lib/admin-users.functions";
import { adminGuardQuery, logAdminAction } from "@/lib/admin.functions";
import { useAdminRealtime } from "@/lib/use-admin-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip } from "@/components/ds/glass";
import { Card, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import {
  StatusBadge,
  VerificationBadge,
  OnlineDot,
  initialsOf,
  timeAgo,
  prettyGender,
} from "@/components/admin/user-bits";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const PAGE_SIZE = 25;

type Search = {
  q?: string;
  status?: string;
  verification?: string;
  gender?: string;
  online?: boolean;
  discovery?: boolean;
  reported?: boolean;
  never_logged_in?: boolean;
  sort?: AdminUserSort;
  page?: number;
};

const SORTS: { value: AdminUserSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name" },
  { value: "last_login", label: "Last login" },
  { value: "most_matches", label: "Most matches" },
  { value: "most_messages", label: "Most active" },
  { value: "most_reports", label: "Most reports" },
  { value: "profile_completion", label: "Profile completion" },
];

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User management — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    verification: typeof s.verification === "string" ? s.verification : undefined,
    gender: typeof s.gender === "string" ? s.gender : undefined,
    online: s.online === true || s.online === "true" ? true : undefined,
    discovery: s.discovery === false || s.discovery === "false" ? false : undefined,
    reported: s.reported === true || s.reported === "true" ? true : undefined,
    never_logged_in: s.never_logged_in === true || s.never_logged_in === "true" ? true : undefined,
    sort: typeof s.sort === "string" ? (s.sort as AdminUserSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : undefined,
  }),
  component: AdminUsersGuard,
});

function AdminUsersGuard() {
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
  return <AdminUsers />;
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
  | { action: "suspended" | "banned" | "active" | "deleted"; kind: "status" }
  | { action: "verified" | "unverified"; kind: "verify" }
  | { action: "export"; kind: "export" }
  | null;

function AdminUsers() {
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

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    // Push the debounced term into the URL (resets to page 1).
    if ((search.q ?? "") !== debounced) {
      navigate({ to: "/admin/users", search: (p: Search) => ({ ...p, q: debounced || undefined, page: 1 }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: AdminUserFilters = useMemo(() => {
    const f: AdminUserFilters = {};
    if (search.status) f.status = search.status;
    if (search.verification) f.verification = search.verification;
    if (search.gender) f.gender = search.gender;
    if (search.online) f.online = true;
    if (search.discovery === false) f.discovery = false;
    if (search.reported) f.reported = true;
    if (search.never_logged_in) f.never_logged_in = true;
    return f;
  }, [search]);

  const query = useQuery(
    adminUsersQuery({
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
    navigate({ to: "/admin/users", search: (p: Search) => ({ ...p, ...patch, page: 1 }), replace: true });

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
      exportCsv(rows.filter((r) => selected.has(r.id)));
      setRunning(false);
      setBulk(null);
      return;
    }

    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        if (bulk.kind === "status") {
          await setAccountStatus({ data: { userId: id, status: bulk.action } });
        } else {
          await setVerification({ data: { userId: id, status: bulk.action } });
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
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title="User Management"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={
          <button onClick={onLogout} aria-label="Sign out" style={{ display: "flex", padding: 8, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" }}>
            <LogOut style={{ width: 20, height: 20 }} />
          </button>
        }
      />

      {/* Search */}
      <div style={{ marginTop: spacing[4] }}>
        <SearchBar value={term} onChange={setTerm} placeholder="Search name, phone, college, department, ID" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center" style={{ gap: spacing[2], marginTop: spacing[3] }}>
        <FilterSelect label="Status" value={search.status ?? ""} onChange={(v) => setFilter({ status: v || undefined })} options={[["", "All statuses"], ["active", "Active"], ["suspended", "Suspended"], ["banned", "Banned"], ["deleted", "Deleted"]]} />
        <FilterSelect label="Verification" value={search.verification ?? ""} onChange={(v) => setFilter({ verification: v || undefined })} options={[["", "Any verification"], ["verified", "Verified"], ["pending", "Pending"], ["unverified", "Unverified"]]} />
        <FilterSelect label="Gender" value={search.gender ?? ""} onChange={(v) => setFilter({ gender: v || undefined })} options={[["", "Any gender"], ["woman", "Woman"], ["man", "Man"], ["nonbinary", "Non-binary"], ["other", "Other"]]} />
        <FilterSelect label="Sort" value={search.sort ?? "newest"} onChange={(v) => setFilter({ sort: v as AdminUserSort })} options={SORTS.map((s) => [s.value, s.label] as [string, string])} />
        <Chip selected={!!search.online} onClick={() => setFilter({ online: search.online ? undefined : true })}>Online</Chip>
        <Chip selected={search.reported === true} onClick={() => setFilter({ reported: search.reported ? undefined : true })}>Reported</Chip>
        <Chip selected={search.discovery === false} onClick={() => setFilter({ discovery: search.discovery === false ? undefined : false })}>Discovery off</Chip>
        <Chip selected={!!search.never_logged_in} onClick={() => setFilter({ never_logged_in: search.never_logged_in ? undefined : true })}>Never logged in</Chip>
      </div>

      {/* Result banner */}
      {result && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3] }}>
          <Text variant="body" color={result.fail ? colors.warning : colors.success}>
            Applied to {result.ok} user{result.ok === 1 ? "" : "s"}{result.fail ? ` · ${result.fail} failed` : ""}.
          </Text>
        </Card>
      )}

      {/* Bulk confirmation panel (in-page, never a popup) */}
      {bulk && selected.size > 0 && (
        <BulkConfirm
          mode={bulk}
          rows={selectedRows}
          count={selected.size}
          running={running}
          onCancel={() => setBulk(null)}
          onConfirm={runBulk}
        />
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && !bulk && (
        <Card padding={spacing[3]} style={{ marginTop: spacing[3], position: "sticky", top: spacing[2], zIndex: 5 }}>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[2] }}>
            <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{selected.size} selected</Text>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" leftIcon={<PauseCircle style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "suspended" })}>Suspend</Button>
            <Button size="sm" variant="secondary" leftIcon={<Ban style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "banned" })}>Ban</Button>
            <Button size="sm" variant="secondary" leftIcon={<ShieldCheck style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "verify", action: "verified" })}>Verify</Button>
            <Button size="sm" variant="secondary" leftIcon={<RotateCcw style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "active" })}>Restore</Button>
            <Button size="sm" variant="secondary" leftIcon={<Download style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "export", action: "export" })}>Export</Button>
            <Button size="sm" variant="danger" leftIcon={<Trash2 style={{ width: 15, height: 15 }} />} onClick={() => setBulk({ kind: "status", action: "deleted" })}>Delete</Button>
            <button onClick={() => setSelected(new Set())} aria-label="Clear selection" style={{ display: "flex", padding: 6, color: colors.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Card>
      )}

      {/* Count line */}
      <div className="flex items-center justify-between" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        <Text variant="caption" tone="muted">
          {query.isLoading ? "Loading…" : `${total.toLocaleString()} user${total === 1 ? "" : "s"}`}
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
        <EmptyStateCard icon={<Users style={{ width: 26, height: 26 }} />} title="Failed to load users" description="Something went wrong. Your filters are preserved — try again." action={<Button variant="primary" onClick={() => query.refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyStateCard icon={<Users style={{ width: 26, height: 26 }} />} title="No users found" description="No accounts match your search and filters." />
      ) : wide ? (
        <UserTableView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} />
      ) : (
        <UserCardsView rows={rows} selected={selected} onToggle={toggleSelect} onOpen={(id) => navigate({ to: "/admin/users/$userId", params: { userId: id } })} />
      )}

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <button disabled={page <= 1} onClick={() => navigate({ to: "/admin/users", search: (p: Search) => ({ ...p, page: page - 1 }) })} style={pagerStyle(page <= 1)}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => navigate({ to: "/admin/users", search: (p: Search) => ({ ...p, page: page + 1 }) })} style={pagerStyle(page >= totalPages)}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- table (wide)
function UserTableView({ rows, selected, onToggle, onOpen }: { rows: AdminUserRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: colors.textMuted, borderBottom: `1px solid ${surfaces.border}` }}>
              <th style={thStyle}></th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>College</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Verified</th>
              <th style={thStyle}>Presence</th>
              <th style={thStyle}>Matches</th>
              <th style={thStyle}>Chats</th>
              <th style={thStyle}>Reports</th>
              <th style={thStyle}>Joined</th>
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
                    <Avatar src={r.avatar ?? undefined} size="sm" initials={initialsOf(r.full_name, r.phone)} />
                    <div style={{ minWidth: 0 }}>
                      <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{r.full_name || "Unnamed"}</Text>
                      <Text variant="caption" tone="muted">{r.phone ?? "—"}{r.age ? ` · ${r.age}` : ""} · {prettyGender(r.gender)}</Text>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <Text variant="caption" color={colors.textSecondary}>{r.college_name ?? "—"}</Text>
                  <Text variant="caption" tone="muted">{r.department_name ?? ""}</Text>
                </td>
                <td style={tdStyle}><StatusBadge status={r.account_status} /></td>
                <td style={tdStyle}><VerificationBadge status={r.verification_status} /></td>
                <td style={tdStyle}><OnlineDot online={r.online} /></td>
                <td style={tdStyle}><Text variant="body" numeric color={colors.textPrimary}>{r.matches_count}</Text></td>
                <td style={tdStyle}><Text variant="body" numeric color={colors.textPrimary}>{r.chats_count}</Text></td>
                <td style={tdStyle}>{r.reports_received > 0 ? <Badge tone="danger">{r.reports_received}</Badge> : <Text variant="caption" tone="muted">0</Text>}</td>
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
function UserCardsView({ rows, selected, onToggle, onOpen }: { rows: AdminUserRow[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
      {rows.map((r) => (
        <Card key={r.id} padding={spacing[3]} style={{ background: selected.has(r.id) ? "rgba(10,132,255,0.06)" : undefined }}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} style={{ width: 18, height: 18, cursor: "pointer", flexShrink: 0 }} />
            <div className="flex items-center" style={{ gap: spacing[2], flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpen(r.id)}>
              <Avatar src={r.avatar ?? undefined} size="md" initials={initialsOf(r.full_name, r.phone)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{r.full_name || "Unnamed"}</Text>
                <Text variant="caption" tone="muted" truncate>{r.phone ?? "—"} · {r.college_name ?? "No college"}</Text>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: colors.textMuted, flexShrink: 0 }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center" style={{ gap: spacing[1], marginTop: spacing[2] }}>
            <StatusBadge status={r.account_status} />
            <VerificationBadge status={r.verification_status} />
            <OnlineDot online={r.online} />
            {r.reports_received > 0 && <Badge tone="danger">{r.reports_received} report{r.reports_received === 1 ? "" : "s"}</Badge>}
          </div>
          <div className="flex items-center" style={{ gap: spacing[3], marginTop: spacing[2] }}>
            <Text variant="caption" tone="muted">{r.matches_count} matches</Text>
            <Text variant="caption" tone="muted">{r.chats_count} chats</Text>
            <Text variant="caption" tone="muted">Joined {timeAgo(r.created_at)}</Text>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- bulk confirm
function BulkConfirm({ mode, rows, count, running, onCancel, onConfirm }: { mode: NonNullable<BulkMode>; rows: AdminUserRow[]; count: number; running: boolean; onCancel: () => void; onConfirm: () => void }) {
  const meta: Record<string, { title: string; desc: string; danger?: boolean }> = {
    suspended: { title: "Suspend users", desc: "They will be removed from discovery and cannot match or message. Their account is preserved." },
    banned: { title: "Ban users", desc: "Sessions are terminated, profiles hidden and authentication blocked.", danger: true },
    active: { title: "Restore users", desc: "Accounts return to active and discovery is re-enabled." },
    deleted: { title: "Delete users", desc: "Soft-deletes the accounts and removes them from discovery. Audit logs are preserved.", danger: true },
    verified: { title: "Verify users", desc: "Marks the selected accounts as verified." },
    unverified: { title: "Remove verification", desc: "Marks the selected accounts as unverified." },
    export: { title: "Export users", desc: "Downloads a CSV of the selected users on this page." },
  };
  const m = meta[mode.action];
  return (
    <Card padding={spacing[4]} style={{ marginTop: spacing[3], border: `1px solid ${m.danger ? "rgba(255,59,48,0.24)" : surfaces.border}` }}>
      <Text variant="headingSm" color={colors.textPrimary}>{m.title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{m.desc}</Text>
      <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing[3], fontWeight: 600 }}>{count} user{count === 1 ? "" : "s"} selected</Text>
      <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[2] }}>
        {rows.slice(0, 8).map((r) => (
          <Badge key={r.id} tone="neutral">{r.full_name || r.phone || "User"}</Badge>
        ))}
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
function exportCsv(rows: AdminUserRow[]) {
  const headers = ["id", "full_name", "phone", "gender", "age", "college", "department", "status", "verification", "matches", "chats", "reports", "created_at", "last_login_at"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([r.id, r.full_name, r.phone, r.gender, r.age, r.college_name, r.department_name, r.account_status, r.verification_status, r.matches_count, r.chats_count, r.reports_received, r.created_at, r.last_login_at].map(esc).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coligo-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        borderRadius: radii.pill,
        padding: "8px 14px",
        fontSize: 14,
        fontWeight: 600,
        color: value ? colors.textPrimary : colors.textSecondary,
        background: surfaces.glassSoft,
        border: `1px solid ${surfaces.border}`,
        cursor: "pointer",
      }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

const thStyle: React.CSSProperties = { padding: `${spacing[2]}px ${spacing[3]}px`, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: `${spacing[2]}px ${spacing[3]}px`, verticalAlign: "middle", whiteSpace: "nowrap" };

function pagerStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 16px",
    borderRadius: radii.pill,
    background: surfaces.glassSoft,
    border: `1px solid ${surfaces.border}`,
    color: disabled ? colors.textMuted : colors.textPrimary,
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function ListSkeleton({ bare = false }: { bare?: boolean }) {
  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} padding={spacing[3]}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <Skeleton style={{ width: 40, height: 40, borderRadius: 999 }} />
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
