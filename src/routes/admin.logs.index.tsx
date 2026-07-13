// ============================================================================
// /admin/logs — Coligo audit, monitoring & forensic-investigation platform.
// Normalizes every real audit source (admin actions, moderation, chat/match
// moderation, settings changes, client errors, admin logins, system activity,
// device sessions) into one searchable, filterable, exportable stream through
// admin-gated server functions. Filters/sort/paging persist in the URL and
// every widget updates live via Supabase Realtime. Non-admins are redirected
// to /admin/login. Log categories with no backing emitter yet render honest
// empty states rather than fabricated events.
// ============================================================================
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  ShieldAlert,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  LogIn,
  LogOut,
  UserCog,
  Gavel,
  Radio,
  Filter as FilterIcon,
  CalendarDays,
  Download,
  Search as SearchIcon,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Fingerprint,
} from "lucide-react";

import {
  logsListQuery,
  logsKpisQuery,
  logsTimeseriesQuery,
  logsDistributionQuery,
  logDetailQuery,
  logInvestigationQuery,
  type LogFilters,
  type LogRow,
  type LogSort,
  type LogCategory,
  type LogSeverity,
} from "@/lib/admin-logs.functions";
import { adminGuardQuery } from "@/lib/admin.functions";
import { useAdminLogsRealtime } from "@/lib/use-admin-logs-realtime";
import {
  DATE_PRESETS,
  rangeForPreset,
  fmt,
  fmtRangeLabel,
  exportCSV,
  exportXLSX,
  type DatePresetKey,
} from "@/components/admin/analytics-bits";
import { Text, Button, Chip, Skeleton, Badge } from "@/components/ds/glass";
import { Card, StatCard, EmptyStateCard } from "@/components/ds/card";
import { TopBar, BottomSheet } from "@/components/ds/navigation";
import { AreaTrend, Donut } from "@/components/admin/charts";
import { colors, spacing, surfaces } from "@/lib/ds";
import { haptic } from "@/lib/haptics";

const I = { width: 16, height: 16 } as const;

const CATEGORIES: { key: LogCategory; label: string }[] = [
  { key: "auth", label: "Authentication" },
  { key: "user", label: "User" },
  { key: "admin", label: "Admin" },
  { key: "moderation", label: "Moderation" },
  { key: "security", label: "Security" },
  { key: "system", label: "System" },
  { key: "database", label: "Database" },
  { key: "api", label: "API" },
  { key: "storage", label: "Storage" },
  { key: "realtime", label: "Realtime" },
];

const SEVERITIES: LogSeverity[] = ["info", "warning", "error", "critical"];

const SORTS: { key: LogSort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "severity_high", label: "Highest severity" },
  { key: "severity_low", label: "Lowest severity" },
];

const PAGE_SIZES = [50, 100, 200];

function sevTone(s: LogSeverity): "neutral" | "warning" | "danger" {
  if (s === "critical" || s === "error") return "danger";
  if (s === "warning") return "warning";
  return "neutral";
}

type Search = {
  preset?: DatePresetKey;
  from?: string;
  to?: string;
  q?: string;
  cats?: string;
  sevs?: string;
  status?: string;
  sort?: LogSort;
  page?: number;
  size?: number;
  sel?: string;
};

export const Route = createFileRoute("/admin/logs/")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Coligo admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    preset: typeof s.preset === "string" ? (s.preset as DatePresetKey) : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    cats: typeof s.cats === "string" ? s.cats : undefined,
    sevs: typeof s.sevs === "string" ? s.sevs : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    sort: typeof s.sort === "string" ? (s.sort as LogSort) : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 0 : undefined,
    size: typeof s.size === "number" ? s.size : typeof s.size === "string" ? Number(s.size) || undefined : undefined,
    sel: typeof s.sel === "string" ? s.sel : undefined,
  }),
  component: LogsGuard,
});

function LogsGuard() {
  const navigate = useNavigate();
  const { data: allowed, isLoading, isError, refetch } = useQuery(adminGuardQuery());
  useEffect(() => {
    if (!isLoading && allowed === false) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, allowed, navigate]);

  if (isLoading) return <PageSkeleton />;
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
  return <Logs />;
}

function PageSkeleton() {
  return (
    <div style={{ padding: spacing[3], display: "flex", flexDirection: "column", gap: spacing[3] }}>
      <Skeleton style={{ height: 48, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />
        ))}
      </div>
      <Skeleton style={{ height: 320, borderRadius: 16 }} />
    </div>
  );
}

const grid = (min = 150): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: spacing[2],
});

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
      <div className="flex items-center" style={{ gap: spacing[2] }}>
        <span style={{ color: colors.primary }}>{icon}</span>
        <Text variant="headingSm" color={colors.textPrimary}>{title}</Text>
      </div>
      {sub ? <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{sub}</Text> : null}
    </div>
  );
}

function parseList(v?: string): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function Logs() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  useAdminLogsRealtime(true);

  const preset: DatePresetKey = search.preset ?? "7d";
  const range = useMemo(
    () => rangeForPreset(preset, { from: search.from, to: search.to }),
    [preset, search.from, search.to],
  );
  const spanDays = (new Date(range.end).getTime() - new Date(range.start).getTime()) / 864e5;
  const bucket: "day" | "hour" = spanDays <= 2 ? "hour" : "day";

  const cats = useMemo(() => parseList(search.cats) as LogCategory[], [search.cats]);
  const sevs = useMemo(() => parseList(search.sevs) as LogSeverity[], [search.sevs]);
  const sort: LogSort = search.sort ?? "newest";
  const page = Math.max(0, search.page ?? 0);
  const pageSize = PAGE_SIZES.includes(search.size ?? 50) ? (search.size as number) : 50;

  const filters: LogFilters = useMemo(
    () => ({
      start: range.start,
      end: range.end,
      q: search.q || undefined,
      categories: cats.length ? cats : undefined,
      severities: sevs.length ? sevs : undefined,
      status: search.status || undefined,
    }),
    [range, search.q, cats, sevs, search.status],
  );

  const setSearch = (patch: Partial<Search>) =>
    navigate({ to: "/admin/logs", search: (p: Search) => ({ ...p, ...patch }), replace: true });

  // debounced search box
  const [qInput, setQInput] = useState(search.q ?? "");
  useEffect(() => setQInput(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((qInput || undefined) !== (search.q || undefined)) setSearch({ q: qInput || undefined, page: 0 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  // ---- data ----
  const kpis = useQuery(logsKpisQuery(range.start, range.end));
  const list = useQuery(logsListQuery(filters, sort, page, pageSize));
  const tsAll = useQuery(logsTimeseriesQuery(range.start, range.end, "all", bucket));
  const tsErrors = useQuery(logsTimeseriesQuery(range.start, range.end, "errors", bucket));
  const tsAuth = useQuery(logsTimeseriesQuery(range.start, range.end, "auth", bucket));
  const tsMod = useQuery(logsTimeseriesQuery(range.start, range.end, "moderation", bucket));
  const distCategory = useQuery(logsDistributionQuery(range.start, range.end, "category"));
  const distSeverity = useQuery(logsDistributionQuery(range.start, range.end, "severity"));
  const distSource = useQuery(logsDistributionQuery(range.start, range.end, "source"));

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const k = kpis.data;

  const toggleCat = (c: LogCategory) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    setSearch({ cats: next.join(",") || undefined, page: 0 });
  };
  const toggleSev = (s: LogSeverity) => {
    const next = sevs.includes(s) ? sevs.filter((x) => x !== s) : [...sevs, s];
    setSearch({ sevs: next.join(",") || undefined, page: 0 });
  };

  const clearFilters = () =>
    setSearch({ q: undefined, cats: undefined, sevs: undefined, status: undefined, page: 0 });

  const activeFilterCount =
    (search.q ? 1 : 0) + cats.length + sevs.length + (search.status ? 1 : 0);

  const handleExport = async (kind: "csv" | "xlsx" | "json") => {
    haptic("light");
    if (rows.length === 0) return;
    const flat = rows.map((r) => ({
      log_id: r.log_id,
      timestamp: r.created_at,
      category: r.category,
      severity: r.severity,
      event: r.event,
      description: r.description ?? "",
      user: r.user_name ?? r.user_id ?? "",
      admin: r.admin_name ?? r.admin_id ?? "",
      ip: r.ip ?? "",
      device: r.device ?? "",
      module: r.module ?? "",
      status: r.status ?? "",
      request_id: r.request_id ?? "",
      related: r.related_entity_type ? `${r.related_entity_type}:${r.related_entity_id ?? ""}` : "",
      metadata: JSON.stringify(r.metadata ?? {}),
    }));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (kind === "csv") exportCSV(`coligo-logs-${stamp}.csv`, flat);
    else if (kind === "xlsx") await exportXLSX(`coligo-logs-${stamp}.xlsx`, [{ name: "Logs", rows: flat }]);
    else {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coligo-logs-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <div style={{ padding: spacing[3], paddingBottom: spacing[9], maxWidth: 1200, margin: "0 auto" }}>
      <TopBar
        title="Audit Logs"
        onBack={() => navigate({ to: "/admin/dashboard" })}
        trailing={<div style={{ color: colors.primary }}><ScrollText style={I} /></div>}
      />

      {/* Date presets */}
      <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[3], flexWrap: "wrap" }}>
        <CalendarDays style={{ width: 16, height: 16, color: colors.textMuted }} />
        {DATE_PRESETS.map((p) => (
          <Chip key={p.key} selected={preset === p.key} onClick={() => setSearch({ preset: p.key, page: 0 })}>
            {p.label}
          </Chip>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[2], flexWrap: "wrap" }}>
          <input type="date" value={search.from ?? ""} onChange={(e) => setSearch({ from: e.target.value, page: 0 })} style={dateInputStyle} />
          <span style={{ color: colors.textMuted }}>→</span>
          <input type="date" value={search.to ?? ""} onChange={(e) => setSearch({ to: e.target.value, page: 0 })} style={dateInputStyle} />
        </div>
      ) : null}
      <Text variant="caption" tone="muted" style={{ marginTop: spacing[1], display: "block" }}>
        {fmtRangeLabel(range)}
      </Text>

      {/* KPIs */}
      <SectionTitle icon={<Activity style={I} />} title="Overview" sub="Live counts for the selected range." />
      {kpis.isLoading ? (
        <div style={grid()}>
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} style={{ height: 92, borderRadius: 16 }} />)}
        </div>
      ) : kpis.isError ? (
        <ErrorCard onRetry={() => kpis.refetch()} />
      ) : k ? (
        <div style={grid()}>
          <StatCard label="Total logs" value={fmt(k.total)} icon={<ScrollText style={I} />} />
          <StatCard label="Logs today" value={fmt(k.today)} icon={<Activity style={I} />} />
          <StatCard label="Errors today" value={fmt(k.errorsToday)} icon={<AlertTriangle style={I} />} />
          <StatCard label="Critical" value={fmt(k.critical)} icon={<AlertOctagon style={I} />} />
          <StatCard label="Security events" value={fmt(k.securityEvents)} icon={<ShieldAlert style={I} />} />
          <StatCard label="Failed logins" value={fmt(k.failedLogins)} icon={<LogOut style={I} />} />
          <StatCard label="Successful logins" value={fmt(k.successfulLogins)} icon={<LogIn style={I} />} />
          <StatCard label="Admin actions" value={fmt(k.adminActions)} icon={<UserCog style={I} />} />
          <StatCard label="Moderation actions" value={fmt(k.moderationActions)} icon={<Gavel style={I} />} />
          <StatCard label="API errors" value={fmt(k.apiErrors)} icon={<AlertTriangle style={I} />} />
          <StatCard label="Storage errors" value={fmt(k.storageErrors)} icon={<AlertTriangle style={I} />} />
          <StatCard label="Realtime errors" value={fmt(k.realtimeErrors)} icon={<Radio style={I} />} />
          <StatCard label="Active sessions" value={fmt(k.activeSessions)} icon={<ShieldCheck style={I} />} />
          <StatCard label="Suspicious" value={fmt(k.suspicious)} icon={<ShieldAlert style={I} />} />
        </div>
      ) : null}

      {/* Filters */}
      <Card style={{ marginTop: spacing[3] }} padding={spacing[3]}>
        <div className="flex items-center justify-between" style={{ gap: spacing[2], marginBottom: spacing[2] }}>
          <div className="flex items-center" style={{ gap: spacing[2] }}>
            <FilterIcon style={{ width: 14, height: 14, color: colors.textMuted }} />
            <Text variant="overline" tone="muted">Filters</Text>
            {activeFilterCount > 0 ? <Badge tone="primary">{activeFilterCount}</Badge> : null}
          </div>
          {activeFilterCount > 0 ? (
            <button onClick={clearFilters} style={linkBtn}>
              <X style={{ width: 12, height: 12 }} /> Clear
            </button>
          ) : null}
        </div>

        {/* search */}
        <label className="flex items-center" style={searchBox}>
          <SearchIcon style={{ width: 16, height: 16, color: colors.textMuted }} />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search event, IP, request ID, user, metadata…"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 14, color: colors.textPrimary }}
          />
          {qInput ? <button onClick={() => setQInput("")} style={{ display: "flex", color: colors.textMuted }}><X style={{ width: 14, height: 14 }} /></button> : null}
        </label>

        {/* severity */}
        <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[3], marginBottom: spacing[1] }}>Severity</Text>
        <div className="flex items-center" style={{ gap: spacing[1], flexWrap: "wrap" }}>
          {SEVERITIES.map((s) => (
            <Chip key={s} selected={sevs.includes(s)} onClick={() => toggleSev(s)}>{s}</Chip>
          ))}
        </div>

        {/* category */}
        <Text variant="caption" tone="muted" style={{ display: "block", marginTop: spacing[3], marginBottom: spacing[1] }}>Category</Text>
        <div className="flex items-center" style={{ gap: spacing[1], flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.key} selected={cats.includes(c.key)} onClick={() => toggleCat(c.key)}>{c.label}</Chip>
          ))}
        </div>

        {/* sort + page size + export */}
        <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[3], flexWrap: "wrap" }}>
          <label className="flex items-center" style={{ gap: 6 }}>
            <ArrowUpDown style={{ width: 14, height: 14, color: colors.textMuted }} />
            <select value={sort} onChange={(e) => setSearch({ sort: e.target.value as LogSort, page: 0 })} style={selectStyle}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <select value={pageSize} onChange={(e) => setSearch({ size: Number(e.target.value), page: 0 })} style={selectStyle}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <span style={{ flex: 1 }} />
          <Button variant="secondary" onClick={() => handleExport("csv")}><Download style={{ width: 14, height: 14, marginRight: 6 }} /> CSV</Button>
          <Button variant="secondary" onClick={() => handleExport("xlsx")}><Download style={{ width: 14, height: 14, marginRight: 6 }} /> XLSX</Button>
          <Button variant="secondary" onClick={() => handleExport("json")}><Download style={{ width: 14, height: 14, marginRight: 6 }} /> JSON</Button>
        </div>
      </Card>

      {/* Logs list */}
      <SectionTitle
        icon={<ScrollText style={I} />}
        title="Log stream"
        sub={list.isLoading ? "Loading…" : `${fmt(total)} entries · page ${page + 1} of ${totalPages}`}
      />
      {list.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} style={{ height: 76, borderRadius: 14 }} />)}
        </div>
      ) : list.isError ? (
        <ErrorCard onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyStateCard
          title="No logs match your filters"
          description="Try widening the date range or clearing filters."
          action={activeFilterCount > 0 ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
          {rows.map((r) => (
            <LogRowCard key={r.log_id} row={r} onOpen={() => setSearch({ sel: r.log_id })} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {rows.length > 0 ? (
        <div className="flex items-center justify-between" style={{ marginTop: spacing[3], gap: spacing[2] }}>
          <Button variant="secondary" disabled={page <= 0} onClick={() => setSearch({ page: page - 1 })}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </Button>
          <Text variant="caption" tone="muted">Page {page + 1} / {totalPages}</Text>
          <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setSearch({ page: page + 1 })}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </Button>
        </div>
      ) : null}

      {/* Analytics */}
      <SectionTitle icon={<Activity style={I} />} title="Analytics" sub={`Bucketed by ${bucket}.`} />
      <div style={grid(280)}>
        <ChartSlot q={tsAll}>
          <AreaTrend title="All logs" data={(tsAll.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Logs" }]} />
        </ChartSlot>
        <ChartSlot q={tsErrors}>
          <AreaTrend title="Errors" data={(tsErrors.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Errors", color: "#ff375f" }]} />
        </ChartSlot>
        <ChartSlot q={tsAuth}>
          <AreaTrend title="Auth activity" data={(tsAuth.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Auth", color: "#5e5ce6" }]} />
        </ChartSlot>
        <ChartSlot q={tsMod}>
          <AreaTrend title="Moderation activity" data={(tsMod.data ?? []) as never[]} xKey="bucket" series={[{ key: "value", label: "Moderation", color: "#ff9f0a" }]} />
        </ChartSlot>
      </div>
      <div style={{ ...grid(280), marginTop: spacing[2] }}>
        <ChartSlot q={distCategory}><Donut title="By category" data={distCategory.data ?? []} /></ChartSlot>
        <ChartSlot q={distSeverity}><Donut title="By severity" data={distSeverity.data ?? []} /></ChartSlot>
        <ChartSlot q={distSource}><Donut title="By source" data={distSource.data ?? []} /></ChartSlot>
      </div>

      {/* Detail sheet */}
      <LogDetailSheet
        selected={search.sel}
        onClose={() => setSearch({ sel: undefined })}
        onNavigate={(to, params) => navigate({ to, params } as never)}
      />
    </div>
  );
}

// ------------------------------------------------------------- row card
function catIcon(c: LogCategory) {
  switch (c) {
    case "security": return <ShieldAlert style={I} />;
    case "moderation": return <Gavel style={I} />;
    case "admin": return <UserCog style={I} />;
    case "auth": return <LogIn style={I} />;
    case "realtime": return <Radio style={I} />;
    case "system": return <Activity style={I} />;
    default: return <ScrollText style={I} />;
  }
}

function LogRowCard({ row, onOpen }: { row: LogRow; onOpen: () => void }) {
  const t = sevTone(row.severity);
  const accent = t === "danger" ? colors.danger : t === "warning" ? colors.warning : colors.textMuted;
  return (
    <button onClick={onOpen} style={{ textAlign: "left", width: "100%" }}>
      <Card padding={spacing[3]} style={{ borderLeft: `3px solid ${accent}` }}>
        <div className="flex items-start justify-between" style={{ gap: spacing[2] }}>
          <div className="flex items-start" style={{ gap: spacing[2], minWidth: 0 }}>
            <span style={{ color: accent, display: "flex", marginTop: 2 }}>{catIcon(row.category)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center" style={{ gap: spacing[1], flexWrap: "wrap" }}>
                <Text variant="bodySm" color={colors.textPrimary} style={{ fontWeight: 600 }}>{row.event}</Text>
                <Badge tone={t}>{row.severity}</Badge>
                <Badge tone="neutral">{row.category}</Badge>
              </div>
              {row.description ? (
                <Text variant="caption" tone="secondary" style={{ marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {row.description}
                </Text>
              ) : null}
              <div className="flex items-center" style={{ gap: spacing[2], marginTop: 4, flexWrap: "wrap" }}>
                {row.admin_name || row.admin_id ? <Meta label="admin" value={row.admin_name ?? short(row.admin_id)} /> : null}
                {row.user_name || row.user_id ? <Meta label="user" value={row.user_name ?? short(row.user_id)} /> : null}
                {row.ip ? <Meta label="ip" value={row.ip} /> : null}
                {row.module ? <Meta label="module" value={row.module} /> : null}
                {row.status ? <Meta label="status" value={row.status} /> : null}
              </div>
            </div>
          </div>
          <Text variant="caption" tone="muted" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            {new Date(row.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
        </div>
      </Card>
    </button>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <span style={{ fontSize: 11, color: colors.textMuted }}>
      <span style={{ opacity: 0.7 }}>{label}:</span>{" "}
      <span style={{ color: colors.textSecondary }}>{value}</span>
    </span>
  );
}

function short(id?: string | null) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

// ------------------------------------------------------------- detail sheet
function LogDetailSheet({
  selected,
  onClose,
  onNavigate,
}: {
  selected?: string;
  onClose: () => void;
  onNavigate: (to: string, params: Record<string, string>) => void;
}) {
  const [source, rowId] = (selected ?? "").split(/:(.+)/);
  const detail = useQuery(logDetailQuery(source ?? "", rowId ?? "", Boolean(selected)));
  const [inv, setInv] = useState<{ type: string; value: string } | null>(null);
  const investigation = useQuery(logInvestigationQuery(inv?.type ?? "", inv?.value ?? "", Boolean(inv)));

  useEffect(() => { if (!selected) setInv(null); }, [selected]);

  const r = detail.data;

  const related: { label: string; run: () => void }[] = [];
  if (r) {
    if (r.user_id) related.push({ label: "User events", run: () => setInv({ type: "user", value: r.user_id! }) });
    if (r.admin_id) related.push({ label: "Admin events", run: () => setInv({ type: "admin", value: r.admin_id! }) });
    if (r.request_id) related.push({ label: "Request chain", run: () => setInv({ type: "request", value: r.request_id! }) });
    if (r.related_entity_type && r.related_entity_id)
      related.push({ label: `${r.related_entity_type} chain`, run: () => setInv({ type: r.related_entity_type!, value: r.related_entity_id! }) });
  }

  const entityLink = r?.related_entity_type && r?.related_entity_id
    ? entityRoute(r.related_entity_type, r.related_entity_id)
    : null;

  return (
    <BottomSheet open={Boolean(selected)} onClose={onClose} title="Log detail">
      {detail.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
          <Skeleton style={{ height: 24, borderRadius: 8 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
        </div>
      ) : !r ? (
        <Text variant="body" tone="muted">This log could not be found.</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
          <div className="flex items-center" style={{ gap: spacing[1], flexWrap: "wrap" }}>
            <Text variant="headingSm" color={colors.textPrimary}>{r.event}</Text>
            <Badge tone={sevTone(r.severity)}>{r.severity}</Badge>
            <Badge tone="neutral">{r.category}</Badge>
          </div>
          {r.description ? <Text variant="body" tone="secondary">{r.description}</Text> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: spacing[2] }}>
            <Field label="Timestamp" value={new Date(r.created_at).toLocaleString()} />
            <Field label="Log ID" value={r.log_id} mono />
            <Field label="Source" value={r.source} />
            <Field label="Module" value={r.module} />
            <Field label="Status" value={r.status} />
            <Field label="IP address" value={r.ip} mono />
            <Field label="Device" value={r.device} />
            <Field label="Request ID" value={r.request_id} mono />
            <Field label="Admin" value={r.admin_name ?? r.admin_id} mono={!r.admin_name} />
            <Field label="User" value={r.user_name ?? r.user_id} mono={!r.user_name} />
          </div>

          {entityLink ? (
            <Button variant="secondary" onClick={() => onNavigate(entityLink.to, entityLink.params)}>
              <ExternalLink style={{ width: 14, height: 14, marginRight: 6 }} />
              Open {r.related_entity_type}
            </Button>
          ) : null}

          {related.length > 0 ? (
            <div>
              <Text variant="overline" tone="muted">Investigate</Text>
              <div className="flex items-center" style={{ gap: spacing[1], marginTop: spacing[1], flexWrap: "wrap" }}>
                {related.map((rel) => (
                  <Chip key={rel.label} selected={inv?.value != null && rel.label.startsWith(inv.type)} onClick={rel.run}>
                    <Fingerprint style={{ width: 12, height: 12, marginRight: 4 }} /> {rel.label}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          {inv ? (
            <Card padding={spacing[2]}>
              <Text variant="overline" tone="muted">Event chain · {inv.type}</Text>
              {investigation.isLoading ? (
                <Skeleton style={{ height: 60, borderRadius: 8, marginTop: spacing[1] }} />
              ) : (investigation.data ?? []).length === 0 ? (
                <Text variant="caption" tone="muted" style={{ marginTop: spacing[1], display: "block" }}>No linked events.</Text>
              ) : (
                <div style={{ marginTop: spacing[1], display: "flex", flexDirection: "column", gap: spacing[1], maxHeight: 260, overflowY: "auto" }}>
                  {(investigation.data ?? []).map((e) => (
                    <div key={e.log_id} className="flex items-center justify-between" style={{ gap: spacing[2] }}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Badge tone={sevTone(e.severity)}>{e.severity}</Badge>{" "}
                        <Text variant="caption" color={colors.textPrimary}>{e.event}</Text>
                      </span>
                      <Text variant="caption" tone="muted" style={{ flexShrink: 0 }}>
                        {new Date(e.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <div>
            <Text variant="overline" tone="muted">Metadata (JSON)</Text>
            <pre style={jsonStyle}>{JSON.stringify(r.metadata ?? {}, null, 2)}</pre>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function entityRoute(type: string, id: string): { to: string; params: Record<string, string> } | null {
  switch (type) {
    case "report": return { to: "/admin/reports/$reportId", params: { reportId: id } };
    case "match": return { to: "/admin/matches/$matchId", params: { matchId: id } };
    case "chat": return { to: "/admin/chats/$chatId", params: { chatId: id } };
    default: return null;
  }
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <Text variant="caption" tone="muted" style={{ display: "block" }}>{label}</Text>
      <Text
        variant="bodySm"
        color={value ? colors.textPrimary : colors.textMuted}
        style={{ wordBreak: "break-all", fontFamily: mono ? "ui-monospace, monospace" : undefined }}
      >
        {value || "—"}
      </Text>
    </div>
  );
}

// ---------------------------------------------------------------- helpers
const dateInputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${surfaces.border}`,
  padding: "8px 10px",
  fontSize: 13,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
};

const selectStyle: React.CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${surfaces.border}`,
  padding: "8px 10px",
  fontSize: 13,
  color: colors.textPrimary,
  background: surfaces.glassSoft,
};

const searchBox: React.CSSProperties = {
  gap: spacing[2],
  padding: "10px 12px",
  borderRadius: 12,
  background: surfaces.glassSoft,
  border: `1px solid ${surfaces.border}`,
};

const linkBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  color: colors.primary,
};

const jsonStyle: React.CSSProperties = {
  marginTop: 6,
  padding: spacing[2],
  borderRadius: 10,
  background: "rgba(60,60,67,0.06)",
  border: `1px solid ${surfaces.border}`,
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  color: colors.textSecondary,
  overflowX: "auto",
  maxHeight: 300,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function ChartSlot({ q, children }: { q: { isLoading: boolean; isError: boolean; refetch: () => void }; children: React.ReactNode }) {
  if (q.isLoading) return <Skeleton style={{ height: 240, borderRadius: 16 }} />;
  if (q.isError) return <ErrorCard onRetry={() => q.refetch()} />;
  return <>{children}</>;
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyStateCard
      title="Couldn't load this widget"
      description="Something went wrong fetching this data."
      action={<Button variant="secondary" onClick={onRetry}>Retry</Button>}
    />
  );
}
