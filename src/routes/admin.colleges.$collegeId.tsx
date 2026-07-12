// ============================================================================
// /admin/colleges/:collegeId — Admin College detail. Real Supabase data via
// admin-gated server functions. Tabbed: Overview, Statistics, Analytics,
// Departments, Students, Actions. Realtime. Every action logs + confirms
// in-page (never a popup). Non-admins are redirected to /admin/login.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Pencil, PauseCircle, CheckCircle2, Archive, RotateCcw, Trash2,
  ExternalLink, Search as SearchIcon, ChevronRight, ChevronLeft, Plus, Ban,
} from "lucide-react";

import {
  collegeDetailQuery, collegeStatsQuery, collegeTimeseriesQuery, collegeStudentsQuery,
  departmentsQuery, setCollegeStatus, setCollegeDiscovery, deleteCollege,
  upsertDepartment, setDepartmentStatus,
  type DepartmentRow, type CollegeDetail,
} from "@/lib/admin-colleges.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { useAdminCollegesRealtime } from "@/lib/use-admin-colleges-realtime";
import { Text, Badge, Skeleton, Avatar, Button, Chip, TextField, Toggle } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, SearchBar } from "@/components/ds/navigation";
import { AreaTrend, BarSeries, Donut } from "@/components/admin/charts";
import { CollegeStatusBadge, DiscoveryBadge, collegeInitials } from "@/components/admin/college-bits";
import { StatusBadge, VerificationBadge, initialsOf, prettyGender } from "@/components/admin/user-bits";
import { colors, radii, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const STUDENT_PAGE = 20;

const TABS = ["Overview", "Statistics", "Analytics", "Departments", "Students", "Actions"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/colleges/$collegeId")({
  head: () => ({
    meta: [
      { title: "College detail — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DetailGuard,
});

function DetailGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}><Skeleton style={{ height: 260 }} /></div>;
  if (isError) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 420, padding: spacing[6] }}>
        <Text variant="headingSm" color={colors.textPrimary}>Couldn't reach the server</Text>
        <div style={{ marginTop: spacing[4] }}><Button variant="primary" onClick={() => refetch()}>Retry</Button></div>
      </div>
    );
  }
  if (!allowed) return null;
  return <CollegeDetail />;
}

function CollegeDetail() {
  const navigate = useNavigate();
  const { collegeId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("Overview");
  useAdminCollegesRealtime(true);

  const detail = useQuery(collegeDetailQuery(collegeId));

  if (detail.isLoading) {
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}><Skeleton style={{ height: 260 }} /></div>;
  }
  if (detail.isError || detail.data === null || detail.data === undefined) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4] }}>
        <TopBar title="College" onBack={() => navigate({ to: "/admin/colleges" })} />
        <EmptyStateCard icon={<Ban style={{ width: 26, height: 26 }} />} title="College not found" description="This college may have been removed." action={<Button variant="primary" onClick={() => navigate({ to: "/admin/colleges" })}>Back to colleges</Button>} />
      </div>
    );
  }

  const c = detail.data;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: spacing[4], paddingBottom: spacing[9] }}>
      <TopBar
        title={c.name}
        onBack={() => navigate({ to: "/admin/colleges" })}
        trailing={
          <button onClick={() => navigate({ to: "/admin/colleges/$collegeId/edit", params: { collegeId } })} aria-label="Edit" style={{ display: "flex", padding: 8, color: colors.primary, background: "transparent", border: "none", cursor: "pointer" }}>
            <Pencil style={{ width: 18, height: 18 }} />
          </button>
        }
      />

      {/* Header card */}
      <Card padding={0} style={{ overflow: "hidden", marginTop: spacing[4] }}>
        <div style={{ height: 120, background: c.banner_url ? `center/cover no-repeat url(${c.banner_url})` : surfaces.glassSoft }} />
        <div style={{ padding: spacing[4] }}>
          <div className="flex items-center" style={{ gap: spacing[3], marginTop: -48 }}>
            <Avatar src={c.logo_url ?? undefined} size="lg" initials={collegeInitials(c.name)} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 40 }}>
              <div className="flex flex-wrap items-center" style={{ gap: spacing[1] }}>
                <CollegeStatusBadge status={c.status} />
                <DiscoveryBadge enabled={c.discovery_enabled} />
              </div>
            </div>
          </div>
          <Text variant="headingMd" color={colors.textPrimary} style={{ marginTop: spacing[2] }}>{c.name}</Text>
          <Text variant="caption" tone="muted">{c.code ? `${c.code} · ` : ""}{[c.city, c.state, c.country].filter(Boolean).join(", ") || "No location"}</Text>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap" style={{ gap: spacing[1], marginTop: spacing[3] }}>
        {TABS.map((t) => (
          <Chip key={t} selected={tab === t} onClick={() => setTab(t)}>{t}</Chip>
        ))}
      </div>

      <div style={{ marginTop: spacing[4] }}>
        {tab === "Overview" && <OverviewTab c={c} />}
        {tab === "Statistics" && <StatisticsTab collegeId={collegeId} />}
        {tab === "Analytics" && <AnalyticsTab collegeId={collegeId} />}
        {tab === "Departments" && <DepartmentsTab collegeId={collegeId} />}
        {tab === "Students" && <StudentsTab collegeId={collegeId} />}
        {tab === "Actions" && <ActionsTab collegeId={collegeId} status={c.status} discovery={c.discovery_enabled} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Overview
function OverviewTab({ c }: { c: CollegeDetail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>About</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing[2] }}>{c.description || "No description provided."}</Text>
        {c.website && (
          <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center" style={{ gap: 6, marginTop: spacing[3], color: colors.primary, fontWeight: 600, fontSize: 14 }}>
            <ExternalLink style={{ width: 15, height: 15 }} /> Visit website
          </a>
        )}
      </Card>
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>Information</Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: spacing[3], marginTop: spacing[3] }}>
          <Info label="Code" value={c.code ?? "—"} />
          <Info label="Short name" value={c.short_name ?? "—"} />
          <Info label="City" value={c.city ?? "—"} />
          <Info label="District" value={c.district ?? "—"} />
          <Info label="State" value={c.state ?? "—"} />
          <Info label="Country" value={c.country ?? "—"} />
          <Info label="Created" value={new Date(c.created_at).toLocaleDateString()} />
          <Info label="Updated" value={new Date(c.updated_at).toLocaleDateString()} />
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>{value}</Text>
    </div>
  );
}

// ---------------------------------------------------------------- Statistics
function StatisticsTab({ collegeId }: { collegeId: string }) {
  const stats = useQuery(collegeStatsQuery(collegeId));
  const ts = useQuery(collegeTimeseriesQuery(collegeId, 30));

  if (stats.isLoading) return <Skeleton style={{ height: 220 }} />;
  if (!stats.data) return <EmptyStateCard icon={<Ban style={{ width: 24, height: 24 }} />} title="No statistics" description="Statistics are unavailable." />;
  const s = stats.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: spacing[2] }}>
        <StatCard label="Total students" value={s.totalStudents.toLocaleString()} />
        <StatCard label="Active (24h)" value={s.activeStudents.toLocaleString()} />
        <StatCard label="Online now" value={s.onlineStudents.toLocaleString()} />
        <StatCard label="Verified" value={s.verified.toLocaleString()} />
        <StatCard label="Departments" value={s.departments.toLocaleString()} />
        <StatCard label="Matches" value={s.matches.toLocaleString()} />
        <StatCard label="Messages" value={s.messages.toLocaleString()} />
        <StatCard label="Swipes" value={s.swipes.toLocaleString()} />
        <StatCard label="Likes" value={s.likes.toLocaleString()} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing[3] }}>
        <Donut title="Gender split" data={[{ name: "Men", value: s.maleStudents }, { name: "Women", value: s.femaleStudents }]} />
        <AreaTrend title="Registrations (30d)" data={ts.data ?? []} xKey="day" series={[{ key: "registrations", label: "Registrations" }, { key: "activeUsers", label: "Active" }]} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Analytics
function AnalyticsTab({ collegeId }: { collegeId: string }) {
  const stats = useQuery(collegeStatsQuery(collegeId));
  const ts = useQuery(collegeTimeseriesQuery(collegeId, 30));
  if (stats.isLoading) return <Skeleton style={{ height: 220 }} />;
  const s = stats.data;
  const depts = (s?.departmentBreakdown ?? []).map((d) => ({ name: d.name, count: d.count }));
  const grads = (s?.gradYears ?? []).map((g) => ({ name: String(g.year), count: g.count }));

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing[3] }}>
      <AreaTrend title="Growth (30d)" data={ts.data ?? []} xKey="day" series={[{ key: "registrations", label: "Registrations" }]} />
      {depts.length > 0 ? <BarSeries title="Departments" data={depts} xKey="name" dataKey="count" /> : <EmptyStateCard icon={<Ban style={{ width: 22, height: 22 }} />} title="No department data" />}
      {grads.length > 0 ? <BarSeries title="Graduation years" data={grads} xKey="name" dataKey="count" color={colors.info} /> : <EmptyStateCard icon={<Ban style={{ width: 22, height: 22 }} />} title="No graduation data" />}
    </div>
  );
}

// --------------------------------------------------------------- Departments
function DepartmentsTab({ collegeId }: { collegeId: string }) {
  const qc = useQueryClient();
  const depts = useQuery(departmentsQuery(collegeId));
  const upsert = useServerFn(upsertDepartment);
  const setStatus = useServerFn(setDepartmentStatus);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "college", collegeId, "departments"] });

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      await upsert({ data: { name: name.trim(), collegeId } });
      setName("");
      refresh();
      haptic("light");
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to add department"); }
    finally { setBusy(false); }
  };

  const rename = async () => {
    if (!editing || !editing.name.trim()) return;
    setBusy(true); setErr(null);
    try {
      await upsert({ data: { id: editing.id, name: editing.name.trim(), collegeId } });
      setEditing(null);
      refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to rename"); }
    finally { setBusy(false); }
  };

  const toggle = async (d: DepartmentRow) => {
    try { await setStatus({ data: { id: d.id, active: !d.is_active } }); refresh(); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Card padding={spacing[4]}>
        <Text variant="headingSm" color={colors.textPrimary}>Add department</Text>
        <div className="flex items-end" style={{ gap: spacing[2], marginTop: spacing[3] }}>
          <div style={{ flex: 1 }}>
            <TextField label="Department name" value={name} error={err ?? undefined} onChange={(e) => setName(e.target.value)} placeholder="Computer Science & Engineering" onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          </div>
          <Button variant="primary" loading={busy} leftIcon={<Plus style={{ width: 15, height: 15 }} />} onClick={add}>Add</Button>
        </div>
      </Card>

      {depts.isLoading ? (
        <Skeleton style={{ height: 160 }} />
      ) : (depts.data ?? []).length === 0 ? (
        <EmptyStateCard icon={<Ban style={{ width: 22, height: 22 }} />} title="No departments" description="Add a department to make it available for this college's students." />
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          {(depts.data ?? []).map((d, i) => (
            <div key={d.id} className="flex items-center" style={{ gap: spacing[2], padding: spacing[3], borderTop: i ? `1px solid ${surfaces.borderSoft}` : undefined }}>
              {editing?.id === d.id ? (
                <>
                  <input value={editing.name} onChange={(e) => setEditing({ id: d.id, name: e.target.value })} autoFocus
                    style={{ flex: 1, borderRadius: radii.sm, padding: "8px 12px", fontSize: 14, color: "#fff", background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`, outline: "none" }} />
                  <Button size="sm" variant="primary" loading={busy} onClick={rename}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{d.name}</Text>
                    <Text variant="caption" tone="muted">{d.member_count} student{d.member_count === 1 ? "" : "s"}{d.college_id ? "" : " · global"}</Text>
                  </div>
                  {!d.is_active && <Badge tone="warning">Disabled</Badge>}
                  <button onClick={() => setEditing({ id: d.id, name: d.name })} aria-label="Rename" style={iconBtn}><Pencil style={{ width: 15, height: 15 }} /></button>
                  <Toggle checked={d.is_active} onChange={() => toggle(d)} />
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- Students
function StudentsTab({ collegeId }: { collegeId: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { const id = setTimeout(() => { setDebounced(term); setPage(1); }, 300); return () => clearTimeout(id); }, [term]);

  const q = useQuery(collegeStudentsQuery(collegeId, debounced, STUDENT_PAGE, (page - 1) * STUDENT_PAGE));
  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / STUDENT_PAGE));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <SearchBar value={term} onChange={setTerm} placeholder="Search students by name" icon={<SearchIcon style={{ width: 18, height: 18 }} />} />
      <Text variant="caption" tone="muted">{q.isLoading ? "Loading…" : `${total.toLocaleString()} student${total === 1 ? "" : "s"}`}</Text>

      {q.isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : rows.length === 0 ? (
        <EmptyStateCard icon={<Ban style={{ width: 22, height: 22 }} />} title="No students" description="No enrolled students match your search." />
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center" style={{ gap: spacing[2], padding: spacing[3], borderTop: i ? `1px solid ${surfaces.borderSoft}` : undefined, cursor: "pointer" }}
              onClick={() => navigate({ to: "/admin/users/$userId", params: { userId: r.id } })}>
              <Avatar src={r.avatar ?? undefined} size="sm" initials={initialsOf(r.full_name, null)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" color={colors.textPrimary} truncate style={{ fontWeight: 600 }}>{r.full_name || "Unnamed"}</Text>
                <Text variant="caption" tone="muted" truncate>{[prettyGender(r.gender), r.age ? `${r.age}` : null, r.department_name].filter(Boolean).join(" · ") || "—"}</Text>
              </div>
              <StatusBadge status={r.account_status} />
              <VerificationBadge status={r.verification_status} />
              <ChevronRight style={{ width: 16, height: 16, color: colors.textMuted }} />
            </div>
          ))}
        </Card>
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-center" style={{ gap: spacing[3] }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pagerStyle(page <= 1)}><ChevronLeft style={{ width: 16, height: 16 }} /> Prev</button>
          <Text variant="caption" tone="muted">Page {page} of {totalPages}</Text>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pagerStyle(page >= totalPages)}>Next <ChevronRight style={{ width: 16, height: 16 }} /></button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- Actions
type Confirm =
  | { kind: "status"; action: "active" | "disabled" | "archived" }
  | { kind: "delete" }
  | null;

function ActionsTab({ collegeId, status, discovery }: { collegeId: string; status: string; discovery: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setCollegeStatus);
  const setDiscoveryFn = useServerFn(setCollegeDiscovery);
  const deleteFn = useServerFn(deleteCollege);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [discoveryOn, setDiscoveryOn] = useState(discovery);

  useEffect(() => setDiscoveryOn(discovery), [discovery]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "college", collegeId] });
    qc.invalidateQueries({ queryKey: ["admin", "colleges"] });
  };

  const run = async () => {
    if (!confirm) return;
    setBusy(true); setErr(null);
    try {
      if (confirm.kind === "status") {
        await setStatusFn({ data: { collegeId, status: confirm.action } });
        refresh();
        setConfirm(null);
      } else {
        await deleteFn({ data: { collegeId } });
        haptic("light");
        navigate({ to: "/admin/colleges" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleDiscovery = async (v: boolean) => {
    setDiscoveryOn(v);
    try { await setDiscoveryFn({ data: { collegeId, enabled: v } }); refresh(); }
    catch { setDiscoveryOn(!v); }
  };

  const confirmMeta: Record<string, { title: string; desc: string; danger?: boolean; cta: string }> = {
    active: { title: "Enable college", desc: "The college becomes active and visible to students in onboarding and discovery.", cta: "Enable" },
    disabled: { title: "Disable college", desc: "The college is hidden from students. Existing data is preserved.", cta: "Disable" },
    archived: { title: "Archive college", desc: "The college is archived and removed from all student-facing surfaces.", danger: true, cta: "Archive" },
    delete: { title: "Delete college", desc: "Soft-deletes the college (archives it). Blocked if active students are still enrolled. Audit logs are preserved.", danger: true, cta: "Delete" },
  };
  const meta = confirm ? confirmMeta[confirm.kind === "delete" ? "delete" : confirm.action] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
      {err && (
        <Card padding={spacing[3]} style={{ border: `1px solid ${colors.danger}` }}>
          <Text variant="body" color={colors.danger}>{err}</Text>
        </Card>
      )}

      {confirm && meta ? (
        <Card padding={spacing[4]} style={{ border: `1px solid ${meta.danger ? "rgba(255,59,48,0.24)" : surfaces.border}` }}>
          <Text variant="headingSm" color={colors.textPrimary}>{meta.title}</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing[1] }}>{meta.desc}</Text>
          <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[4] }}>
            <Button variant={meta.danger ? "danger" : "primary"} loading={busy} onClick={run}>{meta.cta}</Button>
            <Button variant="ghost" onClick={() => { setConfirm(null); setErr(null); }} disabled={busy}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card padding={spacing[4]}>
            <div className="flex items-center justify-between" style={{ gap: spacing[3] }}>
              <div>
                <Text variant="body" color={colors.textPrimary} style={{ fontWeight: 600 }}>Discovery</Text>
                <Text variant="caption" tone="muted">Show this college's students in discovery.</Text>
              </div>
              <Toggle checked={discoveryOn} onChange={toggleDiscovery} />
            </div>
          </Card>

          <Card padding={spacing[4]}>
            <Text variant="headingSm" color={colors.textPrimary}>Manage</Text>
            <div className="flex flex-wrap" style={{ gap: spacing[2], marginTop: spacing[3] }}>
              <Button variant="secondary" leftIcon={<Pencil style={ICSM} />} onClick={() => navigate({ to: "/admin/colleges/$collegeId/edit", params: { collegeId } })}>Edit</Button>
              {status !== "active" && <Button variant="secondary" leftIcon={<CheckCircle2 style={ICSM} />} onClick={() => setConfirm({ kind: "status", action: "active" })}>Enable</Button>}
              {status !== "disabled" && <Button variant="secondary" leftIcon={<PauseCircle style={ICSM} />} onClick={() => setConfirm({ kind: "status", action: "disabled" })}>Disable</Button>}
              {status !== "archived" && <Button variant="secondary" leftIcon={<Archive style={ICSM} />} onClick={() => setConfirm({ kind: "status", action: "archived" })}>Archive</Button>}
              {status === "archived" && <Button variant="secondary" leftIcon={<RotateCcw style={ICSM} />} onClick={() => setConfirm({ kind: "status", action: "active" })}>Restore</Button>}
            </div>
          </Card>

          <Card padding={spacing[4]} style={{ border: `1px solid rgba(255,59,48,0.2)` }}>
            <Text variant="headingSm" color={colors.textPrimary}>Danger zone</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 2, display: "block" }}>Soft-delete this college. Blocked while active students are enrolled.</Text>
            <div style={{ marginTop: spacing[3] }}>
              <Button variant="danger" leftIcon={<Trash2 style={ICSM} />} onClick={() => setConfirm({ kind: "delete" })}>Delete college</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const ICSM: React.CSSProperties = { width: 15, height: 15 };
const iconBtn: React.CSSProperties = { display: "flex", padding: 6, color: colors.textSecondary, background: "transparent", border: "none", cursor: "pointer" };

function pagerStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: radii.pill,
    background: surfaces.glassSoft, border: `1px solid ${surfaces.border}`,
    color: disabled ? colors.textMuted : colors.textPrimary, fontWeight: 600, fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}
